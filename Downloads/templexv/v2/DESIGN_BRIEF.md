# Brief de Diseño — Temple XV

**Fecha:** 2026-10-03  
**Proyecto:** `t1mpl2xv` — Landing estática con Astro  
**Enfoque:** Identidad visual, UI components, integración Figma ↔ Código  

---

## 1. Misión del Diseño

> **"El carácter se forja"** — Transmitir la autenticidad, resistencia y comunidad del rugby a través de una experiencia digital sobria, cálida y sin distracciones. Cada pixel debe decir: esto es para los que se quedan después del partido.

---

## 2. Público Objetivo

| Segmento | Perfil | Intención de compra |
|----------|--------|---------------------|
| **Jugadores activos** | 18–35 años, juegan en clubes de Argentina | Buscan identidad de equipo + comodidad post-partido |
| **Amantes del rugby** | Fans que quieren usar la marca fuera del campo | Compran por identidad, no por necesidad técnica |
| **Regalos** | Amigos/familia que buscan un obsequio con significado | Buscan algo auténtico, no merchandising genérico |

**Tono de voz:** Directo, sin adornos, con humor ácido del vestuario. Frases como *"La calma de todos los días"* o *"Quedarse cuando el resto ya se fue"* definen el lenguaje.

---

## 3. Sistema de Diseño Actual

### Paleta de colores

```
Light mode:
  --base:    #faf9f6  — Crema cálido (fondo principal)
  --surface: #f0ede8  — Superficie elevada
  --ink:     #141311  — Negro carbón (texto principal)
  --ink-dim: #6a6560  — Texto secundario
  --line:    #ddd9d0  — Líneas divisorias
  --accent:  #6e2e24  — Terracota oscuro (marca)
  --accent-hi:#8b1a1a — Terracota vibrante (hover/CTA)

Dark mode (auto, por prefers-color-scheme):
  --base:    #141311
  --surface: #1c1b19
  --ink:     #f5f3ef
  --accent:  #dd8873  — Terracota salmón (legible en oscuro)
```

**Análisis:** La paleta funciona bien. El terracota (#6e2e24) evoca tierra, cuero, rugbi — es coherente con la marca. El contraste WCAG AA se cumple en modo claro; en modo oscuro el accent cambia a #dd8873 para mantener legibilidad.

**Recomendación:** Considerar agregar un color de estado (success/error) para mensajes de validación o feedback en formularios futuros.

### Tipografía

| Uso | Fuente | Peso | Nota |
|-----|--------|------|------|
| Display (h1–h4) | Archivo Black | 400 | Tracking -0.03em, uppercase en nav |
| Body | Archivo | 400/500/600 | Line-height 1.5, -webkit-font-smoothing |

**Análisis:** Archivo Black es robusta pero sin serif — adecuada para un brand masculino y directo. El tracking ajustado en display da ese look "sports typography" sin caer en cliché.

**Recomendación:** Si en el futuro se agregan citas o testimonios, considerar una serif para contraste narrativo.

### Espaciado y layout

- **Wrap máximo:** 1200px centrado
- **Padding horizontal:** 2rem (aprox. 32px)
- **Mobile:** Layout se adapta con clamp() para gaps y tamaños
- **Secciones:** Each page tiene su propia ruta, el índice en home actúa como tabla de contenidos visual

### Z-index y capas

```
1   -- footer
10  -- .reveal (animaciones)
60  -- nav sticky
200 -- skip link
```

---

## 4. Arquitectura de Componentes

### Componentes existentes

| Componente | Ruta | Responsabilidad |
|------------|------|-----------------|
| `Base.astro` | `src/layouts/Base.astro` | Head completo, meta tags, import CSS/JS |
| `Nav.astro` | `src/components/Nav.astro` | Navegación sticky, mobile toggle, CTA "Pedir" |
| `Hero.astro` | `src/components/Hero.astro` | Imagen principal, wordmark animado, tagline, CTAs |
| `SectionIndex.astro` | `src/components/SectionIndex.astro` | Links a las 4 secciones principales |
| `Products.astro` | `src/components/Products.astro` | Grilla de 3 productos (polo, hoodie, campera) |
| `Lookbook.astro` | `src/components/Lookbook.astro` | Grilla de 3 fotos con caption |
| `Footer.astro` | `src/components/Footer.astro` | Branding, links a productos, contacto |
| `PageHead.astro` | `src/components/PageHead.astro` | Encabezado con yard number + título + lede |
| `Accesorios.astro` | `src/components/Accesorios.astro` | Grilla de 3 accesorios |

### Datos centralizados

Todo el contenido vive en `src/data/catalog.ts`:
- `products[]` — 3 prendas con slug, nombre, desc, precio, wa text
- `accessories[]` — 3 accesorios
- `looks[]` — 3 fotos de Unsplash con título y copy
- `routes[]` — Navegación (fuente de verdad para nav + footer + index)

**Análisis:** Excelente patrón. Un solo archivo de datos = fácil de mantener y actualizar. El `waNumber` vive en `Base.astro` como prop default — también un solo punto de cambio.

---

## 5. Experiencia de Usuario

### Flujo de conversión (WhatsApp)

```
Landing → Ver producto → Click "Pedir por WhatsApp" 
→ Script reescribe href con número real + texto prellenado 
→ Abre WhatsApp directo (sin selector de contactos)
```

**Puntos fuertes:**
- El `meta[name="temple:wa"]` es el único lugar donde vive el número
- Si el número no es válido, los links siguen funcionando (graceful degradation)
- Los textos `data-wa` son específicos por producto

**Mejora posible:** Agregar un mensaje de confirmación visual o tracking de clicks en los botones de WhatsApp para medir conversión real.

### Animaciones

| Animación | Implementación | Performance |
|-----------|---------------|-------------|
| Reveal on scroll | IntersectionObserver → `.is-in` class | ✅ Nativo, sin library |
| Wordmark letters | Array de spans, animados individualmente | ⚠️ Revisar en low-end devices |
| Nav glassmorphism | `backdrop-filter: saturate(150%) blur(14px)` | ✅ Soportado en todos los targets |
| Skip link | Position fixed, visible on focus | ✅ Accesibilidad básica |

**Nota:** El script principal (`main.ts`, 183 líneas) es Vanilla JS puro — sin framework, sin bundle innecesario. El `assetsInlineLimit: 0` en Astro config evita que se inlinee el CSS/JS pequeño, manteniendo la CSP simple (`'self'`).

### Accesibilidad

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| Skip link | ✅ | Visible en focus, z-index 200 |
| ARIA labels | ✅ | Nav, lists con role="list", aria-current |
| Alt texts | ⚠️ | Hero img tiene alt descriptivo; productos usan alt="" (deja que el contexto del link explique) |
| Focus visible | ✅ | Outline 2px solid var(--accent), offset 3px |
| Contraste | ✅ | Terracota sobre crema > 4.5:1; salmón sobre dark > 4.5:1 |
| Semántica HTML | ✅ | header, nav, main, section, footer, figure/figcaption |

---

## 6. Integración Figma ↔ Código

### Estado actual

Los plugins `figma` y `frontend-design` están instalados y habilitados. Para una integración completa se necesitaría:

1. **Crear archivos `.figma.ts` / `.figma.js`** en `src/` que mapeen tokens de Figma a variables CSS
2. **Configurar Code Connect** para que los componentes de Figma se sincronicen con el código
3. **Exportar variables/tokens** desde Figma (colores, tipografía, spacing) y llevarlos a `global.css`

### Siguiente paso sugerido

Si tienes un archivo Figma del diseño original, puedo:
- Ejecutar `figma:figma-design-to-code` para extraer el contexto de diseño
- Crear los mappings de componentes (`Hero`, `Products`, `Nav`, etc.)
- Sincronizar tokens de color y tipografía entre Figma y el CSS actual

---

## 7. Oportunidades de Mejora (Priorizadas)

### 🔴 Alta prioridad

| # | Mejora | Impacto | Complejidad |
|---|--------|---------|-------------|
| 1 | **Agregar tracking de clicks WhatsApp** (analytics básico) | Medir conversión real | Baja |
| 2 | **Optimizar imágenes hero** (webp/avif con fallback) | Mejor LCP, -30% peso | Media |
| 3 | **Crear página de producto individual** (ej. `/polo`) | SEO, mejor experiencia de compra | Media |

### 🟡 Media prioridad

| # | Mejora | Impacto | Complejidad |
|---|--------|---------|-------------|
| 4 | **Agregar sección "Sobre nosotros"** | Narrativa de marca, confianza | Baja |
| 5 | **Implementar newsletter/signup** | Capturar leads, retention | Media |
| 6 | **Añadir micro-interacciones en hover de productos** | Engagement visual | Baja |

### 🟢 Baja prioridad / Nice to have

| # | Mejora | Impacto | Complejidad |
|---|--------|---------|-------------|
| 7 | **Modo "lista de tallas"** en cada producto | Reducir dudas, menos devoluciones | Baja |
| 8 | **Galería de photos UGC** (clientes usando la ropa) | Social proof, autenticidad | Media |
| 9 | **Animación de loading skeleton** en transiciones | Percepción de velocidad | Baja |

---

## 8. Roadmap Sugerido (4 Sprints)

### Sprint 1 — Fundamentos (1 semana)
- [ ] Audit de accesibilidad completo (puppeteer/aXe)
- [ ] Optimización de imágenes (conversión a WebP/AVIF)
- [ ] Agregar `lang` attribute correcto en todos los meta tags
- [ ] Documentar tokens CSS en comentarios (`global.css`)

### Sprint 2 — Conversiones (1 semana)
- [ ] Implementar tracking de clicks WhatsApp (Google Analytics o Plausible)
- [ ] Crear página de producto individual (`/polo`, `/hoodie`, `/campera`)
- [ ] Agregar sección "Cómo pedir" en contacto (FAQ visual)
- [ ] A/B test: botón "Pedir" vs "Consultar por WhatsApp"

### Sprint 3 — Narrativa (1 semana)
- [ ] Crear página "Historia" (sobremesa del brand)
- [ ] Integrar sección de testimonios/reseñas
- [ ] Añadir galería de Instagram embed (feed automático o manual)
- [ ] Mejorar SEO: structured data (Product, Organization, BreadcrumbList)

### Sprint 4 — Escalabilidad (1 semana)
- [ ] Configuración Figma Code Connect completa
- [ ] Sistema de diseño documentado (Storybook o similar)
- [ ] Testing en dispositivos reales (dispositivos Apple, Android low-end)
- [ ] Plan de deploy automatizado (CI/CD con Cloudflare Pages)

---

## 9. Métricas de Éxito

| KPI | Objetivo actual | Meta Sprint 4 |
|-----|-----------------|---------------|
| **LCP (Largest Contentful Paint)** | < 2.5s | < 1.8s |
| **CLS (Cumulative Layout Shift)** | < 0.1 | < 0.05 |
| **Conversión WhatsApp** | Por definir | +15% |
| **Tiempo en página** | Por definir | +20% |
| **Puntuación Lighthouse** | ~90 | > 95 |

---

## 10. Notas Finales

### Lo que funciona bien
- **Arquitectura limpia:** Astro static-first, cero hydration, CSP-simple
- **Datos centralizados:** Un solo `catalog.ts` como fuente de verdad
- **Animaciones funcionales:** Reveal on scroll con IntersectionObserver, sin libraries
- **Mobile-first:** Nav colapsable, clamp() para responsive, touch targets adecuados
- **Accesibilidad base:** Skip link, focus visible, semántica correcta

### Riesgos identificados
1. **Dependencia de Unsplash** para las imágenes del lookbook — si el servicio cae o cambia URLs, las imágenes se rompen
2. **Wordmark animation** puede ser pesada en dispositivos de baja gama (muchos spans animados)
3. **Sin CMS** — para agregar nuevos productos hay que tocar código, no hay panel admin
4. **WhatsApp como único canal** — no hay carrito, no hay pasarela de pago; si el usuario no tiene WhatsApp, pierde la oportunidad

### Recomendación estratégica
Mantener la simplicidad actual es una ventaja competitiva. El modelo "ver → WhatsApp → cerrar venta" es perfecto para un brand pequeño/authéntico. No agregar e-commerce complejo a menos que el volumen de pedidos lo justifique. El foco debe estar en **mejorar la narrativa de marca** y **facilitar la decisión de compra**, no en agregar funcionalidad innecesaria.

---

*Documento generado por Design Lead (Claude Code) — 2026-10-03*
*Basado en análisis de: `src/`, `wrangler.toml`, `package.json`, `astro.config.mjs`, y preview en vivo*
