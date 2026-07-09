using System.Net;
using System.Net.Sockets;
using Microsoft.Web.WebView2.Core;

namespace SMTinel.Desktop;

internal static class Program
{
    private const string Host = "127.0.0.1";
    private const int PreferredPort = 4181;

    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        try
        {
            var root = FindWebRoot();
            var port = PickPort(PreferredPort);
            using var server = new LocalStaticServer(root, port);
            server.Start();

            var url = $"http://{Host}:{port}/";
            using var form = new MainForm(url);
            Application.Run(form);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "SMTinel could not start.\n\n" + ex.Message,
                "SMTinel launcher error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private static string FindWebRoot()
    {
        var appRoot = AppContext.BaseDirectory;
        var candidates = new[]
        {
            appRoot,
            Path.Combine(appRoot, "web"),
            Path.Combine(appRoot, "_internal"),
            Directory.GetCurrentDirectory()
        };

        foreach (var candidate in candidates)
        {
            var index = Path.Combine(candidate, "index.html");
            if (File.Exists(index))
            {
                return candidate;
            }
        }

        throw new FileNotFoundException("index.html was not found. Keep SMTinel.exe in the published SMTinel folder.");
    }

    private static int PickPort(int preferred)
    {
        for (var port = preferred; port < preferred + 40; port++)
        {
            try
            {
                using var listener = new TcpListener(IPAddress.Parse(Host), port);
                listener.Start();
                listener.Stop();
                return port;
            }
            catch
            {
                // Try next port. The universe continues to be mildly annoying.
            }
        }

        throw new InvalidOperationException("No free local port found for SMTinel.");
    }
}

internal sealed class MainForm : Form
{
    private readonly string _url;
    private readonly Microsoft.Web.WebView2.WinForms.WebView2 _webView = new();

    public MainForm(string url)
    {
        _url = url;
        Text = "SMTinel - Trace Monitor Protect";
        Width = 1500;
        Height = 950;
        MinimumSize = new Size(1200, 760);
        StartPosition = FormStartPosition.CenterScreen;

        _webView.Dock = DockStyle.Fill;
        Controls.Add(_webView);
        Load += OnLoad;
    }

    private async void OnLoad(object? sender, EventArgs e)
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SMTinel",
                "WebView2");
            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(null, userData);
            await _webView.EnsureCoreWebView2Async(env);
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _webView.CoreWebView2.Navigate(_url);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "WebView2 could not start. Install Microsoft Edge WebView2 Runtime and try again.\n\n" + ex.Message,
                "SMTinel WebView2 error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}

internal sealed class LocalStaticServer : IDisposable
{
    private readonly string _root;
    private readonly HttpListener _listener = new();
    private readonly CancellationTokenSource _cts = new();
    private Task? _loop;

    public LocalStaticServer(string root, int port)
    {
        _root = root;
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
    }

    public void Start()
    {
        _listener.Start();
        _loop = Task.Run(() => ListenAsync(_cts.Token));
    }

    private async Task ListenAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested && _listener.IsListening)
        {
            HttpListenerContext context;
            try
            {
                context = await _listener.GetContextAsync();
            }
            catch
            {
                if (token.IsCancellationRequested) return;
                continue;
            }

            _ = Task.Run(() => HandleAsync(context), token);
        }
    }

    private async Task HandleAsync(HttpListenerContext context)
    {
        try
        {
            var requestPath = WebUtility.UrlDecode(context.Request.Url?.AbsolutePath ?? "/") ?? "/";
            if (requestPath == "/") requestPath = "/index.html";

            var cleanRelative = requestPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(_root, cleanRelative));
            var rootFullPath = Path.GetFullPath(_root);

            if (!fullPath.StartsWith(rootFullPath, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 403;
                context.Response.Close();
                return;
            }

            if (!File.Exists(fullPath))
            {
                var fallback = ResolveAssetFallback(requestPath);
                if (fallback is not null)
                {
                    fullPath = fallback;
                }
            }

            if (!File.Exists(fullPath))
            {
                context.Response.StatusCode = 404;
                await WriteTextAsync(context, "Not Found");
                return;
            }

            context.Response.ContentType = GetContentType(fullPath);
            context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            await using var stream = File.OpenRead(fullPath);
            context.Response.ContentLength64 = stream.Length;
            await stream.CopyToAsync(context.Response.OutputStream);
            context.Response.Close();
        }
        catch
        {
            try { context.Response.Close(); } catch { }
        }
    }

    private string? ResolveAssetFallback(string requestPath)
    {
        var fileName = Path.GetFileName(requestPath);
        if (string.IsNullOrWhiteSpace(fileName)) return null;

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var searchable = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico"
        };
        if (!searchable.Contains(extension)) return null;

        var folders = new[]
        {
            _root,
            Path.Combine(_root, "assets"),
            Path.Combine(_root, "assets", "images"),
            Path.Combine(_root, "assets", "icons"),
            Path.Combine(_root, "docs", "datasheets"),
            Path.Combine(_root, "docs"),
            Path.Combine(_root, "data")
        };

        foreach (var folder in folders)
        {
            if (!Directory.Exists(folder)) continue;
            var match = Directory.EnumerateFiles(folder, "*" + extension, SearchOption.TopDirectoryOnly)
                .FirstOrDefault(path => string.Equals(Path.GetFileName(path), fileName, StringComparison.OrdinalIgnoreCase));
            if (match is not null) return match;
        }

        return null;
    }

    private static async Task WriteTextAsync(HttpListenerContext context, string text)
    {
        await using var writer = new StreamWriter(context.Response.OutputStream);
        await writer.WriteAsync(text);
        context.Response.Close();
    }

    private static string GetContentType(string path)
    {
        return Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".html" => "text/html; charset=utf-8",
            ".htm" => "text/html; charset=utf-8",
            ".css" => "text/css; charset=utf-8",
            ".js" => "application/javascript; charset=utf-8",
            ".mjs" => "application/javascript; charset=utf-8",
            ".json" => "application/json; charset=utf-8",
            ".webmanifest" => "application/manifest+json; charset=utf-8",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".avif" => "image/avif",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            ".pdf" => "application/pdf",
            ".ico" => "image/x-icon",
            ".woff" => "font/woff",
            ".woff2" => "font/woff2",
            ".ttf" => "font/ttf",
            ".otf" => "font/otf",
            ".txt" => "text/plain; charset=utf-8",
            ".csv" => "text/csv; charset=utf-8",
            _ => "application/octet-stream"
        };
    }

    public void Dispose()
    {
        _cts.Cancel();
        if (_listener.IsListening) _listener.Stop();
        _listener.Close();
        _cts.Dispose();
    }
}
