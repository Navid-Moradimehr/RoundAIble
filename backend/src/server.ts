import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import executionRoutes from './routes/execution.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4199);
const HOST = process.env.HOST || '127.0.0.1';

// Frontend build output (repo-root/frontend/dist when running from a checkout,
// or an explicit FRONTEND_DIST override). When present, Express serves the UI
// on the same port as the API — one process, one URL, no dev servers needed.
const FRONTEND_DIST = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : fileURLToPath(new URL('../../frontend/dist', import.meta.url));
const HAS_FRONTEND = fs.existsSync(path.join(FRONTEND_DIST, 'index.html'));

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/no-origin (curl, EventSource) and localhost dev servers.
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', frontend: HAS_FRONTEND ? 'bundled' : 'dev' });
});

app.use('/api', executionRoutes);

// Static UI + SPA fallback for client-side routes.
if (HAS_FRONTEND) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
      return;
    }
    next();
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, HOST, () => {
  console.log(`RoundAIble is running at http://${HOST}:${PORT}`);
  if (!HAS_FRONTEND) {
    console.log('(API only — no frontend/dist found. In dev, use the Vite server on :5199.)');
  }
});
