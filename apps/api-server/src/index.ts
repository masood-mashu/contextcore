import express from 'express';
import cors from 'cors';
import { API_PORT } from '@contextcore/shared';
import { requireAuth } from './middleware/auth';
import contextRoutes from './routes/context';
import moodRoutes    from './routes/mood';
import mirrorRoutes  from './routes/mirror';
import { startEngine } from '@contextcore/context-engine';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// CORS: allow all origins since this is localhost-only
app.use(cors({ origin: '*' }));

// Auth: every route except /health requires a token
app.use(requireAuth);

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check — no auth required, used by VS Code extension to check if app is running
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    version: '1.0.0',
    uptime:  Math.floor(process.uptime())
  });
});

// Root — API info
app.get('/', (req, res) => {
  res.json({
    name:      'ContextCore API',
    version:   '1.0.0',
    endpoints: [
      'GET  /health',
      'GET  /context',
      'GET  /context/focus',
      'GET  /context/history',
      'POST /context/refresh',
      'POST /mood',
      'GET  /mood/today',
      'GET  /mirror'
    ]
  });
});

app.use('/context', contextRoutes);
app.use('/mood',    moodRoutes);
app.use('/mirror',  mirrorRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(API_PORT, '127.0.0.1', () => {
  console.log(`[API] ContextCore running at http://127.0.0.1:${API_PORT}`);
  console.log(`[API] Token: cc-dev-token-2024`);
  console.log(`[API] Test: curl http://127.0.0.1:${API_PORT}/health`);

  // Start the context engine alongside the API server
  startEngine();
});