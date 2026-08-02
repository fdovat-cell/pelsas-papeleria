function getParam(nombre){
  return new URLSearchParams(window.location.search).get(nombre);
}

async function cargarCatalogo(){
  const catKey = getParam('cat');
  const paginaFoco = getParam('pagina');

  const resCategorias = await fetch('data/categories.json');
  const categorias = await resCategorias.json();
  const meta = categorias.find(c => c.key === catKey);

  if(!meta){
    document.getElementById('titulo').textContent = 'Categoría no encontrada';
    return;
  }

  document.getElementById('titulo').textContent = meta.nombre;
  document.body.style.setProperty('--cat-color', meta.color);

  const res = await fetch(meta.archivo);
  const data = await res.json();

  const contenedor = document.getElementById('paginas');

  contenedor.innerHTML = data.paginas.map(p => `
    <div class="pagina-wrap" data-pagina="${p.paginaOriginal}">
      <img src="${p.imagen}" alt="${meta.nombre} — página ${p.paginaOriginal}" loading="lazy">
      ${p.productos.map(prod => `
        <div class="hotspot"
             style="left:${prod.x}%; top:${prod.y}%; width:${prod.w}%; height:${prod.h}%;"
             data-codigo="${prod.codigo}"
             data-precio="${prod.precio ?? ''}">
          ${prod.precio != null ? `<span class="precio-chip">$${prod.precio}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  // clic en un hotspot con precio cargado = agregar al carrito
  contenedor.querySelectorAll('.hotspot').forEach(el => {
    const precio = el.dataset.precio;
    if(precio === '') return; // sin precio cargado todavía, no se puede comprar
    el.addEventListener('click', () => {
      cartAdd({
        codigo: el.dataset.codigo,
        nombre: `Producto ${el.dataset.codigo}`, // se reemplaza por el nombre real al calibrar
        precio: parseFloat(precio),
        categoria: meta.nombre
      });
      el.classList.add('agregado');
      setTimeout(() => el.classList.remove('agregado'), 250);
    });
  });

  // si venimos del buscador con una página puntual, hacemos scroll directo ahí
  if(paginaFoco){
    const objetivo = contenedor.querySelector(`[data-pagina="${paginaFoco}"]`);
    if(objetivo) objetivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

document.addEventListener('DOMContentLoaded', cargarCatalogo);
