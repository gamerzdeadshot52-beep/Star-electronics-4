// Tiny static preview server (no dependencies).
// Run:  node serve.mjs   →  http://localhost:4173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const data = await readFile(target);
    res.writeHead(200, {
      'content-type': types[extname(target)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(root, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    }
  }
}).listen(port, () => console.log(`Preview: http://localhost:${port}`));
