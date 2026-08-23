using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LotusBreak;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}

sealed class MainForm : Form
{
    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(10, 8, 22),
    };

    readonly Panel _bar = new()
    {
        Dock = DockStyle.Top,
        Height = 42,
        BackColor = Color.FromArgb(18, 16, 36),
        Padding = new Padding(8, 6, 8, 6),
    };

    internal static MainForm? Instance;
    readonly CameraTracker _cam = new();
    System.Windows.Forms.Timer? _camPush;
    bool _fullscreen;
    FormBorderStyle _prevBorder;
    Rectangle _prevBounds;

    public MainForm()
    {
        Text = "Lotus Break";
        BackColor = Color.FromArgb(10, 8, 22);
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(960, 580);
        ClientSize = new Size(1280, 762);
        KeyPreview = true;
        AcceptButton = null;
        CancelButton = null;

        var iconPath = Path.Combine(AppContext.BaseDirectory, "desktop", "icon.ico");
        if (!File.Exists(iconPath))
            iconPath = Path.Combine(AppContext.BaseDirectory, "icon.ico");
        if (File.Exists(iconPath))
            Icon = new Icon(iconPath);

        Instance = this;

        var btnPlay = MakeBarButton("Start game", 130);
        btnPlay.BackColor = Color.FromArgb(42, 90, 48);
        btnPlay.Click += (_, _) => { StartGameFromHost(); FocusGame(); };
        var btnSettings = MakeBarButton("Camera settings", 180);
        btnSettings.Click += (_, _) => { OpenCameraSettings(); FocusGame(); };
        var btnCam = MakeBarButton("Turn on camera", 160);
        btnCam.BackColor = Color.FromArgb(42, 58, 32);
        btnCam.Click += (_, _) => { StartNativeCam(); FocusGame(); };
        var hint = new Label
        {
            AutoSize = true,
            Text = "Enter = start   ·   F1 = settings   ·   lean = barge",
            ForeColor = Color.FromArgb(203, 180, 138),
            Font = new Font("Segoe UI", 9f),
            Margin = new Padding(16, 8, 8, 0),
        };
        var flow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            BackColor = Color.FromArgb(18, 16, 36),
        };
        flow.Controls.Add(btnPlay);
        flow.Controls.Add(btnCam);
        flow.Controls.Add(btnSettings);
        flow.Controls.Add(hint);
        _bar.Controls.Add(flow);

        Controls.Add(_web);
        Controls.Add(_bar);
        _bar.BringToFront();

        Load += OnLoadAsync;
        KeyDown += OnKeyDown;
        Application.AddMessageFilter(new HotKeyFilter(this));
        FormClosing += (_, _) =>
        {
            _camPush?.Stop();
            _cam.Dispose();
            _web.Dispose();
        };
    }

    static Button MakeBarButton(string text, int width)
    {
        return new Button
        {
            Text = text,
            Width = width,
            Height = 28,
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(58, 40, 20),
            ForeColor = Color.FromArgb(255, 244, 208),
            Font = new Font("Segoe UI", 9f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Margin = new Padding(0, 1, 8, 0),
            TabStop = false,
        };
    }

    async void OnLoadAsync(object? sender, EventArgs e)
    {
        try
        {
            await InitWebView();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "WebView2 failed to start.\n\n" + ex.Message +
                "\n\nInstall the Evergreen WebView2 Runtime from Microsoft.",
                "Lotus Break",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    async Task InitWebView()
    {
        var root = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "LotusBreak");
        var folders = new[]
        {
            Path.Combine(root, "WebView2"),
            Path.Combine(root, "WebView2-b"),
        };

        Exception? last = null;
        foreach (var userData in folders)
        {
            try
            {
                Directory.CreateDirectory(userData);
                var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
                await _web.EnsureCoreWebView2Async(env);
                last = null;
                break;
            }
            catch (Exception ex)
            {
                last = ex;
            }
        }
        if (_web.CoreWebView2 == null)
            throw last ?? new InvalidOperationException("WebView2 did not initialize.");

        var settings = _web.CoreWebView2.Settings;
        settings.AreDefaultContextMenusEnabled = false;
        settings.AreDevToolsEnabled = false;
        settings.IsStatusBarEnabled = false;
        settings.AreBrowserAcceleratorKeysEnabled = false;
        settings.IsZoomControlEnabled = false;
        settings.IsSwipeNavigationEnabled = false;
        settings.AreDefaultScriptDialogsEnabled = true;
        try { settings.AreHostObjectsAllowed = true; } catch { }

        _web.CoreWebView2.NewWindowRequested += (_, ev) => ev.Handled = true;
        _web.CoreWebView2.PermissionRequested += OnPermissionRequested;
        _web.CoreWebView2.AddHostObjectToScript("bodhi", new HostBridge());
        _web.CoreWebView2.WebMessageReceived += (_, ev) =>
        {
            string msg;
            try { msg = ev.TryGetWebMessageAsString(); }
            catch { msg = ev.WebMessageAsJson; }
            if (string.IsNullOrEmpty(msg)) return;
            if (msg.Contains("start-camera", StringComparison.OrdinalIgnoreCase))
                BeginInvoke(StartNativeCam);
            else if (msg.Contains("stop-camera", StringComparison.OrdinalIgnoreCase))
                BeginInvoke(StopNativeCam);
            else if (msg.Contains("open-camera-settings", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("cam-denied", StringComparison.OrdinalIgnoreCase))
                BeginInvoke(OpenCameraSettings);
        };

        var gameRoot = FindGameRoot();
        var index = Path.Combine(gameRoot, "index.html");
        if (!File.Exists(index))
        {
            MessageBox.Show(
                this,
                "Could not find the game files next to the program.\n\nLooked for index.html from:\n" +
                AppContext.BaseDirectory + "\n\nLast folder:\n" + gameRoot,
                "Lotus Break",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "lotusbreak.local",
            gameRoot,
            CoreWebView2HostResourceAccessKind.Allow);

        foreach (var origin in new[] { "https://lotusbreak.local/", "https://lotusbreak.local" })
        {
            try
            {
                await _web.CoreWebView2.Profile.SetPermissionStateAsync(
                    CoreWebView2PermissionKind.Camera,
                    origin,
                    CoreWebView2PermissionState.Default);
            }
            catch { }
        }

        _web.CoreWebView2.NavigationCompleted += (_, _) =>
        {
            FocusGame();
            _ = _web.ExecuteScriptAsync("document.getElementById('game')?.focus()");
        };

        _web.CoreWebView2.Navigate("https://lotusbreak.local/index.html");
    }

    void OnPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs ev)
    {
        var kind = ev.PermissionKind.ToString();
        var isCam = ev.PermissionKind == CoreWebView2PermissionKind.Camera
            || ev.PermissionKind == CoreWebView2PermissionKind.Microphone
            || kind.Contains("Camera", StringComparison.OrdinalIgnoreCase)
            || kind.Contains("Mic", StringComparison.OrdinalIgnoreCase);

        if (!isCam) return;

        var deferral = ev.GetDeferral();
        BeginInvoke(() =>
        {
            try
            {
                var ans = MessageBox.Show(
                    this,
                    "The game wants to use the camera for head control.\n\nAllow it?\n\n" +
                    "If the picture does not start: Windows Settings → Privacy → Camera\n" +
                    "→ turn on “Allow desktop apps to access your camera”.\n" +
                    "You do not add Lotus Break to any list.",
                    "Camera",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);
                ev.State = ans == DialogResult.Yes
                    ? CoreWebView2PermissionState.Allow
                    : CoreWebView2PermissionState.Deny;
                ev.Handled = true;
                try { ev.SavesInProfile = true; } catch { }
            }
            finally
            {
                deferral.Complete();
            }
        });
    }

    static string FindGameRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < 16 && dir != null; i++, dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "index.html"))
                && Directory.Exists(Path.Combine(dir.FullName, "assets")))
                return dir.FullName;
        }
        return AppContext.BaseDirectory;
    }

    void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F1)
        {
            OpenCameraSettings();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.F11)
        {
            ToggleFullscreen();
            e.Handled = true;
        }
        else if (e.KeyCode == Keys.Escape && _fullscreen)
        {
            ToggleFullscreen();
            e.Handled = true;
        }
    }

    internal void ToggleFullscreenFromHotkey() => ToggleFullscreen();

    void ToggleFullscreen()
    {
        if (!_fullscreen)
        {
            _prevBorder = FormBorderStyle;
            _prevBounds = Bounds;
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            _fullscreen = true;
        }
        else
        {
            WindowState = FormWindowState.Normal;
            FormBorderStyle = _prevBorder;
            Bounds = _prevBounds;
            _fullscreen = false;
        }
    }

    void FocusGame()
    {
        try { _web.Focus(); } catch { }
    }

    internal void StartGameFromHost()
    {
        try
        {
            _web.CoreWebView2?.ExecuteScriptAsync("window.BodhiStart && window.BodhiStart()");
        }
        catch { }
        FocusGame();
    }

    internal void StartNativeCam()
    {
        _cam.Updated = QueueHeadPush;
        _cam.Start();
        if (_camPush != null) return;
        _camPush = new System.Windows.Forms.Timer { Interval = 16 };
        _camPush.Tick += (_, _) => PushHead();
        _camPush.Start();
    }

    void QueueHeadPush()
    {
        try { BeginInvoke(PushHead); }
        catch { _cam.NotePushed(); }
    }

    void PushHead()
    {
        _cam.NotePushed();
        try
        {
            _web.CoreWebView2?.PostWebMessageAsJson(_cam.SnapshotJson());
        }
        catch { }
    }

    internal void StopNativeCam()
    {
        _cam.Updated = null;
        _camPush?.Stop();
        _camPush?.Dispose();
        _camPush = null;
        _cam.Stop();
    }

    internal void OpenCameraSettings()
    {
        if (InvokeRequired)
        {
            BeginInvoke(OpenCameraSettings);
            return;
        }

        var opened = LaunchPrivacyCamera();
        Activate();
        BringToFront();
        MessageBox.Show(
            this,
            (opened
                ? "Opened Windows camera settings.\n\n"
                : "Could not open Settings automatically — do it by hand.\n\n") +
            "Settings → Privacy & security → Camera\n\n" +
            "1. Camera access = On\n" +
            "2. Let apps access your camera = On\n" +
            "3. Let desktop apps access your camera = On\n\n" +
            "Lotus Break is NOT on the Store app list. The desktop-apps switch is enough.",
            "Windows camera",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    static bool LaunchPrivacyCamera()
    {
        var explorer = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.Windows),
            "explorer.exe");
        var tries = new (string file, string? args)[]
        {
            ("ms-settings:privacy-webcam", null),
            (explorer, "ms-settings:privacy-webcam"),
            ("cmd.exe", "/c start \"\" ms-settings:privacy-webcam"),
        };
        foreach (var (file, args) in tries)
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = file,
                    UseShellExecute = true,
                };
                if (args != null) psi.Arguments = args;
                if (file.EndsWith("cmd.exe", StringComparison.OrdinalIgnoreCase))
                {
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                }
                using var p = System.Diagnostics.Process.Start(psi);
                if (p != null || args == null) return true;
            }
            catch { }
        }
        return NativeShell.Open("ms-settings:privacy-webcam");
    }
}

sealed class HotKeyFilter : IMessageFilter
{
    readonly MainForm _form;
    public HotKeyFilter(MainForm form) => _form = form;

    public bool PreFilterMessage(ref Message m)
    {
        const int wmKeyDown = 0x0100;
        const int wmSysKeyDown = 0x0104;
        if (m.Msg != wmKeyDown && m.Msg != wmSysKeyDown) return false;
        var vk = (int)m.WParam;
        if (vk == 0x0D)
        {
            _form.BeginInvoke(_form.StartGameFromHost);
            return false;
        }
        if (vk == 0x70)
        {
            _form.BeginInvoke(_form.OpenCameraSettings);
            return true;
        }
        if (vk == 0x7A)
        {
            _form.BeginInvoke(_form.ToggleFullscreenFromHotkey);
            return true;
        }
        return false;
    }
}

static class NativeShell
{
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern nint ShellExecute(nint hwnd, string lpOperation, string lpFile, string? lpParameters, string? lpDirectory, int nShowCmd);

    public static bool Open(string uri)
    {
        try
        {
            var r = (int)ShellExecute(0, "open", uri, null, null, 1);
            return r > 32;
        }
        catch
        {
            return false;
        }
    }
}

[ComVisible(true)]
[ClassInterface(ClassInterfaceType.AutoDual)]
public class HostBridge
{
    public void OpenCameraSettings() => MainForm.Instance?.BeginInvoke(MainForm.Instance.OpenCameraSettings);
    public void StartCamera() => MainForm.Instance?.BeginInvoke(MainForm.Instance.StartNativeCam);
    public void StopCamera() => MainForm.Instance?.BeginInvoke(MainForm.Instance.StopNativeCam);
}
