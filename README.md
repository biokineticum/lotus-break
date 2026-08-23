# Lotus Break

A stained-glass **Breakout** that uses the same **head-camera** controls as Bodhisattva. Lean to move the golden barge. Raise your head to launch the pearl. Keyboard still works.

## How to run

1. Extract / open the `lotus-break` folder (not from inside a ZIP).
2. Click `play.bat`.

`play.bat`:

- launches the desktop app with the camera if `LotusBreak.exe` is already built
- on first run from source **builds the game** (needs [.NET 10 SDK](https://dotnet.microsoft.com/download) and internet)
- if `.NET` is missing, opens the browser version (keyboard works; camera does not)

Leave the `play.bat` window open during the first build. After that the game should start on its own.

Camera needs the desktop app, a webcam, Python with `onnxruntime`, `opencv-python` and `numpy`, and the [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Head tracking is **YOLOv8-Face** (5 landmarks: eyes, nose, mouth corners). The weights live in `desktop/models/yolov8n-face.onnx`.

## Controls

| Action | Keyboard | Camera |
| --- | --- | --- |
| Start / camera check | `Enter` | — |
| Move paddle | Left / Right arrows | Lean left / right |
| Launch ball | `Space` | Raise your head |
| Pause | `Esc` | — |
| Recalibrate | `C` | — |
| Camera settings | `F1` / `W` | — |
| Resolution | `F` | — |
| Mute | `M` | — |

## Relics

Bricks sometimes drop a relic:

- **Triple pearl** — two extra balls
- **Wide barge** — longer paddle
- **Fire pearl** — the ball burns through glass
- **Lotus life** — extra life (max 5)

Gold glass takes two hits. Obsidian takes three.

Eight windows. Keep the pearl aloft.
