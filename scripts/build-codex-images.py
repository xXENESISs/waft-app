"""Resize/encode existing WAFT art; originals are never changed or cropped."""
import json
from pathlib import Path
from PIL import Image
from io import BytesIO
root=Path(__file__).resolve().parent.parent
text=(root/'js/codex-data.js').read_text()
fighters=json.loads(text.split('export const codexFighters =',1)[1].strip().removesuffix(';'))
out=root/'images/codex'
out.mkdir(exist_ok=True)
for fighter in fighters:
    with Image.open(root/fighter['image']) as original:
        for width in (480,960):
            im=original.convert('RGB')
            im.thumbnail((width,width*2),Image.Resampling.LANCZOS)
            buffer=BytesIO()
            im.save(buffer,format="WEBP",quality=80,method=4)
            assert len(buffer.getvalue())>100, fighter["slug"]
            (out/f"{fighter['slug']}-{width}.webp").write_bytes(buffer.getvalue())
for name in ('mammals','birds','reptiles','amphibians','fish','arthropods'):
    with Image.open(root/f'images/backgrounds/{name}-bg.png') as original:
        im=original.convert('RGB');im.thumbnail((1200,900),Image.Resampling.LANCZOS)
        buffer=BytesIO();im.save(buffer,format='WEBP',quality=80,method=4)
        assert len(buffer.getvalue())>100, name
        (out/f'{name}-bg.webp').write_bytes(buffer.getvalue())
print(f'{len(fighters)*2+6} derivatives encoded; all original art preserved.')
