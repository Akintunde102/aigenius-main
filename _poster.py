from PIL import Image, ImageDraw, ImageFont, ImageFilter

src = r"C:\Users\DELL5530\Desktop\projects\aigenius-platform\client\aigenius_icon_final.png"
out = r"C:\Users\DELL5530\Desktop\projects\aigenius-platform\client\aigenius-poster-1440x2160.png"

W, H = 1440, 2160
canvas = Image.new("RGBA", (W, H), (11, 14, 26, 255))

logo = Image.open(src).convert("RGBA")

# sample brand accent color from logo (average of opaque pixels)
rs = gs = bs = n = 0
for r, g, b, a in logo.getdata():
    if a > 10:
        rs += r; gs += g; bs += b; n += 1
if n:
    accent = (rs // n, gs // n, bs // n)
else:
    accent = (108, 92, 231)
accent = tuple(min(255, int(c * 1.3)) for c in accent)

# soft radial glow behind the logo
cx, cy = W // 2, 880
maxr = 700
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for i in range(60, 0, -1):
    r = int(maxr * i / 60)
    alpha = int(120 * (1 - i / 60) ** 1.5)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=accent + (alpha,))
glow = glow.filter(ImageFilter.GaussianBlur(60))
canvas = Image.alpha_composite(canvas, glow)

# place logo centered (square -> square, no skew)
L = 680
logo2 = logo.resize((L, L), Image.LANCZOS)
lx = (W - L) // 2
ly = 540
canvas.paste(logo2, (lx, ly), logo2)

canvas = canvas.convert("RGB")

try:
    fbold = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 120)
    freg = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 46)
except Exception:
    fbold = ImageFont.load_default()
    freg = ImageFont.load_default()

d = ImageDraw.Draw(canvas)

def center(text, y, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    tw = bb[2] - bb[0]
    d.text(((W - tw) // 2, y), text, font=font, fill=fill)

center("AIGENIUS", 1320, fbold, (255, 255, 255))
center("AI-powered tools for everyone", 1480, freg, (200, 205, 220))

canvas.save(out, "PNG")
print("saved", out)
