/* Parser de Markdown minimo para recetas.
   Soporta: headers (#..######), bold (**x**), italic (*x*), listas (-, 1.),
   links ([t](url)), imagenes (![alt](src)), separadores (---), blockquotes (>).
   No usa dependencias externas: el contenido es del cliente y se renderiza
   con innerHTML solo despues de escapar, asi que no hay riesgo de inyeccion. */

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMd(s) {
  let out = escapeHtml(s);
  // imagenes: ![alt](src) -> <img>
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
    const safeSrc = escapeHtml(src);
    const safeAlt = escapeHtml(alt);
    return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy" />`;
  });
  // links: [texto](url) -> <a>
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, texto, url) => {
    const safeUrl = escapeHtml(url);
    const safeTexto = escapeHtml(texto);
    const externo = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${safeUrl}"${externo}>${safeTexto}</a>`;
  });
  // bold: **x** -> <strong>
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic: *x* -> <em> (evita tocar los <strong> recien insertados)
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  // codigo inline: `x` -> <code>
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

function parseMarkdown(md) {
  const lineas = md.split(/\r?\n/);
  let html = "";
  let enLista = false;
  let tipoLista = null; // "ul" | "ol"
  let enParrafo = false;

  function cerrarLista() {
    if (enLista) {
      html += `</${tipoLista}>`;
      enLista = false;
      tipoLista = null;
    }
  }
  function cerrarParrafo() {
    if (enParrafo) {
      html += "</p>";
      enParrafo = false;
    }
  }

  for (let i = 0; i < lineas.length; i++) {
    let linea = lineas[i].trim();

    // linea vacia
    if (!linea) {
      cerrarLista();
      cerrarParrafo();
      continue;
    }

    // separador ---
    if (/^-{3,}$/.test(linea)) {
      cerrarLista();
      cerrarParrafo();
      html += "<hr />";
      continue;
    }

    // headers
    const h = linea.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      cerrarLista();
      cerrarParrafo();
      const nivel = h[1].length;
      html += `<h${nivel}>${inlineMd(h[2])}</h${nivel}>`;
      continue;
    }

    // blockquote
    if (linea.startsWith(">")) {
      cerrarLista();
      cerrarParrafo();
      const contenido = inlineMd(linea.replace(/^>\s?/, ""));
      html += `<blockquote>${contenido}</blockquote>`;
      continue;
    }

    // lista desordenada
    if (/^[-*]\s+/.test(linea)) {
      cerrarParrafo();
      if (!enLista || tipoLista !== "ul") {
        cerrarLista();
        html += "<ul>";
        enLista = true;
        tipoLista = "ul";
      }
      html += `<li>${inlineMd(linea.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }

    // lista ordenada
    if (/^\d+\.\s+/.test(linea)) {
      cerrarParrafo();
      if (!enLista || tipoLista !== "ol") {
        cerrarLista();
        html += "<ol>";
        enLista = true;
        tipoLista = "ol";
      }
      html += `<li>${inlineMd(linea.replace(/^\d+\.\s+/, ""))}</li>`;
      continue;
    }

    // parrafo comun
    cerrarLista();
    if (!enParrafo) {
      html += "<p>";
      enParrafo = true;
    } else {
      html += "<br />";
    }
    html += inlineMd(linea);
  }

  cerrarLista();
  cerrarParrafo();
  return html;
}
