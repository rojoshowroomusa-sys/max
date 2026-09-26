# =====================================================================
#  deploy.ps1 — Despliega MAX Carnes Premium de un solo comando.
#
#  Orden seguro:
#    1) Migraciones de Supabase
#    2) Secrets + Edge Functions de Mercado Pago
#    3) Sitio público a Cloudflare Workers
#
#  PRIMERA VEZ:
#    Copy-Item .env.example .env
#    Completá .env y ejecutá:  .\deploy.ps1
#
#  Las claves públicas se inyectan temporalmente en public/js/config.js durante
#  el deploy y el archivo original se restaura al terminar, incluso si falla.
# =====================================================================
param(
  [switch]$SkipWrangler,
  [switch]$SkipFunctions,
  [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRef = $null
$corsOrigin = $null

Write-Host "`n=== MAX Carnes Premium - Deploy ===" -ForegroundColor Cyan

# --- 0) Carga .env sin imprimir ni persistir sus valores ---
$envFile = Join-Path $root ".env"
$envVars = @{}
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
      $envVars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"', "'")
    }
  }
} else {
  throw "No se encontró .env. Copiá .env.example y completá los valores reales."
}

function Read-Env([string]$name, [switch]$Required) {
  $value = $envVars[$name]
  if ($Required -and -not $value) {
    throw "Falta $name en .env. No se despliega con configuración incompleta."
  }
  return $value
}

function Assert-NoPlaceholder([string]$name, [string]$value) {
  $bad = @(
    "TU_ACCESS_TOKEN_MP",
    "TU_PROJECT_REF",
    "TU_DB_PASSWORD",
    "TU_SUPABASE_PUBLISHABLE_KEY",
    "TU_DOMINIO",
    "changeme",
    "CHANGE_ME"
  )
  if (-not $value -or ($bad | Where-Object { $value -match [regex]::Escape($_) })) {
    throw "$name todavía contiene un placeholder o está vacío."
  }
}

function Update-JsConstant([string]$text, [string]$name, [string]$value) {
  $pattern = '(?s)(\bconst\s+' + [regex]::Escape($name) + '\s*=\s*)"(?:\\.|[^"\\])*"'
  if ($text -notmatch $pattern) {
    throw "No se encontró la constante $name en public/js/config.js."
  }
  $quotedValue = ConvertTo-Json $value -Compress
  return [regex]::Replace(
    $text,
    $pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{
      param($match)
      $match.Groups[1].Value + $quotedValue
    },
    1
  )
}

Push-Location $root
$configPath = Join-Path $root "public\js\config.js"
$originalConfig = $null
$tempSecretFile = $null

try {
  # --- 0) Validación completa ANTES de cualquier operación que mute el remoto.
  #         Así un placeholder aborta sin haber migrado ni desplegado nada.
  $needsSupabase = (-not $SkipMigrations) -or (-not $SkipFunctions) -or (-not $SkipWrangler)
  if ($needsSupabase) {
    $projectRef = Read-Env "SUPABASE_PROJECT_REF" -Required
    Assert-NoPlaceholder "SUPABASE_PROJECT_REF" $projectRef
    if ($projectRef -notmatch '^[a-z0-9]{20}$') {
      throw "SUPABASE_PROJECT_REF no parece un project ref válido de Supabase."
    }
  }

  if (-not $SkipMigrations) {
    $dbPassword = Read-Env "SUPABASE_DB_PASSWORD" -Required
    Assert-NoPlaceholder "SUPABASE_DB_PASSWORD" $dbPassword
  }

  if (-not $SkipFunctions) {
    $accessToken = Read-Env "MP_ACCESS_TOKEN" -Required
    Assert-NoPlaceholder "MP_ACCESS_TOKEN" $accessToken

    $corsOrigin = Read-Env "CORS_ALLOWED_ORIGIN" -Required
    Assert-NoPlaceholder "CORS_ALLOWED_ORIGIN" $corsOrigin
    if ($corsOrigin -notmatch '^https://') {
      throw "CORS_ALLOWED_ORIGIN debe ser una URL https:// del sitio público."
    }

    $webhookSecret = Read-Env "MP_WEBHOOK_SECRET"
    if ($webhookSecret) { Assert-NoPlaceholder "MP_WEBHOOK_SECRET" $webhookSecret }
  }

  if (-not $SkipWrangler) {
    $publishableKey = Read-Env "SUPABASE_PUBLISHABLE_KEY" -Required
    Assert-NoPlaceholder "SUPABASE_PUBLISHABLE_KEY" $publishableKey
  }

  # --- 1) Migraciones (antes de desplegar código que las consume) ---
  if (-not $SkipMigrations) {
    Write-Host "`n[1/3] Aplicando migraciones en Supabase..." -ForegroundColor Yellow
    npx --yes supabase@2.117.0 db push --project-ref $projectRef --password $dbPassword --skip-vault
    if ($LASTEXITCODE -ne 0) { throw "Falló la aplicación de migraciones en Supabase." }
    Write-Host "[1/3] Migraciones OK" -ForegroundColor Green
  }

  # --- 2) Secrets + Edge Functions ---
  if (-not $SkipFunctions) {
    Write-Host "`n[2/3] Configurando secrets y Edge Functions..." -ForegroundColor Yellow

    # Se genera un archivo temporal solo con los secrets de las Functions.
    # El project ref y la contraseña de DB nunca se envían como secrets.
    $tempSecretFile = Join-Path ([IO.Path]::GetTempPath()) "max-carnes-functions-$PID.env"
    $secretLines = @(
      "MP_ACCESS_TOKEN=$accessToken",
      "CORS_ALLOWED_ORIGIN=$corsOrigin"
    )
    if ($webhookSecret) { $secretLines += "MP_WEBHOOK_SECRET=$webhookSecret" }
    [IO.File]::WriteAllLines(
      $tempSecretFile,
      $secretLines,
      [Text.UTF8Encoding]::new($false)
    )

    try {
      npx --yes supabase@2.117.0 secrets set --project-ref $projectRef --env-file $tempSecretFile
      if ($LASTEXITCODE -ne 0) { throw "Falló la carga de secrets en Supabase." }

      # 'secrets set' sólo agrega/actualiza: si el secret de webhook se quitó
      # de .env, el valor viejo seguiría remoto y el deploy mentaría.
      if (-not $webhookSecret) {
        npx --yes supabase@2.117.0 secrets unset MP_WEBHOOK_SECRET --project-ref $projectRef | Out-Null
      }
    } finally {
      if (Test-Path $tempSecretFile) { Remove-Item $tempSecretFile -Force }
      $tempSecretFile = $null
    }

    npx --yes supabase@2.117.0 functions deploy create-mp-preference --project-ref $projectRef --no-verify-jwt --use-api
    if ($LASTEXITCODE -ne 0) { throw "Falló el deploy de create-mp-preference." }

    npx --yes supabase@2.117.0 functions deploy mp-webhook --project-ref $projectRef --no-verify-jwt --use-api
    if ($LASTEXITCODE -ne 0) { throw "Falló el deploy de mp-webhook." }
    Write-Host "[2/3] Edge Functions OK" -ForegroundColor Green
  }

  # --- 3) Sitio estático con config pública temporal ---
  if (-not $SkipWrangler) {
    Write-Host "`n[3/3] Desplegando sitio a Cloudflare Workers..." -ForegroundColor Yellow
    $originalConfig = [IO.File]::ReadAllText($configPath)
    $deployConfig = $originalConfig
    $supabaseUrl = "https://$projectRef.supabase.co"
    $deployConfig = Update-JsConstant $deployConfig "SUPABASE_URL" $supabaseUrl
    $deployConfig = Update-JsConstant $deployConfig "SUPABASE_PUBLISHABLE_KEY" $publishableKey
    $deployConfig = Update-JsConstant $deployConfig "MP_EDGE_FUNCTION_URL" "$supabaseUrl/functions/v1/create-mp-preference"

    try {
      [IO.File]::WriteAllText($configPath, $deployConfig, [Text.UTF8Encoding]::new($false))
      npx --yes wrangler@4.140.0 deploy
      if ($LASTEXITCODE -ne 0) { throw "Falló el deploy del sitio en Cloudflare Workers." }
    } finally {
      if ($null -ne $originalConfig) {
        [IO.File]::WriteAllText($configPath, $originalConfig, [Text.UTF8Encoding]::new($false))
        $originalConfig = $null
      }
    }
    Write-Host "[3/3] Sitio OK" -ForegroundColor Green
  }

  $target = if ($corsOrigin) { $corsOrigin } else { "el dominio indicado por Cloudflare" }
  Write-Host "`nDeploy finalizado. Probá el checkout en $target" -ForegroundColor Cyan
} finally {
  if ($tempSecretFile -and (Test-Path $tempSecretFile)) {
    Remove-Item $tempSecretFile -Force
  }
  if ($null -ne $originalConfig -and (Test-Path $configPath)) {
    [IO.File]::WriteAllText($configPath, $originalConfig, [Text.UTF8Encoding]::new($false))
  }
  Pop-Location
}
