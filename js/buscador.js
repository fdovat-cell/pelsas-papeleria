// ────────────────────────────────────────────────────────────────
// Buscador predictivo compartido (home y catálogo): arma un índice con
// todos los productos de todas las marcas (páginas del catálogo +
// artículos sueltos), resuelve el precio en vivo, y al elegir un
// resultado navega a la página del catálogo donde está ese producto
// y le pide que abra ahí mismo la ficha con la foto.
// Requiere que la página tenga #searchInput y #searchResults (mismo
// markup en index.html y catalogo.html), y que precios.js esté
// cargado antes que este archivo.
// ────────────────────────────────────────────────────────────────

let _bIndice = null;
let _bCategorias = null;
let _bTiposProducto = [];

async function construirIndiceBuscador(){
  if(_bIndice) return _bIndice;

  if(!_bCategorias){
    const res = await fetch('data/categories.json', { cache: 'no-store' });
    _bCategorias = await res.json();
  }
  try{
    const resTipos = await fetch('data/tipos-producto.json', { cache: 'no-store' });
    _bTiposProducto = await resTipos.json();
  }catch(e){
    _bTiposProducto = [];
  }
  const tipoPorKey = {};
  _bTiposProducto.forEach(t => tipoPorKey[t.key] = t.nombre);

  const mapaPrecios = await cargarMapaPrecios();
  const indice = [];

  for(const c of _bCategorias){
    let data;
    try{
      const res = await fetch(c.archivo, { cache: 'no-store' });
      data = await res.json();
    }catch(e){
      continue;
    }

    (data.paginas || []).forEach(p => {
      (p.productos || []).forEach(prod => {
        const precio = resolverPrecio(prod.codigo, prod.precio, mapaPrecios);
        if(!precio) return; // sin precio no se vende, no tiene sentido mostrarlo
        indice.push({
          codigo: prod.codigo,
          nombre: prod.nombre || '',
          precio: precio,
          modalidad: prod.modalidad || 'unidad',
          marcaNombre: c.nombre,
          marcaKey: c.key,
          tipoKey: prod.producto || '',
          tipoNombre: prod.producto ? (tipoPorKey[prod.producto] || '') : '',
          pagina: p.paginaOriginal
        });
      });
    });

    // artículos sueltos (con foto propia), antes no entraban al buscador
    (data.items || []).forEach(item => {
      const precio = resolverPrecio(item.codigo, item.precio, mapaPrecios);
      if(!precio) return;
      indice.push({
        codigo: item.codigo,
        nombre: item.nombre || '',
        precio: precio,
        modalidad: item.modalidad || 'unidad',
        marcaNombre: c.nombre,
        marcaKey: c.key,
        tipoKey: item.producto || '',
        tipoNombre: item.producto ? (tipoPorKey[item.producto] || '') : '',
        pagina: null
      });
    });
  }

  _bIndice = indice;
  return indice;
}

// Busca, entre los tipos de producto conocidos, si alguno matchea
// exactamente alguna de las palabras escritas (ignorando plural simple y acentos).
function normalizarBuscador(s){
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/, '');
}

function detectarTipoYMarcaBuscador(tokens){
  let tipoDetectado = null;
  let marcaDetectada = null;
  tokens.forEach(tok => {
    const tokN = normalizarBuscador(tok);
    if(!tipoDetectado){
      const t = _bTiposProducto.find(t => normalizarBuscador(t.nombre) === tokN || normalizarBuscador(t.key) === tokN);
      if(t) tipoDetectado = t;
    }
    if(!marcaDetectada){
      const m = _bCategorias.find(c => normalizarBuscador(c.nombre) === tokN || normalizarBuscador(c.key) === tokN);
      if(m) marcaDetectada = m;
    }
  });
  return { tipoDetectado, marcaDetectada };
}

function inicializarBuscador(){
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  if(!input || !results) return;

  input.addEventListener('focus', construirIndiceBuscador);

  input.addEventListener('input', async ()=>{
    const qOriginal = input.value.trim();
    if(!qOriginal){ results.classList.remove('show'); return; }

    const data = await construirIndiceBuscador();
    const tokens = qOriginal.toLowerCase().split(/\s+/).filter(Boolean);

    const { tipoDetectado, marcaDetectada } = detectarTipoYMarcaBuscador(tokens);

    // Acceso directo arriba del todo si detectamos un tipo de producto completo
    let accesoDirectoHtml = '';
    if(tipoDetectado){
      const params = new URLSearchParams();
      params.set('abrirTipo', tipoDetectado.key);
      if(marcaDetectada) params.set('soloMarca', marcaDetectada.key);
      const catParaAbrir = marcaDetectada ? marcaDetectada.key : _bCategorias[0].key;
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
      ? found.slice(0, LIMITE).map(p => {
          // al elegir un resultado: vamos a la marca/página donde está y le
          // pedimos que abra ahí mismo la ficha de ese producto con su foto
          const params = new URLSearchParams();
          params.set('cat', p.marcaKey);
          if(p.pagina) params.set('pagina', p.pagina);
          params.set('abrirProducto', p.codigo);
          return `<a href="catalogo.html?${params.toString()}">
              <span class="sr-info">${p.nombre ? p.nombre + ' — ' : ''}${p.marcaNombre} <span class="sr-code">${p.codigo}</span></span>
              <span class="sr-precio">$${p.precio}${p.modalidad !== 'unidad' ? ' /' + p.modalidad : ''}</span>
            </a>`;
        }).join('')
      : (accesoDirectoHtml ? '' : `<div class="search-empty">Sin resultados</div>`);
    const notaMas = found.length > LIMITE ? `<div class="search-mas">Mostrando los primeros ${LIMITE} de ${found.length}</div>` : '';

    results.innerHTML = accesoDirectoHtml + listaHtml + notaMas;
    results.classList.add('show');
  });

  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.search-wrap')) results.classList.remove('show');
  });

  // Si venimos del botón "Buscar" de otra página (catalogo/carrito), enfocar directo.
  if(new URLSearchParams(window.location.search).get('buscar') === '1'){
    input.scrollIntoView({behavior:'smooth', block:'center'});
    input.focus();
  }
}

document.addEventListener('DOMContentLoaded', inicializarBuscador);
