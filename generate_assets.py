"""
Genera los assets PNG para Mady App (icon, splash, adaptive-icon, favicon).
Ejecutar: python generate_assets.py
Requiere: pip install Pillow
"""

import os
import math

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Instalando Pillow...")
    os.system("pip install Pillow")
    from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# Colores Mady
CREAM       = (245, 240, 232)
CREAM_LIGHT = (250, 247, 242)
GOLD        = (201, 168, 76)
GOLD_LIGHT  = (226, 201, 126)
GOLD_DARK   = (166, 124, 53)
BLACK       = (26, 26, 26)


def draw_icon(draw, cx, cy, radius, bg_color):
    """Dibuja el ícono circular de Mady centrado en (cx, cy)."""
    # Sombra
    shadow_r = radius + 6
    draw.ellipse(
        [cx - shadow_r, cy - shadow_r + 8, cx + shadow_r, cy + shadow_r + 8],
        fill=(0, 0, 0, 40),
    )
    # Círculo dorado exterior
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=GOLD)
    # Círculo crema interior
    inner = int(radius * 0.76)
    draw.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=bg_color)
    # Letra "M" centrada
    letter_size = int(radius * 0.70)
    try:
        font = ImageFont.truetype("arial.ttf", letter_size)
    except Exception:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", letter_size)
        except Exception:
            font = ImageFont.load_default()
    # Medir texto
    bbox = draw.textbbox((0, 0), "M", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 4), "M", font=font, fill=GOLD)
    # Puntos decorativos
    dot_y = cy + radius + 14
    for i, (ox, dr) in enumerate([(-12, 5), (0, 8), (12, 5)]):
        col = GOLD if i == 1 else GOLD_LIGHT
        r = dr // 2
        draw.ellipse([cx + ox - r, dot_y - r, cx + ox + r, dot_y + r], fill=col)


def make_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Fondo crema redondeado
    pad = int(size * 0.04)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad],
                            radius=int(size * 0.22), fill=CREAM)
    # Ícono
    draw_icon(draw, size // 2, size // 2 - int(size * 0.04),
              int(size * 0.32), CREAM)
    # Texto MADY
    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.13))
    except Exception:
        font = ImageFont.load_default()
    text = "MADY"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    ty = int(size * 0.72)
    draw.text(((size - tw) // 2, ty), text, font=font, fill=BLACK)
    return img


def make_splash(width=1284, height=2778):
    img = Image.new("RGB", (width, height), CREAM_LIGHT)
    draw = ImageDraw.Draw(img)
    cx, cy = width // 2, height // 2

    # Degradado suave (simulado con rectángulos)
    for i in range(height):
        t = i / height
        r = int(CREAM_LIGHT[0] * (1 - t) + CREAM[0] * t)
        g = int(CREAM_LIGHT[1] * (1 - t) + CREAM[1] * t)
        b = int(CREAM_LIGHT[2] * (1 - t) + CREAM[2] * t)
        draw.line([(0, i), (width, i)], fill=(r, g, b))

    # Esquinas decorativas
    corner = int(min(width, height) * 0.07)
    for x, y, dirs in [
        (0, 0, ("right", "down")),
        (width, 0, ("left", "down")),
        (0, height, ("right", "up")),
        (width, height, ("left", "up")),
    ]:
        lw = 4
        col = (*GOLD, 80)
        # línea horizontal
        hx0 = x if "right" in dirs else x - corner
        draw.rectangle([hx0, y if "down" in dirs else y - lw,
                        hx0 + corner, (y if "down" in dirs else y - lw) + lw],
                       fill=GOLD[:3])
        # línea vertical
        vy0 = y if "down" in dirs else y - corner
        draw.rectangle([x if "right" in dirs else x - lw, vy0,
                        (x if "right" in dirs else x - lw) + lw, vy0 + corner],
                       fill=GOLD[:3])

    # Ícono principal
    icon_r = int(min(width, height) * 0.16)
    draw_icon(draw, cx, cy - int(height * 0.06), icon_r, CREAM)

    # Título MADY
    try:
        font_big = ImageFont.truetype("arial.ttf", int(width * 0.16))
        font_tag = ImageFont.truetype("arial.ttf", int(width * 0.055))
        font_sub = ImageFont.truetype("arial.ttf", int(width * 0.036))
    except Exception:
        font_big = font_tag = font_sub = ImageFont.load_default()

    title_y = cy + int(height * 0.14)
    bbox = draw.textbbox((0, 0), "MADY", font=font_big)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, title_y), "MADY", font=font_big, fill=BLACK)

    # Divisor dorado
    div_y = title_y + (bbox[3] - bbox[1]) + int(height * 0.02)
    div_w = int(width * 0.35)
    div_h = 2
    draw.rectangle([(cx - div_w // 2, div_y), (cx + div_w // 2, div_y + div_h)],
                   fill=GOLD)
    # Diamante central
    d = 10
    draw.polygon([(cx, div_y - d), (cx + d, div_y + div_h // 2),
                  (cx, div_y + div_h + d), (cx - d, div_y + div_h // 2)],
                 fill=GOLD)

    # Tagline
    tag_y = div_y + int(height * 0.04)
    tag = "Elegancia que te define"
    bbox2 = draw.textbbox((0, 0), tag, font=font_tag)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((width - tw2) // 2, tag_y), tag, font=font_tag, fill=GOLD_DARK)

    # Footer
    footer_y = height - int(height * 0.06)
    footer_text = "madyapp.com"
    bbox3 = draw.textbbox((0, 0), footer_text, font=font_sub)
    tw3 = bbox3[2] - bbox3[0]
    draw.text(((width - tw3) // 2, footer_y), footer_text, font=font_sub,
              fill=(*GOLD_DARK, 140))

    return img


def make_favicon(size=48):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size, size], fill=GOLD)
    inner = int(size * 0.76)
    off = (size - inner) // 2
    draw.ellipse([off, off, off + inner, off + inner], fill=CREAM)
    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.42))
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), "M", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) // 2, (size - th) // 2 - 1), "M", font=font, fill=GOLD)
    return img


print("Generando assets...")

icon = make_icon(1024)
icon.save(os.path.join(ASSETS_DIR, "icon.png"))
print("  ✓ assets/icon.png  (1024x1024)")

adaptive = make_icon(1024)
adaptive.save(os.path.join(ASSETS_DIR, "adaptive-icon.png"))
print("  ✓ assets/adaptive-icon.png  (1024x1024)")

splash = make_splash(1284, 2778)
splash.save(os.path.join(ASSETS_DIR, "splash.png"))
print("  ✓ assets/splash.png  (1284x2778)")

favicon = make_favicon(48)
favicon.save(os.path.join(ASSETS_DIR, "favicon.png"))
print("  ✓ assets/favicon.png  (48x48)")

print("\n✅ Todos los assets generados correctamente en /assets")
