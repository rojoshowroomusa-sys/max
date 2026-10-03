import { defineConfig } from 'astro/config';

// Temple XV — landing estatica.
//
// Las dos opciones que NO son defaults estan aqui a proposito, y las dos son
// correcciones, no preferencias de estilo:
//
// 1. inlineStylesheets:'never' — Astro por defecto mete el CSS en un <style>
//    inline cuando el archivo pesa menos de 4kB. Con eso la CSP necesita
//    volver a pinear el CSS por hash SHA-256, que es exactamente el trabajo
//    manual que esta migracion viene a eliminar. 'never' fuerza un
//    /_astro/*.css externo, y la CSP vuelve a ser 'self' y nada mas.
//
// 2. compressHTML:false — Astro colapsa el whitespace entre elementos. En una
//    pagina donde varios <span> van en linea (el wordmark del hero, los items
//    del footer) quitar un espacio cambia el ancho real y se nota. El ahorro
//    serian unos 2kB de un archivo que se sirve con brotli.
export default defineConfig({
  site: 'https://t1mpl2xv.pages.dev',
  trailingSlash: 'ignore',
  compressHTML: false,
  image: {
    domains: ['images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Formato predeterminado: WebP. Astro genera AVIF automaticamente si el navegador lo soporta.
    // Los PNG de productos/accesorios (sin transparencia especial) se convierten a WebP/AVIF.
    format: ['webp', 'avif'],
  },
  build: {
    inlineStylesheets: 'never',
    // Los nombres con hash son lo que hace que los assets sean cacheables de
    // forma segura sin tener que versionar a mano.
    assets: '_astro',
    // 0 = nunca inlinear. Por defecto Astro mete en el HTML cualquier script
    // de menos de 4096 bytes (node_modules/astro/.../plugin-scripts.js usa
    // shouldInlineAsset con este limite). Nuestro main.ts minificado pesa
    // 2638, asi que entraba inline y la CSP con script-src 'self' lo
    // bloqueaba: la pagina perdiа el menu, el reveal, el scroll-spy y los
    // enlaces de WhatsApp. El costo de sacarlo afuera es un request, que es
    // justo lo que el nombre con hash te devuelve en cache.
    assetsInlineLimit: 0,
  },
  // Por si el limite se cambia o aparece otro camino que inlinee CSS.
  vite: {
    build: { assetsInlineLimit: 0 },
  },
  devToolbar: { enabled: false },
});
