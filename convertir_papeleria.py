#!/usr/bin/env python3
# Convierte las imagenes del catalogo de papeleria de WebP a JPG para el iPad viejo (Safari 9).
# Se corre dentro del repo clonado de pelsas-papeleria (la carpeta donde estan data/ e img/):
#   pip install pillow
#   python convertir_papeleria.py
# Lee data/categories.json y cada data/<marca>.json, y por cada imagen que aparece ahi
# genera el JPG en img-ipad/ con la misma ruta (img/pages/keyroad/x.webp -> img-ipad/pages/keyroad/x.jpg).
# Es incremental: lo que ya esta convertido se saltea. Con --forzar reconvierte todo.
# Lo que no se encuentra queda listado en fotos_faltantes_papeleria.txt.

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Falta Pillow. Corre primero: pip install pillow")
    sys.exit(1)

FORZAR = "--forzar" in sys.argv
PAGINA_ANCHO = 1400   # paginas del catalogo: ancho maximo en px
ITEM_LADO = 700       # fotos de articulos sueltos: lado mayor maximo en px
CALIDAD_PAGINA = 80
CALIDAD_ITEM = 78
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS


def leer_json(ruta):
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


def destino_de(origen):
    # img/pages/x/y.webp -> img-ipad/pages/x/y.jpg
    ruta = origen.replace("\\", "/")
    if ruta.startswith("img/"):
        ruta = "img-ipad/" + ruta[4:]
    else:
        ruta = "img-ipad/" + ruta
    base, _ = os.path.splitext(ruta)
    return base + ".jpg"


def a_rgb(im):
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        fondo = Image.new("RGB", im.size, (255, 255, 255))
        fondo.paste(im, mask=im.split()[-1])
        return fondo
    return im.convert("RGB")


def convertir(origen, tipo):
    destino = destino_de(origen)
    if os.path.exists(destino) and not FORZAR:
        return "saltada", destino
    if not os.path.exists(origen):
        return "falta", destino
    try:
        im = a_rgb(Image.open(origen))
        if tipo == "pagina":
            if im.width > PAGINA_ANCHO:
                alto = int(round(im.height * PAGINA_ANCHO / float(im.width)))
                im = im.resize((PAGINA_ANCHO, alto), LANCZOS)
            calidad = CALIDAD_PAGINA
        else:
            im.thumbnail((ITEM_LADO, ITEM_LADO), LANCZOS)
            calidad = CALIDAD_ITEM
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        im.save(destino, "JPEG", quality=calidad, optimize=True, progressive=False)
        return "ok", destino
    except Exception as e:  # imagen danada o formato raro
        print("  ERROR con %s: %s" % (origen, e))
        return "falta", destino


def main():
    if not os.path.exists("data/categories.json"):
        print("No encuentro data/categories.json. Corre este script dentro de la carpeta del repo pelsas-papeleria.")
        sys.exit(1)

    cats = leer_json("data/categories.json")
    trabajos = []  # (origen, tipo)
    vistos = set()
    for c in cats:
        archivo = c.get("archivo")
        if not archivo or not os.path.exists(archivo):
            print("Aviso: no encuentro %s (marca %s)" % (archivo, c.get("nombre")))
            continue
        d = leer_json(archivo)
        for pg in d.get("paginas", []):
            img = pg.get("imagen")
            if img and img not in vistos:
                vistos.add(img)
                trabajos.append((img, "pagina"))
        for it in d.get("items", []):
            img = it.get("imagen")
            if img and img not in vistos:
                vistos.add(img)
                trabajos.append((img, "item"))

    total = len(trabajos)
    print("Imagenes a revisar: %d" % total)
    cuenta = {"ok": 0, "saltada": 0, "falta": 0}
    faltan = []
    peso = 0
    for n, (origen, tipo) in enumerate(trabajos, 1):
        estado, destino = convertir(origen, tipo)
        cuenta[estado] += 1
        if estado == "falta":
            faltan.append(origen)
        if estado in ("ok", "saltada") and os.path.exists(destino):
            peso += os.path.getsize(destino)
        if n % 25 == 0 or n == total:
            print("  %d/%d" % (n, total))

    with open("fotos_faltantes_papeleria.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(faltan))
    print("")
    print("Convertidas: %d | ya estaban: %d | faltan: %d" % (cuenta["ok"], cuenta["saltada"], cuenta["falta"]))
    print("Peso total en img-ipad: %.1f MB" % (peso / 1048576.0))
    if faltan:
        print("Las que faltan quedaron en fotos_faltantes_papeleria.txt")


main()
