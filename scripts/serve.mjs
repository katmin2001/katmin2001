// Tiny static server for previewing the README locally: `npm run preview`, then open /preview.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import './preview.mjs';

const ROOT = new URL('../', import.meta.url);
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown' };
const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'preview.html';
  if (path.includes('..')) return res.writeHead(400).end();
  try {
    const body = await readFile(new URL(path, ROOT));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`preview → http://localhost:${port}/preview.html`));
