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

// GET /api/download/:id -> streams binary/archive files safely from GitHub
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

    // Dosya türüne göre doğru başlıkları atıyoruz (RAR için octet-stream şarttır)
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${program.filename}"`);
    
    const contentLength = githubRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Binary dosyaları (rar, zip vb.) veri kaybı olmadan Buffer'a çevirip gönderiyoruz
    const arrayBuffer = await githubRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);

  } catch (err) {
    console.error(`Download proxy error for ${program.id}:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Foundry backend listening on ${PORT}`));
