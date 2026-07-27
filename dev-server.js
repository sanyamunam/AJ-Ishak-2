// Minimal static server with live reload (no dependencies).
// Watches this folder and pushes a reload event over SSE when a file changes.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

const RELOAD_SNIPPET = `<script>
(function(){
  var es = new EventSource('/__reload');
  es.onmessage = function(){ location.reload(); };
})();
</script>`;

const clients = new Set();

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (ext === '.html') {
      res.writeHead(200, headers).end(data.toString('utf8').replace('</body>', RELOAD_SNIPPET + '</body>'));
    } else {
      res.writeHead(200, headers).end(data);
    }
  });
});

let timer = null;
fs.watch(ROOT, { recursive: true }, (_evt, filename) => {
  if (!filename || filename.startsWith('.') || filename === 'dev-server.js') return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const c of clients) c.write('data: reload\n\n');
  }, 150);
});

server.listen(PORT, () => console.log('Al Jazeera prototype: http://localhost:' + PORT));
