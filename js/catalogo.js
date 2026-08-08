function getParam(nombre){
  return new URLSearchParams(window.location.search).get(nombre);
}

// Toast de confirmación al agregar al carrito
let toastTimer = null;
function mostrarToast(nombre){
  let toast = document.getElementById('toastCarrito');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'toastCarrito';
    toast.className = 'toast-carrito';
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ ' + (nombre || 'Producto') + ' agregado';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

async function cargarCatalogo(){
  const catKey = getParam('cat');
  const paginaFoco = getParam('pagina');

  const resCategorias = await fetch('data/categories.json', { cache: 'no-store' });
  const categorias = await resCategorias.json();
  const meta = categorias.find(c => c.key === catKey);

  if(!meta){
    document.getElementById('titulo').textContent = 'Categoría no encontrada';
    return;
  }

  document.getElementById('titulo').textContent = meta.nombre;
  document.body.style.setProperty('--cat-color', meta.color);

  const res = await fetch(meta.archivo, { cache: 'no-store' });
  const data = await res.json();

  const contenedor = document.getElementById('paginas');

  contenedor.innerHTML = data.paginas.map(p => `
    <div class="pagina-wrap" data-pagina="${p.paginaOriginal}">
      <img src="${p.imagen}" alt="${meta.nombre} — página ${p.paginaOriginal}" loading="lazy">
      ${(p.tapados || []).map(t => `
        <div class="tapado" style="left:${t.x}%; top:${t.y}%; width:${t.w}%; height:${t.h}%;"></div>
      `).join('')}
      ${p.productos.filter(prod => prod.precio).map(prod => `
        <div class="hotspot"
             style="left:${prod.x}%; top:${prod.y}%; width:${prod.w}%; height:${prod.h}%;"
             data-codigo="${prod.codigo}"
             data-nombre="${prod.nombre || ''}"
             data-precio="${prod.precio}"
             data-modalidad="${prod.modalidad || 'unidad'}">
          <span class="precio-chip">
            ${prod.modalidad && prod.modalidad !== 'unidad' && prod.precioRef ? `<span class="precio-ref">$${prod.precioRef} c/u</span>` : ''}
            <span class="precio-principal">$${prod.precio}${prod.modalidad && prod.modalidad !== 'unidad' ? ' /' + prod.modalidad : ''}</span>
          </span>
        </div>
      `).join('')}
    </div>
  `).join('');

  // clic en un hotspot con precio cargado = agregar al carrito
  // aviso de "tocá para agregar": solo hasta que el usuario haga su primer click
  const yaSabe = localStorage.getItem('pp_sabe_tocar');
  const banner = document.getElementById('hintBanner');
  if(!yaSabe) banner.style.display = 'flex';

  contenedor.querySelectorAll('.hotspot').forEach(el => {
    el.addEventListener('click', () => {
      if(!localStorage.getItem('pp_sabe_tocar')){
        localStorage.setItem('pp_sabe_tocar', '1');
        banner.style.display = 'none';
      }
      const nombre = el.dataset.nombre || `Producto ${el.dataset.codigo}`;
      cartAdd({
        codigo: el.dataset.codigo,
        nombre: nombre,
        precio: parseFloat(el.dataset.precio),
        modalidad: el.dataset.modalidad,
        categoria: meta.nombre
      });
      el.classList.add('agregado');
      setTimeout(() => el.classList.remove('agregado'), 400);
      mostrarToast(nombre);
    });
  });

  // renderizar tarjetas de artículos individuales si existen
  renderItems(data, meta, contenedor, banner);

  // si venimos del buscador con una página puntual, hacemos scroll directo ahí
  if(paginaFoco){
    const objetivo = contenedor.querySelector(`[data-pagina="${paginaFoco}"]`);
    if(objetivo) objetivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // guardamos qué página quedó a la vista, para que "volver"/"seguir comprando"
  // desde el carrito te traigan de nuevo ahí en vez de al home
  const paginaWraps = contenedor.querySelectorAll('.pagina-wrap');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        localStorage.setItem('pp_ultima_pagina', JSON.stringify({
          cat: catKey,
          pagina: entry.target.dataset.pagina
        }));
      }
    });
  }, { threshold: 0.5 });
  paginaWraps.forEach(w => observer.observe(w));
}

// Botón "subir": aparece al bajar en el scroll y te lleva arriba
function initScrollTopBtn(){
  const btn = document.getElementById('scrollTopBtn');
  if(!btn) return;
  window.addEventListener('scroll', () => {
    if(window.scrollY > 400){
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();
  initScrollTopBtn();
  initTiposProducto();
});

// Renderiza los artículos individuales (items) como tarjetas tapeables
function renderItems(data, meta, contenedor, banner) {
  if (!data.items || !data.items.length) return;

  const hr = document.createElement('hr');
  hr.className = 'items-separador';
  contenedor.appendChild(hr);

  const seccion = document.createElement('div');
  seccion.className = 'items-seccion';
  seccion.innerHTML = `
    <div class="items-titulo">Artículos de Oficina</div>
    <div class="items-grid">
      ${data.items.map(prod => `
        <div class="item-card"
             data-codigo="${prod.codigo}"
             data-nombre="${prod.nombre.replace(/"/g, '&quot;')}"
             data-precio="${prod.precio}"
             data-modalidad="${prod.modalidad || 'unidad'}"
             ${prod.precioRef ? `data-precio-ref="${prod.precioRef}"` : ''}>
          <img src="${prod.imagen}" alt="${prod.nombre.replace(/"/g, '')}" loading="lazy">
          <div class="item-card-info">
            <div class="item-card-nombre">${prod.nombre}</div>
            <div class="item-card-codigo">${prod.codigo}</div>
            <div class="item-card-precio">
              ${prod.precioRef ? `<span class="item-precio-ref">$${prod.precioRef} c/u</span>` : ''}
              <span class="item-precio-principal">$${prod.precio}${prod.modalidad && prod.modalidad !== 'unidad' ? ' / ' + prod.modalidad : ''}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  contenedor.appendChild(seccion);

  seccion.querySelectorAll('.item-card').forEach(el => {
    el.addEventListener('click', () => {
      if (!localStorage.getItem('pp_sabe_tocar')) {
        localStorage.setItem('pp_sabe_tocar', '1');
        banner.style.display = 'none';
      }
      const nombre = el.dataset.nombre;
      cartAdd({
        codigo: el.dataset.codigo,
        nombre: nombre,
        precio: parseFloat(el.dataset.precio),
        modalidad: el.dataset.modalidad,
        categoria: meta.nombre
      });
      el.classList.add('agregado');
      setTimeout(() => el.classList.remove('agregado'), 600);
      mostrarToast(nombre);
    });
  });
}

// ────────────────────────────────────────────────────────────────
// Filtro por tipo de producto (Bolígrafos, Lapiceras, etc.)
// Muestra, en una pantalla superpuesta, los productos de ese tipo
// de TODAS las marcas juntos, con foto recortada del hotspot y
// orden por precio. No depende de en qué categoría/marca esté
// parado el usuario.
// ────────────────────────────────────────────────────────────────

let _indiceProductosPorTipo = null; // se arma una sola vez, la 1ra vez que se abre un overlay
let _categoriasCatalogo = null;     // cache de data/categories.json

async function initTiposProducto(){
  try{
    const res = await fetch('data/tipos-producto.json', { cache: 'no-store' });
    if(!res.ok) return; // si todavía no existe el archivo, no rompemos nada, simplemente no aparece la barra
    const tipos = await res.json();
    if(!tipos.length) return;
    renderBarraTipos(tipos);
  }catch(e){
    // silencioso: si falla, el catálogo sigue funcionando igual sin la barra
  }

  document.getElementById('overlayCerrar').addEventListener('click', cerrarOverlayTipo);
  document.getElementById('overlayTipos').addEventListener('click', (e)=>{
    if(e.target.id === 'overlayTipos') cerrarOverlayTipo(); // click en el fondo oscuro = cerrar
  });
  document.getElementById('overlaySelectOrden').addEventListener('change', () => renderGridOverlay());
}

function renderBarraTipos(tipos){
  const bar = document.getElementById('tiposBar');
  bar.innerHTML = tipos.map(t =>
    `<button class="tipo-chip" data-tipo="${t.key}" data-nombre="${t.nombre}">${t.nombre}</button>`
  ).join('');
  bar.querySelectorAll('.tipo-chip').forEach(btn => {
    btn.addEventListener('click', () => abrirOverlayTipo(btn.dataset.tipo, btn.dataset.nombre));
  });
}

// Arma, una sola vez, la lista de todos los productos de todas las marcas
// que tienen "producto" (tipo) asignado. Se guarda en memoria para no
// volver a pedir todos los data/*.json cada vez que se abre el overlay.
async function construirIndiceProductosPorTipo(){
  if(_indiceProductosPorTipo) return _indiceProductosPorTipo;

  if(!_categoriasCatalogo){
    const res = await fetch('data/categories.json', { cache: 'no-store' });
    _categoriasCatalogo = await res.json();
  }

  const indice = [];
  for(const cat of _categoriasCatalogo){
    let data;
    try{
      const res = await fetch(cat.archivo, { cache: 'no-store' });
      data = await res.json();
    }catch(e){
      continue; // si una marca falla al cargar, seguimos con las demás
    }

    (data.paginas || []).forEach(pagina => {
      (pagina.productos || []).forEach(prod => {
        if(!prod.producto || !prod.precio) return; // sin tipo asignado, o sin precio (no se vende) => no entra al filtro
        indice.push({
          codigo: prod.codigo,
          nombre: prod.nombre || prod.codigo,
          precio: prod.precio,
          modalidad: prod.modalidad || 'unidad',
          precioRef: prod.precioRef,
          producto: prod.producto,
          marca: cat.nombre,
          // datos para recortar la foto por CSS desde la imagen de página completa
          imagenPagina: pagina.imagen,
          x: prod.x, y: prod.y, w: prod.w, h: prod.h
        });
      });
    });

    (data.items || []).forEach(item => {
      if(!item.producto || !item.precio) return;
      indice.push({
        codigo: item.codigo,
        nombre: item.nombre || item.codigo,
        precio: item.precio,
        modalidad: item.modalidad || 'unidad',
        precioRef: item.precioRef,
        producto: item.producto,
        marca: cat.nombre,
        imagenDirecta: item.imagen // este formato ya tiene foto propia, no hotspot
      });
    });
  }

  _indiceProductosPorTipo = indice;
  return indice;
}

let _overlayTipoActual = null;
let _overlayNombreActual = null;

async function abrirOverlayTipo(tipoKey, tipoNombre){
  _overlayTipoActual = tipoKey;
  _overlayNombreActual = tipoNombre;

  const overlay = document.getElementById('overlayTipos');
  document.getElementById('overlayTitulo').textContent = tipoNombre;
  document.getElementById('overlayGrid').innerHTML = `<div class="overlay-cargando">Cargando…</div>`;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // evita que se scrollee el catálogo de fondo

  await construirIndiceProductosPorTipo();
  renderGridOverlay();
}

function cerrarOverlayTipo(){
  document.getElementById('overlayTipos').style.display = 'none';
  document.body.style.overflow = '';
}

function renderGridOverlay(){
  if(!_overlayTipoActual || !_indiceProductosPorTipo) return;

  const orden = document.getElementById('overlaySelectOrden').value;
  let items = _indiceProductosPorTipo.filter(p => p.producto === _overlayTipoActual);

  items = items.slice().sort((a, b) =>
    orden === 'precio-desc' ? b.precio - a.precio : a.precio - b.precio
  );

  const grid = document.getElementById('overlayGrid');

  if(items.length === 0){
    grid.innerHTML = `<div class="overlay-vacio">Todavía no hay productos cargados en ${_overlayNombreActual}.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="ov-card" data-codigo="${p.codigo}">
      <div class="ov-foto">
        ${fotoOverlayHtml(p)}
      </div>
      <div class="ov-info">
        <div class="ov-marca">${p.marca}</div>
        <div class="ov-nombre">${p.nombre}</div>
        <div class="ov-precio">
          ${p.modalidad !== 'unidad' && p.precioRef ? `<span class="ov-precio-ref">$${p.precioRef} c/u</span>` : ''}
          <span class="ov-precio-principal">$${p.precio}${p.modalidad !== 'unidad' ? ' /' + p.modalidad : ''}</span>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.ov-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const p = items[i];
      cartAdd({
        codigo: p.codigo,
        nombre: p.nombre,
        precio: p.precio,
        modalidad: p.modalidad,
        categoria: p.marca
      });
      card.classList.add('agregado');
      setTimeout(() => card.classList.remove('agregado'), 500);
      mostrarToast(p.nombre);
    });
  });
}

// Genera el recorte de la foto del producto:
// - si viene de un hotspot (imagenPagina + x,y,w,h): recorta por CSS,
//   mostrando solo la zona del hotspot sobre la imagen de página completa.
//   No hace falta generar ni guardar ninguna imagen nueva.
// - si es un item con foto propia (imagenDirecta): la muestra directo.
function fotoOverlayHtml(p){
  if(p.imagenDirecta){
    return `<img src="${p.imagenDirecta}" alt="${p.nombre}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">`;
  }
  if(p.imagenPagina && p.w != null && p.h != null && p.w > 0 && p.h > 0){
    // Escala uniforme (misma en x e y, para que no se estire) que hace zoom
    // hasta que el hotspot llene el recuadro, centrado en el hotspot.
    const escala = Math.max(100 / p.w, 100 / p.h) * 0.85; // 0.85 = deja margen, corta menos
    const cx = p.x + p.w / 2; // centro del hotspot, en % de la imagen completa
    const cy = p.y + p.h / 2;
    const tamPct  = (escala * 100).toFixed(2);
    const leftPct = (50 - cx * escala).toFixed(2);
    const topPct  = (50 - cy * escala).toFixed(2);
    return `<img src="${p.imagenPagina}" alt="${p.nombre}" loading="lazy"
                 style="width:${tamPct}%; height:${tamPct}%; left:${leftPct}%; top:${topPct}%;">`;
  }
  return `<div class="ov-foto-vacia">Sin foto</div>`;
}
