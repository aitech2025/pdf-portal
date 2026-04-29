const http = require('http');
const port = process.env.PORT || 3000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EduPortal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 16px; padding: 48px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { width: 64px; height: 64px; background: #4f46e5; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; }
    .logo span { color: white; font-size: 28px; font-weight: 700; }
    h1 { font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    p { color: #6b7280; font-size: 15px; margin-bottom: 24px; line-height: 1.6; }
    .badge { display: inline-block; background: #ede9fe; color: #4f46e5; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 32px; }
    .api-box { background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: left; margin-top: 16px; }
    .api-box code { font-family: monospace; font-size: 13px; color: #374151; }
    .api-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
    .status { display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 14px; color: #059669; }
    .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>E</span></div>
    <h1>EduPortal</h1>
    <p>Educational Content Management Platform</p>
    <div class="badge">Mobile + Web + API</div>
    <div class="api-box">
      <div class="label">API Base URL</div>
      <code>/api/*  →  FastAPI on :8001</code>
    </div>
    <div class="status">
      <div class="dot"></div>
      <span>Backend API is running</span>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`EduPortal frontend running on http://0.0.0.0:${port}`);
});
