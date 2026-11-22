import os
from PIL import Image

src = 'img/tiles'
dst = 'img-ipad/tiles'
os.makedirs(dst, exist_ok=True)

for f in sorted(os.listdir(src)):
    if not f.lower().endswith('.webp'):
        continue
    out = os.path.join(dst, os.path.splitext(f)[0] + '.jpg')
    im = Image.open(os.path.join(src, f)).convert('RGB')
    if im.width > 700:
        im = im.resize((700, round(im.height * 700 / im.width)), Image.LANCZOS)
    im.save(out, 'JPEG', quality=78)
    print('OK', out)