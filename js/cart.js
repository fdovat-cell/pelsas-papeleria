// Carrito global único (junta productos de todas las categorías).
// Persiste en localStorage — esto es una app real servida por Cloudflare Pages,
// no un artifact de Claude, así que localStorage funciona normalmente.

const CART_KEY = 'pelsas_papeleria_cart';

function cartGet(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){
    return [];
  }
}

function cartSave(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  cartUpdateBadge();
}

function cartAdd(producto){
  // producto: { codigo, nombre, precio, categoria, imagen, nota }
  const items = cartGet();
  const nota = (producto.nota || '').trim();
  const existente = items.find(i => i.codigo === producto.codigo && (i.nota || '').trim() === nota);
  if(existente){
    existente.cantidad += 1;
  }else{
    items.push({ ...producto, nota, cantidad: 1 });
  }
  cartSave(items);
}

function cartSetNota(index, nota){
  const items = cartGet();
  if(items[index]) items[index].nota = nota;
  cartSave(items);
}

function cartRemove(index){
  const items = cartGet();
  items.splice(index, 1);
  cartSave(items);
}

// Cambia la cantidad de una línea del carrito directamente (sin volver al catálogo).
// Si la nueva cantidad es 0 o menos, saca el producto del carrito.
function cartSetCantidad(index, cantidad){
  const items = cartGet();
  if(!items[index]) return;
  if(cantidad <= 0){
    items.splice(index, 1);
  }else{
    items[index].cantidad = cantidad;
  }
  cartSave(items);
}

function cartCount(){
  return cartGet().reduce((sum, i) => sum + i.cantidad, 0);
}

function cartTotal(){
  return cartGet().reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
}

function cartUpdateBadge(){
  document.querySelectorAll('.nav-badge').forEach(el => {
    el.textContent = cartCount();
  });
}

// Arma el texto del pedido (compartido entre WhatsApp y la descarga a archivo).
function cartBuildTexto(){
  const items = cartGet();
  if(items.length === 0) return null;
  let texto = 'Hola! Quiero hacer este pedido de Pelsas Papelería:\n\n';
  items.forEach(i => {
    const notaTxt = i.nota ? ` (${i.nota})` : '';
    const modTxt = i.modalidad && i.modalidad !== 'unidad' ? ` — por ${i.modalidad}` : '';
    texto += `• ${i.nombre}${notaTxt} (${i.codigo}) x${i.cantidad}${modTxt} — $${i.precio * i.cantidad}\n`;
  });
  texto += `\nTotal: $${cartTotal()}`;
  return texto;
}

// Arma el link de WhatsApp con el pedido, mismo patrón que el resto de tus apps.
function cartBuildWhatsAppLink(numeroTelefono){
  const texto = cartBuildTexto();
  if(!texto) return null;
  return `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(texto)}`;
}

// Descarga el pedido como .txt al dispositivo (celular o PC), sin depender de WhatsApp.
function cartDownloadTxt(){
  const texto = cartBuildTexto();
  if(!texto) return;
  const blob = new Blob([texto], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0,10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pedido_PelsasPapeleria_${fecha}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('DOMContentLoaded', cartUpdateBadge);
