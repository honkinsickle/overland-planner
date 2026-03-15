import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(join(__dirname, 'public')));

// Proxy endpoint — keeps API key server-side
app.post('/api/plan', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  }

  const { system, messages, max_tokens } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 4000,
        system,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message || 'Anthropic API error' });
    }
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Server error contacting Anthropic API.' });
  }
});

// Google Drive proxy — bypasses browser CORS restrictions
app.get('/api/gdrive', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // Only allow Google domains
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('google.com')) {
      return res.status(400).json({ error: 'Only Google Drive/Docs URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OverlandPlanner/1.0)',
        'Accept': 'text/plain,text/html,*/*',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Google returned ${upstream.status}. Make sure the doc is set to "Anyone with the link can view".`
      });
    }

    const text = await upstream.text();
    // Strip any HTML if Google returned a page instead of plain text
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (clean.length < 50) {
      return res.status(403).json({ error: 'Document appears empty or access was denied. Set sharing to "Anyone with the link can view".' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.send(clean);
  } catch (err) {
    console.error('Drive proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch from Google Drive: ' + err.message });
  }
});


app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Overland Planner running on http://localhost:${PORT}`);
});
