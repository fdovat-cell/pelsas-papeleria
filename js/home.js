const iconos = {
  keyroad:  `<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>`,
  staedtler:`<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>`,
  pilot:    `<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>`,
  edding:   `<path d="M4 20l4-1 10-10-3-3L5 16l-1 4z"/><path d="M14.5 6.5l3 3"/>`,
  kores:    `<path d="M9 3h6v4a3 3 0 0 1-3 3 3 3 0 0 1-3-3V3z"/><path d="M12 10v11"/><path d="M9 21h6"/>`,
  varios:   `<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 4v5"/>`,
  ibi:      `<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>`,
  omega:    `<circle cx="12" cy="12" r="9"/><path d="M8 15h8"/><path d="M8 9a4 4 0 0 1 8 0v3H8V9z"/>`,
  arte:     `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18 2 2 0 0 0 0-4 2 2 0 0 1 0-4h3a4 4 0 0 0 4-4 9 9 0 0 0-7-6z"/>`,
};

// Portada de marca (1ra página del catálogo de esa marca) para mostrar como
// fondo de la tile en el home. Las categorías que no tienen una portada de
// marca propia (ibi: catálogo todavía no cargado; varios: es una categoría
// mixta con varias marcas) siguen mostrando el ícono + color como antes.
const portadas = {
  pilot:     'img/tiles/pilot.webp',
  keyroad:   'img/tiles/keyroad.webp',
  staedtler: 'img/tiles/staedtler.webp',
  edding:    'img/tiles/edding.webp',
  kores:     'img/tiles/kores.webp',
  omega:     'img/tiles/omega.webp',
  arte:      'img/tiles/arte.webp',
};

async function cargarCategorias(){
  const res = await fetch('data/categories.json', { cache: 'no-store' });
  const categorias = await res.json();
  const catsEl = document.getElementById('cats');

  catsEl.innerHTML = categorias.map(c => {
    const wide = c.key === 'varios' ? 'wide' : '';
    const portada = portadas[c.key];

    if(portada){
      return `
      <button class="tile has-photo ${wide}" style="background-image:url('${portada}')" data-cat="${c.key}">
        <div class="photo-caption">
          <div class="name">${c.nombre}</div>
          <div class="count">${c.cantidadPaginas} páginas</div>
        </div>
      </button>
    `;
    }

    return `
    <button class="tile ${wide}" style="background:${c.color}" data-cat="${c.key}">
      <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconos[c.key] || ''}</svg></div>
      <div class="${wide ? 'txt' : ''}">
        <div class="name">${c.nombre}</div>
        <div class="count">${c.cantidadPaginas} páginas</div>
      </div>
    </button>
  `;
  }).join('');

  document.querySelectorAll('.tile').forEach(el=>{
    el.addEventListener('click', ()=>{
      window.location.href = `catalogo.html?cat=${el.dataset.cat}`;
    });
  });

  return categorias;
}

// Buscador predictivo: recorre los data/*.json de todas las categorías
// y busca coincidencia por código, nombre, marca o tipo de producto
// (Bolígrafos, Lapiceras, etc). Si lo que escribís matchea un tipo de
// producto entero (con o sin marca), aparece arriba de todo un acceso
// directo para ver esa categoría completa en la pantalla superpuesta.
async function inicializarBuscador(categorias){
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let indice = null;
  let tiposProducto = [];

  async function construirIndice(){
    if(indice) return indice;

    try{
      const resTipos = await fetch('data/tipos-producto.json', { cache: 'no-store' });
      tiposProducto = await resTipos.json();
    }catch(e){
      tiposProducto = [];
    }
    const tipoPorKey = {};
    tiposProducto.forEach(t => tipoPorKey[t.key] = t.nombre);

    indice = [];
    for(const c of categorias){
      const res = await fetch(c.archivo, { cache: 'no-store' });
      const data = await res.json();
      data.paginas.forEach(p => {
        p.productos.forEach(prod => {
          if(!prod.precio) return; // sin precio no se vende, no tiene sentido mostrarlo
          indice.push({
            codigo: prod.codigo,
            nombre: prod.nombre || '',
            precio: prod.precio,
            modalidad: prod.modalidad || 'unidad',
            marcaNombre: c.nombre,
            marcaKey: c.key,
            tipoKey: prod.producto || '',
            tipoNombre: prod.producto ? (tipoPorKey[prod.producto] || '') : '',
            pagina: p.paginaOriginal
          });
        });
      });
    }
    return indice;
  }

  // Busca, entre los tipos de producto conocidos, si alguno matchea
  // exactamente alguna de las palabras escritas (ignorando plural simple y acentos).
  function normalizar(s){
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/, '');
  }

  function detectarTipoYMarca(tokens, categorias){
    let tipoDetectado = null;
    let marcaDetectada = null;
    tokens.forEach(tok => {
      const tokN = normalizar(tok);
      if(!tipoDetectado){
        const t = tiposProducto.find(t => normalizar(t.nombre) === tokN || normalizar(t.key) === tokN);
        if(t) tipoDetectado = t;
      }
      if(!marcaDetectada){
        const m = categorias.find(c => normalizar(c.nombre) === tokN || normalizar(c.key) === tokN);
        if(m) marcaDetectada = m;
      }
    });
    return { tipoDetectado, marcaDetectada };
  }

  input.addEventListener('focus', construirIndice);

  input.addEventListener('input', async ()=>{
    const qOriginal = input.value.trim();
    if(!qOriginal){ results.classList.remove('show'); return; }

    const data = await construirIndice();
    const tokens = qOriginal.toLowerCase().split(/\s+/).filter(Boolean);

    const { tipoDetectado, marcaDetectada } = detectarTipoYMarca(tokens, categorias);

    // Acceso directo arriba del todo si detectamos un tipo de producto completo
    let accesoDirectoHtml = '';
    if(tipoDetectado){
      const params = new URLSearchParams();
      params.set('abrirTipo', tipoDetectado.key);
      if(marcaDetectada) params.set('soloMarca', marcaDetectada.key);
      const catParaAbrir = marcaDetectada ? marcaDetectada.key : categorias[0].key;
      const titulo = marcaDetectada
        ? `Ver todos los ${tipoDetectado.nombre} de ${marcaDetectada.nombre}`
        : `Ver todos los ${tipoDetectado.nombre} (todas las marcas)`;
      accesoDirectoHtml = `<a class="search-acceso-directo" href="catalogo.html?cat=${catParaAbrir}&${params.toString()}">🔎 ${titulo}</a>`;
    }

    // Resultados individuales: cada palabra escrita tiene que matchear
    // en ALGÚN campo (código, nombre, marca o tipo), sin importar cuál.
    const found = data.filter(p => tokens.every(tok =>
      p.codigo.toLowerCase().includes(tok) ||
      p.nombre.toLowerCase().includes(tok) ||
      p.marcaNombre.toLowerCase().includes(tok) ||
      p.tipoNombre.toLowerCase().includes(tok)
    ));

    const LIMITE = 25;
    const listaHtml = found.length
      ? found.slice(0, LIMITE).map(p => `<a href="catalogo.html?cat=${p.marcaKey}&pagina=${p.pagina}">
          <span class="sr-info">${p.nombre ? p.nombre + ' — ' : ''}${p.marcaNombre} <span class="sr-code">${p.codigo}</span></span>
          <span class="sr-precio">$${p.precio}${p.modalidad !== 'unidad' ? ' /' + p.modalidad : ''}</span>
        </a>`).join('')
      : (accesoDirectoHtml ? '' : `<div class="search-empty">Sin resultados</div>`);
    const notaMas = found.length > LIMITE ? `<div class="search-mas">Mostrando los primeros ${LIMITE} de ${found.length}</div>` : '';

    results.innerHTML = accesoDirectoHtml + listaHtml + notaMas;
    results.classList.add('show');
  });

  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.search-wrap')) results.classList.remove('show');
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const categorias = await cargarCategorias();
  inicializarBuscador(categorias);

  // Si venimos del botón "Buscar" de otra página (catalogo/carrito), enfocar directo.
  if(new URLSearchParams(window.location.search).get('buscar') === '1'){
    const input = document.getElementById('searchInput');
    input.scrollIntoView({behavior:'smooth', block:'center'});
    input.focus();
  }
});
