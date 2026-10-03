/**
 * Fuente unica del catalogo.
 *
 * Antes los seis <li> vivian duplicados dentro de un unico index.html de
 * 59KB, tres por grilla. Esa duplicacion ya costo caro: el CTA de los
 * accesorios se quedo sin durante dos pasadas porque el bloque de productos lo
 * tenia y el de accesorios no. Con los datos aca, una tarjeta es un <li> y las
 * dos grillas lo renderizan con las mismas reglas.
 *
 * Nota sobre los srcset: se arman por funcion en vez de escribirse a mano.
 * El naming ya era regular (`temple-{slug}-{ancho}.png`) asi que la funcion
 * devuelve exactamente los mismos archivos que estaban hardcodeados.
 */

import type { ImageMetadata } from 'astro';

// Importar imágenes optimizadas
import polo560 from '../assets/images/temple-polo-560.png';
import polo840 from '../assets/images/temple-polo-840.png';
import polo1200 from '../assets/images/temple-polo-1200.png';
import hoodie560 from '../assets/images/temple-hoodie-560.png';
import hoodie840 from '../assets/images/temple-hoodie-840.png';
import hoodie1200 from '../assets/images/temple-hoodie-1200.png';
import campera560 from '../assets/images/temple-campera-560.png';
import campera840 from '../assets/images/temple-campera-840.png';
import campera1200 from '../assets/images/temple-campera-1200.png';
import cuadro from '../assets/images/temple-cuadro.png';
import cartas from '../assets/images/temple-cartas.png';
import taza from '../assets/images/temple-taza.png';
// Nuevas imágenes descargadas de Unsplash (libre uso)
import buzo560 from '../assets/images/temple-buzo-560.jpg';
import buzo840 from '../assets/images/temple-buzo-840.jpg';
import buzo1200 from '../assets/images/temple-buzo-1200.jpg';
import llavero from '../assets/images/temple-llavero-240.jpg';
import gorra from '../assets/images/temple-gorra-240.jpg';

// Mapear imágenes importadas por slug
const productImages: Record<string, { '560': ImageMetadata; '840': ImageMetadata; '1200': ImageMetadata }> = {
  polo: { '560': polo560, '840': polo840, '1200': polo1200 },
  hoodie: { '560': hoodie560, '840': hoodie840, '1200': hoodie1200 },
  campera: { '560': campera560, '840': campera840, '1200': campera1200 },
  buzo: { '560': buzo560, '840': buzo840, '1200': buzo1200 },
};

const accessoryImages: Record<string, ImageMetadata> = {
  cuadro,
  cartas,
  taza,
  llavero,
  gorra,
};

export interface Product {
  slug: string;
  name: string;
  desc: string;
  price: string;
  /** Texto ya URL-encoded, es lo que viaja en data-wa. */
  wa: string;
}

export interface Accessory extends Product {}

export interface Look {
  title: string;
  copy: string;
  alt: string;
  /** id de la foto en Unsplash. */
  id: string;
  width: number;
  height: number;
}

const WA_DEFAULT = 'Hola%20Temple%20XV';

/** href generico: funciona sin JS, abre WhatsApp con el texto staged. */
export const waHref = `https://wa.me/?text=${WA_DEFAULT}`;

export const products: Product[] = [
  {
    slug: 'polo',
    name: 'Polo',
    desc: 'La calma de todos los días. Se entra al club con esto puesto y se sale igual.',
    price: '$ 89.000',
    wa: 'Quiero%20el%20Polo%20de%20Temple%20XV',
  },
  {
    slug: 'hoodie',
    name: 'Hoodie',
    desc: 'Quedarse cuando el resto ya se fue. El after, el frío, el grupo.',
    price: '$ 124.000',
    wa: 'Quiero%20el%20Hoodie%20de%20Temple%20XV',
  },
  {
    slug: 'campera',
    name: 'Campera',
    desc: 'Salir de nuevo después del golpe. Para el viaje y el día difícil.',
    price: '$ 168.000',
    wa: 'Quiero%20la%20Campera%20de%20Temple%20XV',
  },
  {
    slug: 'buzo',
    name: 'Buzo',
    desc: 'El abrigador que te protege cuando el viento de la cancha te agarra de frente.',
    price: '$ 135.000',
    wa: 'Quiero%20el%20Buzo%20de%20Temple%20XV',
  },
];

export const accessories: Accessory[] = [
  {
    slug: 'cuadro',
    name: 'Cuadro',
    desc: 'La frase queda en la pared cuando la prenda no está puesta.',
    price: '$ 42.000',
    wa: 'Quiero%20el%20Cuadro%20de%20Temple%20XV',
  },
  {
    slug: 'cartas',
    name: 'Cartas',
    desc: 'El ritual: la calma, levantarse, el de al lado.',
    price: '$ 12.000',
    wa: 'Quiero%20las%20Cartas%20de%20Temple%20XV',
  },
  {
    slug: 'taza',
    name: 'Taza',
    desc: 'La del after, con la frase del cuadro.',
    price: '$ 18.000',
    wa: 'Quiero%20la%20Taza%20de%20Temple%20XV',
  },
  {
    slug: 'llavero',
    name: 'Llavero',
    desc: 'El símbolo que llevás en las llaves para recordar quién sos.',
    price: '$ 8.000',
    wa: 'Quiero%20el%20Llavero%20de%20Temple%20XV',
  },
  {
    slug: 'gorra',
    name: 'Gorra',
    desc: 'Para el after o para cualquier día. Protección y estilo.',
    price: '$ 28.000',
    wa: 'Quiero%20la%20Gorra%20de%20Temple%20XV',
  },
];

export const looks: Look[] = [
  {
    title: 'El golpe',
    copy: 'El tackle no es el final. Es el principio de levantarse.',
    alt: 'Jugadores de rugby en acción en el campo',
    id: 'photo-1574618500275-a5d3458db385',
    width: 840,
    height: 1120,
  },
  {
    title: 'El after',
    copy: 'Cuando el resto se fue, el grupo queda. Eso es Temple XV.',
    alt: 'Grupo de jugadores después del partido',
    id: 'photo-1782611538903-e711d32b1f88',
    width: 840,
    height: 1120,
  },
  {
    title: 'El entrenamiento',
    copy: 'La calma se entrena. La cabeza fría es un músculo.',
    alt: 'Entrenamiento de rugby en campo iluminado',
    id: 'photo-1594882645126-14020914d58d',
    width: 840,
    height: 1120,
  },
];

/**
 * Rutas de navegacion.
 *
 * Antes eran anclas (#coleccion) porque todo vivia en una sola pagina. Ahora cada
 * seccion es su propia ruta, y esta tabla es la fuente de verdad para el nav, el
 * footer y el indice de la home. Si se agrega o renombra una seccion, se edita
 * aca y en un solo lugar mas: la pagina.
 *
 * `yard` es el numero de camiseta que va arriba del titulo. Antes lo computaba un
 * contador CSS sobre main > .section, que con una seccion por pagina se reiniciaba
 * en todas y mostraba 01 en las cuatro. Va explicito por lo mismo.
 */
export interface Route {
  /** Path sin la barra inicial, como lo usa Astro para comparar. */
  path: string;
  label: string;
  title: string;
  lede: string;
  yard: '1' | '2' | '3' | '4';
}

export const routes: Route[] = [
  {
    path: 'coleccion',
    label: 'Colección',
    title: 'Lo que te ponés después',
    lede: 'Polo, hoodie y campera. Las tres prendas que entran al club y salen con vos.',
    yard: '1',
  },
  {
    path: 'accesorios',
    label: 'Accesorios',
    title: 'Lo que queda en la pared',
    lede: 'Cuadro, cartas y taza. Lo que sigue en la casa cuando la prenda ya no está.',
    yard: '2',
  },
  {
    path: 'lookbook',
    label: 'Lookbook',
    title: 'Lookbook — El partido',
    lede: 'El golpe, el after y el entrenamiento. Tres momentos de la misma noche.',
    yard: '3',
  },
  {
    path: 'contacto',
    label: 'Contacto',
    title: 'Pedidos por WhatsApp',
    lede: 'Contame qué querés y te respondo rápido, por el mismo chat. No hay formulario ni registro.',
    yard: '4',
  },
];

export const routeByPath = new Map(routes.map((r) => [r.path, r]));

/** Normaliza el pathname de Astro a la misma forma que `path` ('/coleccion' -> 'coleccion'). */
export function currentRoute(pathname: string): Route | undefined {
  const seg = pathname.replace(/^\/+|\/+$/g, '');
  return seg ? routeByPath.get(seg) : undefined;
}


/** Imagen optimizada para producto (devuelve ImageMetadata para Astro Image). */
export function productImg(slug: string, size: 560 | 840 | 1200 = 840): ImageMetadata {
  return productImages[slug]?.[size] ?? productImages[slug]!['840'];
}

/** srcset de los productos usando imágenes importadas. */
export function productSrcset(slug: string): string {
  const imgs = productImages[slug];
  if (!imgs) return '';
  return [560, 840, 1200]
    .map((w) => `${imgs[w].src} ${w}w`)
    .join(',\n                   ');
}

/** Imagen por defecto (840) para producto. */
export function productSrc(slug: string): ImageMetadata {
  return productImages[slug]!['840'];
}

/** Imagen optimizada para accesorio. */
export function accessorySrc(slug: string): ImageMetadata {
  return accessoryImages[slug];
}

/** Unsplash con el mismo query string que estaba hardcodeado. */
export function lookSrc(id: string, w: number): string {
  return `https://images.unsplash.com/${id}?q=72&auto=format&fit=crop&w=${w}`;
}

export function lookSrcset(id: string): string {
  return [560, 840, 1200]
    .map((w) => `${lookSrc(id, w)} ${w}w`)
    .join(',\n                   ');
}

/** El mismo sizes para las tres grillas de 3 columnas. */
export const gridSizes = '(max-width:700px) calc(100vw - 40px), (max-width:1100px) 45vw, 30vw';
