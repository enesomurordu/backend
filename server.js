const express = require('express');
const cors = require('cors');
const catalog = require('./catalog.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Only allow your Netlify site (and localhost for testing) to call this API.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8888')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));

// GET /api/programs -> catalog metadata for the Downloads page (no file URLs exposed)
app.get('/api/programs', (req, res) => {
  const publicList = catalog.map(({ id, name, cat, version, size, desc, updated }) => (
    { id, name, cat, version, size, desc, updated }
  ));
  res.json(publicList);
});

// GET /api/download/:id -> streams the file from GitHub, filename intact
app.get('/api/download/:id', async (req, res) => {
  const program = catalog.find(p => p.id === req.params.id);
  if (!program) {
    return res.status(404).json({ error: 'Program not found' });
  }

  try {
    const githubRes = await fetch(program.sourceUrl, {
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
        : {}
    });

    if (!githubRes.ok) {
      console.error(`GitHub fetch failed for ${program.id}: ${githubRes.status}`);
      return res.status(502).json({ error: 'Upstream file unavailable' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${program.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    if (githubRes.headers.get('content-length')) {
      res.setHeader('Content-Length', githubRes.headers.get('content-length'));
    }

    // Stream the response body straight through to the client.
    const reader = githubRes.body.getReader();
    req.on('close', () => reader.cancel().catch(() => {}));
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error(`Download proxy error for ${program.id}:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Foundry backend listening on ${PORT}`));
