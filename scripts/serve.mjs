import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, sep, extname } from 'node:path';

const port = Number(process.env.PORT || 3000);
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    const file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(`404 Not Found: ${pathname}`);
    }

    const ext = extname(file).toLowerCase();
    const bytes = readFileSync(file);
    res.writeHead(200, {
      'content-type': mime[ext] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(bytes);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`500 Server Error: ${err.message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\n=================================================`);
  console.log(`  BienEdu Local Server đang chạy tại:`);
  console.log(`  🔗 http://localhost:${port}/`);
  console.log(`=================================================`);
  console.log(`  Các trang chính:`);
  console.log(`  - Trang chủ     : http://localhost:${port}/index.html`);
  console.log(`  - Tài liệu học  : http://localhost:${port}/documents.html`);
  console.log(`  - Khóa học      : http://localhost:${port}/course.html`);
  console.log(`  - Luyện đề      : http://localhost:${port}/quiz.html`);
  console.log(`  - Liên hệ       : http://localhost:${port}/contact.html`);
  console.log(`\n  Nhấn Ctrl + C để dừng server.\n`);
});

