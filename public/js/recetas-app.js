/* Lógica de las páginas de recetas.
   - recetas.html: carga recetas/index.json y renderiza las cards.
   - receta.html: lee ?slug=xxx, carga recetas/{slug}.md, parsea frontmatter + markdown.
   Ambas comparten el parser de recetas.js. */

(function () {
  const grid = document.getElementById("recetasGrid");
  const content = document.getElementById("recetaContent");

  /* ---------- Nav toggle (mobile) ---------- */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    mainNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Abrir menú");
      });
    });
  }

  /* ---------- Página de listado ---------- */
  if (grid) {
    fetch("recetas/index.json")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el índice");
        return r.json();
      })
      .then((recetas) => {
        if (!recetas.length) {
          grid.innerHTML = '<p class="center" style="color: var(--muted);">Todavía no hay recetas. Volvé pronto.</p>';
          return;
        }
        grid.innerHTML = recetas
          .map(
            (r) => `
          <a class="card receta-card" href="receta.html?slug=${encodeURIComponent(r.slug)}">
            <div class="card-img">
              <img src="${r.imagen}" alt="${r.title}" loading="lazy" />
            </div>
            <span class="card-tag">Receta</span>
            <h3>${r.title}</h3>
            <p class="card-desc">${r.descripcion}</p>
            <div class="receta-meta">
              <span>⏱ ${r.tiempo}</span>
              <span>🍽 ${r.porciones} porciones</span>
              <span>📊 ${r.dificultad}</span>
            </div>
          </a>`
          )
          .join("");
      })
      .catch((err) => {
        console.error(err);
        grid.innerHTML = '<p class="center" style="color: var(--red-text);">Error al cargar las recetas. Intentá de nuevo.</p>';
      });
  }

  /* ---------- Página de detalle ---------- */
  if (content) {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
      content.innerHTML = '<p class="center" style="color: var(--muted);">No se especificó ninguna receta. <a href="recetas.html">Ver todas</a>.</p>';
      return;
    }

    // validar slug: solo letras, números y guiones (evita path traversal)
    if (!/^[\w-]+$/.test(slug)) {
      content.innerHTML = '<p class="center" style="color: var(--red-text);">Receta no válida.</p>';
      return;
    }

    fetch(`recetas/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error("Receta no encontrada");
        return r.text();
      })
      .then((md) => {
        // separar frontmatter del cuerpo
        let meta = {};
        let cuerpo = md;
        const fmMatch = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
        if (fmMatch) {
          const fm = fmMatch[1];
          cuerpo = md.slice(fmMatch[0].length);
          for (const linea of fm.split(/\r?\n/)) {
            const m = linea.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*$/);
            if (m) meta[m[1]] = m[2];
          }
        }

        const html = parseMarkdown(cuerpo);
        const titulo = meta.title || "Receta";
        const imagen = meta.imagen || "assets/flyer-share.png";

        // actualizar metas de la página
        document.title = `${titulo} — MAX Carnes Premium`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = meta.descripcion || `Receta: ${titulo}`;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = `${titulo} — MAX Carnes Premium`;
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = meta.descripcion || `Receta: ${titulo}`;
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) ogImg.content = imagen;

        const chips = [];
        if (meta.tiempo) chips.push(`<span>⏱ ${meta.tiempo}</span>`);
        if (meta.porciones) chips.push(`<span>🍽 ${meta.porciones} porciones</span>`);
        if (meta.dificultad) chips.push(`<span>📊 ${meta.dificultad}</span>`);
        if (meta.fecha) {
          const fecha = new Date(meta.fecha + "T00:00:00");
          const fechaFmt = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
          chips.push(`<span>📅 ${fechaFmt}</span>`);
        }

        content.innerHTML = `
          <a href="recetas.html" class="receta-volver">← Volver a recetas</a>
          <div class="receta-hero">
            <img src="${imagen}" alt="${titulo}" />
          </div>
          <div class="receta-header">
            <h1>${titulo}</h1>
            <div class="receta-chips">${chips.join("")}</div>
          </div>
          <div class="receta-body">${html}</div>
          <div class="receta-cta">
            <a href="index.html#cortes" class="btn btn-primary">Comprar cortes</a>
            <a href="recetas.html" class="btn btn-ghost">Más recetas</a>
          </div>
        `;
      })
      .catch((err) => {
        console.error(err);
        content.innerHTML = '<p class="center" style="color: var(--red-text);">No se encontró la receta. <a href="recetas.html">Ver todas</a>.</p>';
      });
  }
})();
