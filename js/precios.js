// ────────────────────────────────────────────────────────────────
// Lista de precios compartida con la app del celular (pedido-papeleria).
// En vez de depender del precio cargado a mano en cada hotspot, lo
// buscamos acá en vivo por código de artículo. Si un código no está
// en la lista (todavía), usamos el precio que ya tenía cargado el
// hotspot como respaldo, para no romper nada.
// ────────────────────────────────────────────────────────────────

let _mapaPrecios = null;

// Casos puntuales donde el código del hotspot no calza tal cual con el
// código de la lista de precios (viene con sufijo de tamaño de paquete,
// de medida, un typo, o dos códigos pegados). Se revisan a mano cuando
// aparecen — put acá el código real de la lista a usar en cada caso.
const OVERRIDES_CODIGO = {
  'VB5NGVB7NG': 'VB5NG',   // dos colores combinados en un solo hotspot: usamos el precio de VB5NG (mismo precio que VB7NG)
  'BP1': 'BP1/12',         // viene solo por caja de 12/120/864: tomamos la caja chica
  'BP1RT': 'BP1RT/12',
  'BPSGP': 'BPSGP05',      // el hotspot es el de 05mm
  'BPT-P': 'BPT-P/12',
  'SANP5': 'SNP5',         // typo en el código del hotspot (SANP5 → SNP5)
};

async function cargarMapaPrecios(){
  if(_mapaPrecios) return _mapaPrecios;
  try{
    const res = await fetch('data/precios.json', { cache: 'no-store' });
    const lista = await res.json();
    _mapaPrecios = new Map(lista.map(p => [String(p.c).trim().toUpperCase(), p.p]));
  }catch(e){
    _mapaPrecios = new Map();
  }
  return _mapaPrecios;
}

function resolverPrecio(codigoRaw, precioActual, mapa){
  if(!codigoRaw) return precioActual;
  const codigo = String(codigoRaw).trim().toUpperCase();
  if(OVERRIDES_CODIGO[codigo] && mapa.has(OVERRIDES_CODIGO[codigo])){
    return mapa.get(OVERRIDES_CODIGO[codigo]);
  }
  if(mapa.has(codigo)) return mapa.get(codigo);
  const tokens = codigo.split(/[\s/]+/).filter(Boolean);
  for(const t of tokens){
    if(mapa.has(t)) return mapa.get(t);
  }
  return precioActual;
}

// Aplica resolverPrecio a todos los productos/items de un objeto de marca
// (mutación en el lugar, se llama justo después de hacer fetch del JSON).
function aplicarPreciosActuales(data, mapa){
  (data.paginas || []).forEach(pagina => {
    (pagina.productos || []).forEach(prod => {
      prod.precio = resolverPrecio(prod.codigo, prod.precio, mapa);
    });
  });
  (data.items || []).forEach(item => {
    item.precio = resolverPrecio(item.codigo, item.precio, mapa);
  });
}
