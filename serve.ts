// serve.ts — a tiny static server for playing Sunset Bay locally.
// Serves the files in game/ on http://localhost:8080. Run it as:
//   node serve.ts
// Then open http://localhost:8080 in desktop Chrome. No build step, no
// network requests: every file the game loads lives under game/.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.env.PORT ?? 8080);

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url?.split('?')[0] ?? '/');
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  const ext = file.slice(file.lastIndexOf('.'));
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Sunset Bay at http://localhost:${port}`);
});
