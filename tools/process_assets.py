"""Chroma-key sprites and export engine-ready PNGs for Lotus Break."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets" / "_raw"
SPR = ROOT / "assets" / "sprites"
BG = ROOT / "assets" / "bg"
UI = ROOT / "assets" / "ui"
DESK = ROOT / "desktop"
SPR.mkdir(parents=True, exist_ok=True)
BG.mkdir(parents=True, exist_ok=True)
UI.mkdir(parents=True, exist_ok=True)

# Target height after crop. Width follows aspect.
HEIGHTS = {
    "paddle": 92,
    "ball": 72,
    "lotus": 72,
    "power_multi": 68,
    "power_fire": 68,
    "power_wide": 52,
    "brick_ruby": 56,
    "brick_sapphire": 56,
    "brick_emerald": 56,
    "brick_amethyst": 56,
    "brick_gold": 56,
    "brick_obsidian": 56,
}

BACKGROUNDS = {
    "title.jpg": "title.jpg",
    "temple.jpg": "temple.jpg",
}

GREEN_KEYS = {"lotus", "ball"}


def chroma_key(im: Image.Image, mode: str = "magenta") -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    diff = np.maximum(mx - mn, 1e-5)
    hue = np.zeros_like(r)
    mask_r = (mx == r) & (mx != mn)
    mask_g = (mx == g) & (mx != mn)
    mask_b = (mx == b) & (mx != mn)
    hue[mask_r] = np.mod((g[mask_r] - b[mask_r]) / diff[mask_r], 6.0)
    hue[mask_g] = (b[mask_g] - r[mask_g]) / diff[mask_g] + 2.0
    hue[mask_b] = (r[mask_b] - g[mask_b]) / diff[mask_b] + 4.0
    hue = hue * 60.0
    sat = np.where(mx > 0, diff / np.maximum(mx, 1e-5), 0.0)
    alpha = arr[..., 3].copy()

    if mode == "green":
        dist = np.sqrt((r - 0.0) ** 2 + (g - 255.0) ** 2 + (b - 0.0) ** 2)
        is_key = ((g > 190) & (r < 90) & (b < 90)) | (dist < 50)
        fringe = (~is_key) & (g > 160) & (g > r + 25) & (g > b + 40)
    else:
        dist = np.sqrt((r - 255.0) ** 2 + (g - 0.0) ** 2 + (b - 255.0) ** 2)
        is_key = ((hue >= 278) & (hue <= 332) & (sat > 0.28) & (mx > 140) & (g < 150)) | (dist < 48)
        fringe = (~is_key) & ((hue >= 275) & (hue <= 335)) & (sat > 0.18) & (g < 170)
        pink = ((hue >= 270) & (hue <= 340) & (sat > 0.22) & (g < 190) & (b > g + 8))
        is_key = is_key | pink

    alpha[is_key] = 0
    alpha[fringe] = np.minimum(alpha[fringe], 70)
    out = arr.copy()
    # Despill leftover magenta from gold edges.
    spill = (out[..., 2] > out[..., 1]) & (out[..., 3] > 0) & (out[..., 0] > 70)
    out[..., 2][spill] = out[..., 1][spill]
    out[..., 3] = alpha
    # Pull remaining fringe toward neighbor luminance so gold edges stay gold.
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def crop_alpha(im: Image.Image, pad: int = 6) -> Image.Image:
    arr = np.asarray(im.split()[-1])
    ys, xs = np.where(arr > 16)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def resize_h(im: Image.Image, h: int) -> Image.Image:
    w = max(1, int(round(im.width * (h / im.height))))
    return im.resize((w, h), Image.Resampling.LANCZOS)


def drop_green_glow(im: Image.Image) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    glow = (g > r + 8) & (g > b + 18) & (g > 70)
    a[glow] = 0
    arr[..., 3] = a
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def process_sprite(stem: str, src: Path) -> None:
    im = Image.open(src)
    mode = "green" if stem in GREEN_KEYS else "magenta"
    keyed = chroma_key(im, mode)
    if stem == "ball":
        keyed = drop_green_glow(keyed)
    cropped = crop_alpha(keyed, pad=4 if stem == "ball" else 6)
    h = HEIGHTS.get(stem, 64)
    out = resize_h(cropped, h)
    dest = SPR / (stem + ".png")
    out.save(dest, "PNG")
    print(f"sprite {stem}: {out.size[0]}x{out.size[1]} -> {dest.name}")


def process_bg(src_name: str, dest_name: str) -> None:
    src = RAW / src_name
    im = Image.open(src).convert("RGB")
    im = im.resize((1920, 1080), Image.Resampling.LANCZOS)
    dest = BG / dest_name
    im.save(dest, "JPEG", quality=90, optimize=True)
    print(f"bg {dest_name}: {im.size}")


def make_icon() -> None:
    src = RAW / "icon.jpg"
    if not src.exists():
        return
    im = Image.open(src).convert("RGBA")
    # Flatten rounded-square onto transparent by dropping near-white corners.
    arr = np.asarray(im).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    white = (r > 245) & (g > 245) & (b > 245)
    a[white] = 0
    arr[..., 3] = a
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    square = im.resize((256, 256), Image.Resampling.LANCZOS)
    png = UI / "icon.png"
    square.save(png, "PNG")
    ico_path = DESK / "icon.ico"
    sizes = [(16, 16), (32, 32), (48, 48), (256, 256)]
    frames = [square.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    frames[0].save(ico_path, format="ICO", sizes=[(f.width, f.height) for f in frames], append_images=frames[1:])
    root_ico = ROOT / "icon.ico"
    square.save(root_ico.with_suffix(".png"), "PNG")
    frames[0].save(root_ico, format="ICO", sizes=[(f.width, f.height) for f in frames], append_images=frames[1:])
    print(f"icon -> {ico_path}")


def main() -> None:
    for src in sorted(RAW.glob("*.jpg")):
        stem = src.stem
        if src.name in BACKGROUNDS:
            continue
        if stem == "icon":
            continue
        process_sprite(stem, src)
    for src_name, dest_name in BACKGROUNDS.items():
        process_bg(src_name, dest_name)
    make_icon()
    print("done")


if __name__ == "__main__":
    main()
