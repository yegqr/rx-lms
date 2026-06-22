#!/usr/bin/env node
// Minimal zero-dependency upload server for disruption.180p.org
// Files land in ../uploads (the RX-LMS project), authed by a bearer token.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8095;
const HOST = process.env.HOST || '127.0.0.1';
const TOKEN = process.env.UPLOAD_TOKEN || '';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_BYTES = Number(process.env.MAX_BYTES || 5 * 1024 * 1024 * 1024); // 5 GiB

if (!TOKEN) {
  console.warn('WARNING: UPLOAD_TOKEN is empty — /upload is OPEN to anyone');
}
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'));

function authed(req) {
  if (!TOKEN) return true; // open mode: no token configured
  const url = new URL(req.url, 'http://x');
  const hdr = req.headers['authorization'] || '';
  const provided = hdr.startsWith('Bearer ') ? hdr.slice(7) : url.searchParams.get('token') || '';
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Keep only a safe basename; never let the client escape the upload dir.
function safeName(raw) {
  let name = path.basename(String(raw || '').replace(/\\/g, '/'));
  name = name.replace(/[\x00-\x1f]/g, '').trim();
  if (!name || name === '.' || name === '..') name = 'upload-' + Date.now();
  return name;
}

function uniquePath(name) {
  let p = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  return path.join(UPLOAD_DIR, `${base}-${Date.now()}${ext}`);
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(INDEX_HTML);
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/upload' && (req.method === 'PUT' || req.method === 'POST')) {
    if (!authed(req)) return json(res, 401, { ok: false, error: 'unauthorized' });

    const declared = Number(req.headers['content-length'] || 0);
    if (declared && declared > MAX_BYTES) return json(res, 413, { ok: false, error: 'too large' });

    const name = safeName(url.searchParams.get('name') || req.headers['x-filename']);
    const dest = uniquePath(name);
    const tmp = dest + '.part';
    const out = fs.createWriteStream(tmp);
    let received = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > MAX_BYTES) {
        aborted = true;
        req.destroy();
        out.destroy();
        fs.rm(tmp, () => {});
        return json(res, 413, { ok: false, error: 'too large' });
      }
    });

    req.pipe(out);

    out.on('error', () => {
      if (aborted) return;
      fs.rm(tmp, () => {});
      json(res, 500, { ok: false, error: 'write failed' });
    });
    out.on('finish', () => {
      if (aborted) return;
      fs.renameSync(tmp, dest);
      console.log(`[upload] ${path.basename(dest)} (${received} bytes)`);
      json(res, 200, { ok: true, name: path.basename(dest), bytes: received });
    });
    req.on('aborted', () => {
      out.destroy();
      fs.rm(tmp, () => {});
    });
    return;
  }

  json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`upload-server on http://${HOST}:${PORT} -> ${UPLOAD_DIR}`);
});
