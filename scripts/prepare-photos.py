"""Create local responsive WebP assets from the credited photographic originals."""
from pathlib import Path
from PIL import Image, ImageOps
root = Path(__file__).resolve().parents[1] / 'dist/assets/photos'
for source in sorted(root.glob('*.jpg')):
    image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    for width in (480, 960, 1400):
        size = (width, round(image.height * width / image.width))
        image.resize(size, Image.Resampling.LANCZOS).save(root / f'{source.stem}-{width}.webp', 'WEBP', quality=80, method=6)
print('Prepared responsive photos from credited originals.')
