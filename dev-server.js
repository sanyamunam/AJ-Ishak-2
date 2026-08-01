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

  fs.stat(file, (serr, st) => {
    if (serr || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const mtime = st.mtime.toUTCString();

    if (ext === '.html') {
      // html stays uncached so the reload snippet and edits always land
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[ext], 'Cache-Control': 'no-store' })
           .end(data.toString('utf8').replace('</body>', RELOAD_SNIPPET + '</body>'));
      });
      return;
    }

    /* Assets revalidate instead of re-downloading: the browser asks once per
       navigation and gets a 304 unless the file really changed. This is what
       stops images, fonts and the capsule videos re-fetching on every page. */
    if (req.headers['if-modified-since'] === mtime) {
      res.writeHead(304, { 'Cache-Control': 'no-cache', 'Last-Modified': mtime }).end();
      return;
    }
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Last-Modified': mtime,
    };

    // videos stream with Range support so playback and seeking don't stall
    const isMedia = ext === '.mp4' || ext === '.mov';
    if (isMedia) headers['Accept-Ranges'] = 'bytes';
    const range = isMedia && req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? parseInt(range[1], 10) : 0;
      const end = range[2] ? parseInt(range[2], 10) : st.size - 1;
      if (start > end || end >= st.size) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }).end();
        return;
      }
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
      headers['Content-Length'] = end - start + 1;
      res.writeHead(206, headers);
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }

    headers['Content-Length'] = st.size;
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
});

/* Reload only when a served file's CONTENT changes. The blanket watcher fired
   on .git bookkeeping and OneDrive sync churn (which rewrites mtimes without
   touching bytes), refreshing every open tab at random — the single biggest
   source of "the page reloaded by itself". Events are filtered by path and
   extension, then verified against a content hash before any reload. */
const crypto = require('crypto');
const WATCH_EXT = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff2', '.mp4', '.mov']);
const contentHash = new Map();

function hashOf(abs) {
  return crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
}

// pre-seed hashes so a sync touch right after boot doesn't read as an edit
(function seed(dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
    if (err) return;
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) seed(abs);
      else if (WATCH_EXT.has(path.extname(e.name).toLowerCase())) {
        try { contentHash.set(path.relative(ROOT, abs).replace(/\\/g, '/'), hashOf(abs)); } catch (err2) {}
      }
    }
  });
})(ROOT);

const pendingCheck = new Set();
let timer = null;
fs.watch(ROOT, { recursive: true }, (_evt, filename) => {
  if (!filename) return;
  const norm = filename.replace(/\\/g, '/');
  if (norm.startsWith('.') || norm.includes('/.')) return;          // .git, hidden files
  if (norm.startsWith('node_modules/') || norm === 'dev-server.js') return;
  if (!WATCH_EXT.has(path.extname(norm).toLowerCase())) return;     // temp/lock/sync files
  pendingCheck.add(norm);
  clearTimeout(timer);
  timer = setTimeout(() => {
    let changed = false;
    for (const rel of pendingCheck) {
      const abs = path.join(ROOT, rel);
      try {
        const h = hashOf(abs);
        if (contentHash.get(rel) !== h) { contentHash.set(rel, h); changed = true; }
      } catch (e) {
        if (contentHash.delete(rel)) changed = true;                // deleted counts
      }
    }
    pendingCheck.clear();
    if (changed) for (const c of clients) c.write('data: reload\n\n');
  }, 400);
});

server.listen(PORT, () => console.log('Al Jazeera prototype: http://localhost:' + PORT));
