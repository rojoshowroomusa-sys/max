/**
 * Comportamiento de la landing. Sin dependencias, sin framework.
 *
 * Todo lo de abajo es DOM nativo a proposito: son cinco silos sueltos de
 * comportamiento en una pagina que no tiene estado. Meter un runtime de
 * framework para esto seria pagar hydration por no ganar nada. Lo que si
 * cambia con esta migracion es que ahora esta tipado y que el bundle sale
 * hasheado por el build en vez de pineado a mano en la CSP.
 *
 * Los comentarios de cada bloque son los originales: explican el por que de
 * una decision que parece over-engineered pero ya se pago cara.
 */

const $ = <T extends Element = Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = Element>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

/* ───────────────────────────────────────────
   Estado "hay JS"
   ───────────────────────────────────────────
   Esta es la unica linea que arma el estado. Va primero a proposito: el
   clip-path del reveal depende de .js, y .is-in — que lo saca — lo agrega
   este mismo modulo. Si algo falla mas abajo, .js queda sin poner y todas
   las imagenes se ven. Antes .js se ponia en el <head> y un error de parseo
   dejaba las 9 imagenes en altura cero para siempre. */
document.documentElement.classList.add('js');

/* ───────────────────────────────────────────
   WhatsApp: el numero vive en un solo lugar
   ───────────────────────────────────────────
   El href de cada enlace trae un prellenado generico que ya funciona sin JS
   (abre WhatsApp con el texto staged). El texto especifico del producto vive
   en data-wa. Si el meta temple:wa tiene un E.164 valido, se arma la URL con
   el numero: wa.me/<numero> abre el chat directo en vez del contact picker. */
(function wireWhatsApp(): void {
  const meta = $<HTMLMetaElement>('meta[name="temple:wa"]');
  const waNumber = meta?.content ?? '';

  if (/^\d{10,15}$/.test(waNumber)) {
    for (const a of $$<HTMLAnchorElement>('[data-wa]')) {
      a.href = `https://wa.me/${waNumber}?text=${a.dataset.wa ?? ''}`;
    }
  } else {
    console.warn(
      `[temple] meta[name="temple:wa"] sigue en "${waNumber}". Los enlaces de WhatsApp ` +
        'abren el selector de contactos en vez del chat. Cargá el número E.164 ' +
        '(54 + área + número, solo dígitos) para activar la conversión directa.',
    );
  }
})();

/* ───────────────────────────────────────────
   Tracking de clics en WhatsApp (conversion)
   ───────────────────────────────────────────
   Dispara un evento personalizado `wa:click` con info del producto/boton.
   En desarrollo hace console.log; en producción envía a un endpoint configurable.
   Sin dependencias, sin framework, ≤1KB gz. */
(function trackWhatsAppClicks(): void {
  type WaClickDetail = {
    slug: string;
    label: string;
    href: string;
    timestamp: number;
  };

  const isDev = import.meta.env.DEV ?? true;
  const endpoint = import.meta.env.PUBLIC_WA_TRACK_ENDPOINT ?? '';

  function sendEvent(detail: WaClickDetail): void {
    if (isDev) {
      console.log('[temple:wa:click]', detail);
      return;
    }
    if (!endpoint) return;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'wa_click', ...detail }),
      keepalive: true,
    }).catch(() => {});
  }

  document.addEventListener('click', (e) => {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-wa]');
    if (!anchor) return;

    // Extraer slug del data-wa o del texto del link
    const waText = anchor.dataset.wa ?? '';
    const slug = waText.replace(/.*Temple%20XV/, '').replace(/%20/g, '').toLowerCase() || 'unknown';
    const label = anchor.textContent?.trim() || 'Pedir por WhatsApp';

    const detail: WaClickDetail = {
      slug,
      label,
      href: anchor.href,
      timestamp: Date.now(),
    };

    // Disparar evento personalizado para que otros módulos puedan escuchar
    document.dispatchEvent(new CustomEvent('wa:click', { detail }));

    // Enviar a analytics si está configurado
    sendEvent(detail);
  });
})();

/* ───────────────────────────────────────────
   Reveal on scroll: los paneles de media barren.
   A prueba de fallas: si el observer no existe, falla, o un panel nunca
   intersecta, todo queda visible igual. Un catálogo sin fotos es peor que
   un catálogo sin animación.
   ─────────────────────────────────────────── */
(function revealOnScroll(): void {
  const panels = $$('.reveal');
  if (!panels.length) return;

  const revealAll = (): void => {
    for (const el of panels) el.classList.add('is-in');
  };

  let ro: IntersectionObserver | null = null;
  try {
    if ('IntersectionObserver' in window) {
      ro = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add('is-in');
            obs.unobserve(e.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      );
      for (const el of panels) ro.observe(el);

      /* Red de seguridad: un panel que el observer nunca reporta (pestaña en
         segundo plano, scroll restore raro, threshold no alcanzado) se revela
         igual a los 3s. No hay downside: .is-in solo levanta el clip. */
      window.setTimeout(() => {
        for (const el of panels) if (!el.classList.contains('is-in')) el.classList.add('is-in');
      }, 3000);
    } else {
      revealAll();
    }
  } catch {
    ro?.disconnect();
    revealAll();
  }
})();

/* ───────────────────────────────────────────
   Imagenes que fallan: se muestran, no desaparecen.
   ───────────────────────────────────────────
   Antes una imagen rota dejaba un rectangulo --surface mudo para siempre, con
   alt="" para que el lector de pantalla no anuncie nada. Ahora el panel se
   revela y, si el alt tiene texto util (las fotos del lookbook), se lee. */
(function brokenImages(): void {
  for (const img of $$<HTMLImageElement>('.media img')) {
    img.addEventListener(
      'error',
      () => {
        img.closest('.media')?.classList.add('is-broken');
        img.closest('.reveal')?.classList.add('is-in');
      },
      { once: true },
    );
  }
})();

/* ───────────────────────────────────────────
   Menu de navegacion (<=900px).
   ───────────────────────────────────────────
   Antes, .nav-links{display:none} en <=640px se llevaba los tres destinos
   sin reemplazo: 0 botones en el archivo, tres de cinco secciones
   inalcanzables en el dispositivo mas probable. Ahora hay un disclosure real:
   aria-expanded lleva el estado, Escape cierra y devuelve el foco, y un
   click fuera cierra sin desmontar nada. */
(function navDisclosure(): void {
  const nav = document.getElementById('nav');
  const toggle = $<HTMLButtonElement>('.nav-toggle');
  if (!nav || !toggle) return;

  const setOpen = (on: boolean): void => {
    nav.dataset.open = String(on);
    toggle.setAttribute('aria-expanded', String(on));
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape' || e.key === 'Esc') && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    const target = e.target;
    if (target instanceof Node && !nav.contains(target)) setOpen(false);
  });

  for (const a of $$<HTMLAnchorElement>('.nav-links a')) {
    a.addEventListener('click', () => setOpen(false));
  }

  /* Al pasar a desktop el panel se|display:none por CSS, pero data-open queda
     pegado y al volver a mobile apareceria abierto sin que nadie lo haya
     pedido. Se limpia en el cruce del breakpoint. */
  if (window.matchMedia) {
    const wide = window.matchMedia('(min-width: 901px)');
    wide.addEventListener('change', (ev) => {
      if (ev.matches) setOpen(false);
    });
  }
})();


/* �������������������������������������������
   Link activo: se resuelve en el servidor, no aca.
   �������������������������������������������
   Este bloque observaba main > section con un IntersectionObserver y ponia
   aria-current sobre el link de la seccion que estuviera cruzando una banda
   angosta de la pantalla. Cuando las secciones eran una sola pagina tenia
   sentido: habia que decidir en vivo cual de las cuatro estaba a la vista.

   Ahora cada seccion es su pagina, asi que no hay nada que observar: main > 
   section devuelve una sola seccion, y la banda de observacion
   (-45% / -50%) no la cruzaria nunca en una pagina corta, asi que el nav se
   quedaria sin marcar. Peor: un observer para responder una pregunta que
   Astro ya respondio en build.

   El link activo sale de Astro.url.pathname en Nav.astro. Menos codigo, sin
   coste de arranque, y marca la pagina correcta en la primera pintura en vez
   de despues del primer scroll. is-current tambien era de este bloque: la
   seccion en vista ya no existe como concepto, asi que la clase murio con el. */