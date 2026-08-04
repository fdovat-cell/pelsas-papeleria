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

document.addEventListener('DOMContentLoaded', cargarCatalogo);
