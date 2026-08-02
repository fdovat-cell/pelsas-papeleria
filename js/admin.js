const PRECIO_PLACEHOLDER = 1; // el valor con el que arrancan todos los productos sin precio real cargado

async function estaLogueado(){
  const res = await fetch('/api/check-session');
  const data = await res.json();
  return data.ok;
}

async function login(usuario, clave){
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, clave })
  });
  return res.json();
}

async function logout(){
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
}

async function guardarPrecio(categoria, codigo, precio){
  const res = await fetch('/api/save-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoria, codigo, precio })
  });
  return res.json();
}

async function cargarCategorias(){
  const res = await fetch('data/categories.json');
  return res.json();
}

async function cargarProductos(archivo){
  const res = await fetch(archivo);
  const data = await res.json();
  const productos = [];
  data.paginas.forEach(p => {
    p.productos.forEach(prod => {
      productos.push({ ...prod, pagina: p.paginaOriginal });
    });
  });
  return productos;
}

function renderLogin(){
  document.getElementById('app-admin').innerHTML = `
    <div class="login-box">
      <h1>Pelsas Papelería — Admin</h1>
      <input id="loginUsuario" type="text" placeholder="Usuario" autocomplete="username">
      <input id="loginClave" type="password" placeholder="Contraseña" autocomplete="current-password">
      <button id="btnLogin">Ingresar</button>
      <p id="loginError" class="error"></p>
    </div>
  `;
  document.getElementById('btnLogin').addEventListener('click', async ()=>{
    const usuario = document.getElementById('loginUsuario').value.trim();
    const clave = document.getElementById('loginClave').value;
    const res = await login(usuario, clave);
    if(res.ok){
      renderDashboard();
    }else{
      document.getElementById('loginError').textContent = res.error || 'Error al ingresar';
    }
  });
}

async function renderDashboard(){
  const categorias = await cargarCategorias();

  document.getElementById('app-admin').innerHTML = `
    <div class="topbar-admin">
      <h1>Admin — Precios</h1>
      <button id="btnLogout">Salir</button>
    </div>
    <div class="selector">
      <select id="selectCategoria">
        ${categorias.map(c => `<option value="${c.archivo}" data-key="${c.key}">${c.nombre}</option>`).join('')}
      </select>
      <label class="filtro">
        <input type="checkbox" id="soloPendientes"> Ver solo pendientes de precio real
      </label>
    </div>
    <div id="listaProductos"></div>
  `;

  catKeyActual = categorias[0].key;

  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('selectCategoria').addEventListener('change', refrescarLista);
  document.getElementById('soloPendientes').addEventListener('change', refrescarLista);

  await refrescarLista();
}

async function refrescarLista(){
  const select = document.getElementById('selectCategoria');
  const archivo = select.value;
  const catKey = select.selectedOptions[0].dataset.key;
  const soloPendientes = document.getElementById('soloPendientes').checked;

  const productos = await cargarProductos(archivo);
  const listaEl = document.getElementById('listaProductos');

  const filtrados = soloPendientes
    ? productos.filter(p => p.precio === PRECIO_PLACEHOLDER || p.precio === null)
    : productos;

  if(filtrados.length === 0){
    listaEl.innerHTML = `<p class="vacio">No hay productos ${soloPendientes ? 'pendientes' : 'calibrados todavía'} en esta categoría.</p>`;
    return;
  }

  listaEl.innerHTML = filtrados.map(p => `
    <div class="fila-producto" data-codigo="${p.codigo}">
      <div class="info">
        <span class="codigo">${p.codigo}</span>
        <span class="pagina">página ${p.pagina}</span>
      </div>
      <input type="number" class="input-precio" value="${p.precio ?? ''}" placeholder="sin precio">
      <button class="btn-guardar">Guardar</button>
      <span class="estado"></span>
    </div>
  `).join('');

  listaEl.querySelectorAll('.fila-producto').forEach(fila => {
    fila.querySelector('.btn-guardar').addEventListener('click', async ()=>{
      const codigo = fila.dataset.codigo;
      const valor = fila.querySelector('.input-precio').value;
      const precio = valor === '' ? null : parseFloat(valor);
      const estadoEl = fila.querySelector('.estado');
      estadoEl.textContent = 'Guardando…';
      const res = await guardarPrecio(catKeyActual, codigo, precio);
      estadoEl.textContent = res.ok ? '✓ guardado' : `✗ ${res.error}`;
    });
  });
}

let catKeyActual = null;
document.addEventListener('change', (e)=>{
  if(e.target.id === 'selectCategoria'){
    catKeyActual = e.target.selectedOptions[0].dataset.key;
  }
});

document.addEventListener('DOMContentLoaded', async ()=>{
  const logueado = await estaLogueado();
  if(logueado){
    renderDashboard();
  }else{
    renderLogin();
  }
});
