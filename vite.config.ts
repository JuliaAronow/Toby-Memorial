import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only plugin that adds a /api/delete endpoint for removing assets
function deletePlugin() {
  return {
    name: 'delete-asset',
    configureServer(server: any) {
      server.middlewares.use('/api/delete', (req: any, res: any) => {
        const url = new URL(req.url, 'http://localhost');
        const file = url.searchParams.get('file'); // e.g. /src/assets/photo.jpg
        if (!file) {
          res.statusCode = 400;
          res.end('Missing file param');
          return;
        }
        const abs = path.join(__dirname, file);
        if (!abs.startsWith(path.join(__dirname, 'src', 'assets'))) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        try {
          fs.unlinkSync(abs);
          res.statusCode = 200;
          res.end('OK');
        } catch (e) {
          res.statusCode = 500;
          res.end('Delete failed');
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), deletePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
