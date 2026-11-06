# Lotus Break

**Stained-glass Breakout with head-camera controls** — lean to move the paddle, raise your head to launch. Keyboard still works.

Built for short **neck mobility breaks** at a desk. Aimed at office workers, physios recommending micro-breaks, and anyone exploring camera-based rehab games.

## Features

- Breakout-style levels with stained-glass bricks and power-ups (triple ball, wide paddle, fire ball, extra life)
- **Head tracking** via desktop app (YOLOv8-Face ONNX in `desktop/models/`)
- Browser fallback (keyboard only) when .NET is missing
- Windows launcher: `play.bat`

## Requirements

- Webcam + [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) for camera mode
- [.NET SDK](https://dotnet.microsoft.com/download) to build the desktop app from source
- Python with `onnxruntime`, `opencv-python`, `numpy` for the head tracker

## Quick start

1. Clone or extract the repo (not from inside a ZIP).
2. Double-click **`play.bat`**.

`play.bat` runs `LotusBreak.exe` if built; otherwise builds from source (needs .NET + internet). Without .NET it opens the browser version.

Leave the `play.bat` window open during the first build.

## Controls

| Action | Keyboard | Camera |
| --- | --- | --- |
| Start / camera check | `Enter` | — |
| Move paddle | ← / → | Lean left / right |
| Launch ball | `Space` | Raise head |
| Pause | `Esc` | — |
| Recalibrate | `C` | — |
| Camera settings | `F1` / `W` | — |

## Relics

Bricks may drop: **Triple pearl**, **Wide barge**, **Fire pearl**, **Lotus life** (max 5). Gold glass takes two hits; obsidian three.

---

## Author

**Dariusz Mosler** (Biokineticum) — physiotherapy, biomechanics, sports science  
🌐 [biokineticum.com](https://biokineticum.com) · 📰 [Substack](https://biokineticum.substack.com) · 𝕏 [@Biokineticum](https://x.com/Biokineticum)

