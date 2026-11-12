import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.conf': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  // Important: serve .gz without Content-Encoding so BlueMap's DecompressionStream handles raw bytes just like GitHub Pages
  '.gz': 'application/gzip',
};

function createRootStaticMiddleware(rootDir: string, mounts: string[]) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = (req.url || '/').split('?')[0];
    const matched = mounts.find((m) => rawUrl === `/${m}` || rawUrl.startsWith(`/${m}/`));
    if (!matched) return next();

    const mountRoot = path.resolve(rootDir, matched);
    let relPath = rawUrl.slice(matched.length + 1).replace(/^\/+/, '');
    if (!relPath || relPath.endsWith('/')) relPath += 'index.html';

    const filePath = path.resolve(mountRoot, decodeURIComponent(relPath));
    if (!filePath.startsWith(mountRoot)) {
      res.statusCode = 403;
      res.end();
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        // Never fall back to SPA index.html for static BlueMap/map data paths (matches GitHub Pages 404 behavior)
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(filePath).pipe(res);
    });
  };
}

function serveBluemapAndMapsPlugin(): Plugin {
  const rootDir = import.meta.dirname;
  return {
    name: 'serve-bluemap-and-maps',
    configureServer(server) {
      server.middlewares.use(createRootStaticMiddleware(rootDir, ['bluemap', 'maps']));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createRootStaticMiddleware(rootDir, ['bluemap', 'maps']));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveBluemapAndMapsPlugin()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
