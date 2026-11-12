import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.join(__dirname, 'live-game-config.json');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Allow CORS from anywhere so standalone admin.html (on Firebase, HTML Editor app, or local phone) can publish directly
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '15mb' }));

  // GET live game configuration for all players
  app.get('/api/config', (_req, res) => {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        res.json({ ok: true, config: parsed });
        return;
      }
      res.json({ ok: true, config: null });
    } catch (err) {
      console.error('Error reading live config:', err);
      res.json({ ok: false, config: null });
    }
  });

  // POST live game configuration from admin.html
  app.post('/api/config', (req, res) => {
    try {
      const incomingConfig = req.body?.config || req.body;
      if (!incomingConfig || typeof incomingConfig !== 'object') {
        res.status(400).json({ ok: false, error: 'Invalid config payload' });
        return;
      }

      let existingConfig: Record<string, unknown> = {};
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        try {
          existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
        } catch {
          existingConfig = {};
        }
      }

      const merged = {
        ...existingConfig,
        ...incomingConfig,
        updatedAt: Date.now(),
      };

      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
      res.json({ ok: true, config: merged });
    } catch (err) {
      console.error('Error saving live config:', err);
      res.status(500).json({ ok: false, error: 'Failed to save config' });
    }
  });

  // Serve admin.html directly if requested
  app.get('/admin.html', (_req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.sendFile(adminPath);
    } else {
      res.status(404).send('admin.html not found');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
