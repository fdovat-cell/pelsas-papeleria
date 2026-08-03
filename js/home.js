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
  const res = await fetch('data/categories.json');
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
// y busca coincidencia por código de producto. El nombre real de cada
// producto se suma cuando calibremos (por ahora busca solo por código).
async function inicializarBuscador(categorias){
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let indice = null;

  async function construirIndice(){
    if(indice) return indice;
    indice = [];
    for(const c of categorias){
      const res = await fetch(c.archivo);
      const data = await res.json();
      data.paginas.forEach(p => {
        p.productos.forEach(prod => {
          indice.push({ codigo: prod.codigo, nombre: prod.nombre || '', categoria: c.nombre, catKey: c.key, pagina: p.paginaOriginal });
        });
      });
    }
    return indice;
  }

  input.addEventListener('focus', construirIndice);

  input.addEventListener('input', async ()=>{
    const q = input.value.trim().toLowerCase();
    if(!q){ results.classList.remove('show'); return; }
    const data = await construirIndice();
    const found = data.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
    results.innerHTML = found.length
      ? found.map(p => `<a href="catalogo.html?cat=${p.catKey}&pagina=${p.pagina}">${p.nombre ? p.nombre + ' — ' : ''}${p.categoria} <span class="sr-code">${p.codigo}</span></a>`).join('')
      : `<div class="search-empty">Sin resultados (todavía no hay productos calibrados con ese código o nombre)</div>`;
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
