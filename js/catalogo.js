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
  const mapaPrecios = await cargarMapaPrecios();
  aplicarPreciosActuales(data, mapaPrecios);

  const contenedor = document.getElementById('paginas');
  const _productosHotspot = []; // mismo orden que los .hotspot en el DOM, para abrir el detalle por índice

  contenedor.innerHTML = data.paginas.map(p => `
    <div class="pagina-wrap" data-pagina="${p.paginaOriginal}">
      <img src="${p.imagen}" alt="${meta.nombre} — página ${p.paginaOriginal}" loading="lazy">
      ${(p.tapados || []).map(t => `
        <div class="tapado" style="left:${t.x}%; top:${t.y}%; width:${t.w}%; height:${t.h}%; background:${t.color || '#111'};"></div>
      `).join('')}
      ${p.productos.filter(prod => prod.precio).map(prod => {
        _productosHotspot.push({
          codigo: prod.codigo,
          nombre: prod.nombre || `Producto ${prod.codigo}`,
          precio: prod.precio,
          modalidad: prod.modalidad || 'unidad',
          precioRef: prod.precioRef,
          marca: meta.nombre,
          imagenPagina: p.imagen,
          x: prod.x, y: prod.y, w: prod.w, h: prod.h
        });
        return `
      <div class="hotspot"
           style="left:${prod.x}%; top:${prod.y}%; width:${prod.w}%; height:${prod.h}%;"
           data-codigo="${prod.codigo}"
           data-nombre="${prod.nombre || ''}"
           data-precio="${prod.precio}"
           data-modalidad="${prod.modalidad || 'unidad'}">
      </div>`;
      }).join('')}
    </div>
  `).join('');

  // clic en un hotspot con precio cargado = agregar al carrito
  // aviso de "tocá para agregar": solo hasta que el usuario haga su primer click
  const yaSabe = localStorage.getItem('pp_sabe_tocar');
  const banner = document.getElementById('hintBanner');
  if(!yaSabe) banner.style.display = 'flex';

  contenedor.querySelectorAll('.hotspot').forEach((el, i) => {
    el.addEventListener('click', () => {
      if(!localStorage.getItem('pp_sabe_tocar')){
        localStorage.setItem('pp_sabe_tocar', '1');
        banner.style.display = 'none';
      }
      abrirDetalleProducto(_productosHotspot[i]);
    });
  });

  // renderizar tarjetas de artículos individuales si existen
  renderItems(data, meta, contenedor, banner);

  // si venimos del buscador con una página puntual, hacemos scroll directo ahí
  if(paginaFoco){
    const objetivo = contenedor.querySelector(`[data-pagina="${paginaFoco}"]`);
    if(objetivo) objetivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // si venimos del buscador con un producto puntual, abrimos directo su
  // pop-up de detalle (además del scroll a la página, si corresponde)
  const codigoAbrir = getParam('abrirProducto');
  if(codigoAbrir){
    let prod = _productosHotspot.find(x => x.codigo === codigoAbrir);
    if(!prod){
      const item = (data.items || []).find(x => x.codigo === codigoAbrir);
      if(item){
        prod = {
          codigo: item.codigo,
          nombre: item.nombre,
          precio: item.precio,
          modalidad: item.modalidad || 'unidad',
          precioRef: item.precioRef,
          marca: meta.nombre,
          imagenDirecta: item.imagen
        };
      }
    }
    if(prod) abrirDetalleProducto(prod);
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
  initModalDetalle();
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
          </div>
        </div>
      `).join('')}
    </div>
  `;
  contenedor.appendChild(seccion);

  seccion.querySelectorAll('.item-card').forEach((el, i) => {
    el.addEventListener('click', () => {
      if (!localStorage.getItem('pp_sabe_tocar')) {
        localStorage.setItem('pp_sabe_tocar', '1');
        banner.style.display = 'none';
      }
      const prod = data.items[i];
      abrirDetalleProducto({
        codigo: prod.codigo,
        nombre: prod.nombre,
        precio: prod.precio,
        modalidad: prod.modalidad || 'unidad',
        precioRef: prod.precioRef,
        marca: meta.nombre,
        imagenDirecta: prod.imagen
      });
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
  let tipos = [];
  try{
    const res = await fetch('data/tipos-producto.json', { cache: 'no-store' });
    if(res.ok){
      tipos = await res.json();
      if(tipos.length) renderBarraTipos(tipos);
    }
  }catch(e){
    // silencioso: si falla, el catálogo sigue funcionando igual sin la barra
  }

  document.getElementById('overlayCerrar').addEventListener('click', cerrarOverlayTipo);
  document.getElementById('overlayTipos').addEventListener('click', (e)=>{
    if(e.target.id === 'overlayTipos') cerrarOverlayTipo(); // click en el fondo oscuro = cerrar
  });
  document.getElementById('overlaySelectOrden').addEventListener('change', () => renderGridOverlay());

  // Si venimos del buscador de home con un tipo de producto (y opcionalmente
  // una marca), abrimos el overlay correspondiente automáticamente.
  const abrirTipo = getParam('abrirTipo');
  if(abrirTipo){
    const tipo = tipos.find(t => t.key === abrirTipo);
    _overlayMarcaFiltro = getParam('soloMarca') || null;
    if(tipo) abrirOverlayTipo(tipo.key, tipo.nombre);
  }
}

function renderBarraTipos(tipos){
  const bar = document.getElementById('tiposBar');
  bar.innerHTML = tipos.map(t =>
    `<button class="tipo-chip" data-tipo="${t.key}" data-nombre="${t.nombre}">${t.nombre}</button>`
  ).join('');
  bar.querySelectorAll('.tipo-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _overlayMarcaFiltro = null;
      abrirOverlayTipo(btn.dataset.tipo, btn.dataset.nombre);
    });
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

  const mapaPrecios = await cargarMapaPrecios();
  const indice = [];
  for(const cat of _categoriasCatalogo){
    let data;
    try{
      const res = await fetch(cat.archivo, { cache: 'no-store' });
      data = await res.json();
      aplicarPreciosActuales(data, mapaPrecios);
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
          marcaKey: cat.key,
          pagina: pagina.paginaOriginal,
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
        marcaKey: cat.key,
        imagenDirecta: item.imagen // este formato ya tiene foto propia, no hotspot
      });
    });
  }

  _indiceProductosPorTipo = indice;
  return indice;
}

let _overlayTipoActual = null;
let _overlayNombreActual = null;
let _overlayMarcaFiltro = null; // si viene del buscador con marca, se aplica como filtro extra

async function abrirOverlayTipo(tipoKey, tipoNombre){
  _overlayTipoActual = tipoKey;
  _overlayNombreActual = tipoNombre;

  const overlay = document.getElementById('overlayTipos');
  actualizarTituloOverlay();
  document.getElementById('overlayGrid').innerHTML = `<div class="overlay-cargando">Cargando…</div>`;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // evita que se scrollee el catálogo de fondo

  await construirIndiceProductosPorTipo();
  renderGridOverlay();
}

function actualizarTituloOverlay(){
  const marcaNombre = _overlayMarcaFiltro
    ? (_categoriasCatalogo || []).find(c => c.key === _overlayMarcaFiltro)?.nombre
    : null;
  document.getElementById('overlayTitulo').textContent = marcaNombre
    ? `${_overlayNombreActual} — ${marcaNombre}`
    : _overlayNombreActual;
}

function cerrarOverlayTipo(){
  document.getElementById('overlayTipos').style.display = 'none';
  document.body.style.overflow = '';
}

function renderGridOverlay(){
  if(!_overlayTipoActual || !_indiceProductosPorTipo) return;

  actualizarTituloOverlay(); // por si el índice/categorías se cargaron después del título inicial

  const orden = document.getElementById('overlaySelectOrden').value;
  let items = _indiceProductosPorTipo.filter(p =>
    p.producto === _overlayTipoActual &&
    (!_overlayMarcaFiltro || p.marcaKey === _overlayMarcaFiltro)
  );

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

  aplicarRecortesFoto(grid);

  grid.querySelectorAll('.ov-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const p = items[i];
      const navegarAlCerrar = (p.marcaKey && p.pagina) ? { cat: p.marcaKey, pagina: p.pagina } : null;
      abrirDetalleProducto(p, navegarAlCerrar);
    });
  });
}

// Genera el recorte de la foto del producto (reutilizable en overlay y en el
// modal de detalle): si viene de un hotspot (imagenPagina + x,y,w,h), recorta
// por CSS sobre la imagen de página completa, sin generar archivos nuevos.
// Si es un item con foto propia (imagenDirecta), la muestra directo.
//
// El recorte se aplica en dos pasos: acá se genera un <div> placeholder con
// los datos del recorte (data-x/y/w/h son % de la página completa), y luego
// aplicarRecortesFoto() calcula el tamaño/posición reales una vez que se
// conoce el tamaño real (en píxeles) de la imagen de página. Esto evita
// deformar la foto: antes se usaba el mismo % para ancho y alto sin tener en
// cuenta que la página escaneada no es cuadrada ni tiene la misma proporción
// que el recuadro donde se muestra la miniatura, lo que estiraba la imagen
// (se veía "ancha") y, al agrandarla mal, también más borrosa.
function fotoHtmlGenerica(p){
  if(p.imagenDirecta){
    return `<img src="${p.imagenDirecta}" alt="${p.nombre}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">`;
  }
  if(p.imagenPagina && p.w != null && p.h != null && p.w > 0 && p.h > 0){
    return `<div class="foto-recorte" data-img="${p.imagenPagina}"
                 data-x="${p.x}" data-y="${p.y}" data-w="${p.w}" data-h="${p.h}"></div>`;
  }
  return `<div class="ov-foto-vacia">Sin foto</div>`;
}
const fotoOverlayHtml = fotoHtmlGenerica; // alias, mismo comportamiento

// Cache de la imagen de página ya cargada (el objeto Image, no solo su
// tamaño), para poder recortarla en un canvas sin volver a pedirla por red
// cada vez que se muestra otro producto de la misma página.
const _imgCache = {};
function _cargarImagen(src){
  if(!_imgCache[src]){
    _imgCache[src] = new Promise((resolve) => {
      const im = new Image();
      im.onload  = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }
  return _imgCache[src];
}

// Recorre los placeholders ".foto-recorte" recién insertados en `root`.
// Para cada uno, recorta en un <canvas> justo el rectángulo del producto
// (x,y,w,h en % de la página completa) y lo muestra con object-fit:contain.
// Al recortar primero y después encajar la imagen YA recortada, el producto
// siempre entra completo (nunca se corta un borde) y tampoco se cuela nada
// de los productos vecinos de la página, sin importar la proporción del
// recuadro donde se muestra.
function aplicarRecortesFoto(root = document){
  root.querySelectorAll('.foto-recorte:not([data-listo])').forEach(async (el) => {
    el.setAttribute('data-listo', '1');
    const src = el.dataset.img;
    const px = parseFloat(el.dataset.x), py = parseFloat(el.dataset.y);
    const pw = parseFloat(el.dataset.w), ph = parseFloat(el.dataset.h);

    const imagenPagina = await _cargarImagen(src);
    if(!imagenPagina){ el.outerHTML = '<div class="ov-foto-vacia">Sin foto</div>'; return; }

    const sx = px / 100 * imagenPagina.naturalWidth;
    const sy = py / 100 * imagenPagina.naturalHeight;
    const sw = pw / 100 * imagenPagina.naturalWidth;
    const sh = ph / 100 * imagenPagina.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(imagenPagina, sx, sy, sw, sh, 0, 0, sw, sh);

    const foto = document.createElement('img');
    foto.alt = '';
    foto.loading = 'lazy';
    foto.style.cssText = 'width:100%; height:100%; object-fit:contain;';
    foto.src = canvas.toDataURL('image/jpeg', 0.92);
    el.replaceWith(foto);
  });
}

// ────────────────────────────────────────────────────────────────
// Modal de detalle de producto: se abre al tocar cualquier producto
// (página normal, artículos individuales, u overlay de tipo), y desde
// ahí se confirma el agregado al carrito.
// ────────────────────────────────────────────────────────────────
let _detalleActual = null;
let _detalleNavegarAlCerrar = null;

function initModalDetalle(){
  document.getElementById('detalleCerrar').addEventListener('click', cerrarDetalle);
  document.getElementById('modalDetalle').addEventListener('click', (e)=>{
    if(e.target.id === 'modalDetalle') cerrarDetalle();
  });
  document.getElementById('detalleBtnAgregar').addEventListener('click', agregarDesdeDetalle);
}

function abrirDetalleProducto(p, navegarAlCerrar = null){
  _detalleActual = p;
  _detalleNavegarAlCerrar = navegarAlCerrar;

  // El modal se muestra ANTES de insertar la foto, así el contenedor ya
  // tiene su tamaño real (clientWidth/clientHeight) cuando aplicarRecortesFoto
  // lo necesita para calcular el recorte sin deformar.
  document.getElementById('modalDetalle').style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const fotoWrap = document.getElementById('detalleFotoWrap');
  fotoWrap.innerHTML = fotoHtmlGenerica(p);
  aplicarRecortesFoto(fotoWrap);

  document.getElementById('detalleMarca').textContent = p.marca || p.categoria || '';
  document.getElementById('detalleNombre').textContent = p.nombre;
  document.getElementById('detalleCodigo').textContent = p.codigo;

  const tieneRef = p.modalidad !== 'unidad' && p.precioRef;
  const refEl = document.getElementById('detallePrecioRef');
  refEl.style.display = tieneRef ? 'inline-block' : 'none';
  refEl.textContent = tieneRef ? `$${p.precioRef} c/u` : '';
  document.getElementById('detallePrecioPrincipal').textContent =
    `$${p.precio}${p.modalidad !== 'unidad' ? ' /' + p.modalidad : ''}`;
}

function cerrarDetalle(){
  document.getElementById('modalDetalle').style.display = 'none';
  // si además hay un overlay de tipo abierto detrás, mantenemos el scroll bloqueado
  const overlayAbierto = document.getElementById('overlayTipos').style.display === 'flex';
  document.body.style.overflow = overlayAbierto ? 'hidden' : '';

  // si el detalle se abrió desde el buscador por tipo (otra marca/página),
  // al cerrar navegamos a la página real del catálogo donde vive el producto
  if(_detalleNavegarAlCerrar){
    const { cat, pagina } = _detalleNavegarAlCerrar;
    _detalleNavegarAlCerrar = null;
    window.location.href = `catalogo.html?cat=${cat}&pagina=${pagina}`;
  }
}

function agregarDesdeDetalle(){
  if(!_detalleActual) return;
  const p = _detalleActual;
  cartAdd({
    codigo: p.codigo,
    nombre: p.nombre,
    precio: p.precio,
    modalidad: p.modalidad,
    categoria: p.marca || p.categoria
  });
  mostrarToast(p.nombre);
  cerrarDetalle();
}
