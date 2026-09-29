import os
from PIL import Image

src = r'C:\Users\DELL5530\Desktop\projects\aigenius-platform\client\aigenius_icon_final.png'
out = r'C:\Users\DELL5530\Desktop\projects\aigenius-platform\client\aigenius-main-logo-2160.png'

im = Image.open(src).convert('RGBA')
print('source', im.size, im.mode)
assert im.size[0] == im.size[1], 'source not square'

# Same scale on both axes -> no skew/aspect distortion
target = 2160
im2 = im.resize((target, target), Image.LANCZOS)
im2.save(out, 'PNG')
print('saved', out, im2.size, 'bytes', os.path.getsize(out))
