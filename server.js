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

  // Extract doc ID from any Google Docs/Drive URL
  const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  const docId = idMatch ? idMatch[1] : null;
  const isGoogleDoc = url.includes('docs.google.com/document');

  if (!docId) {
    return res.status(400).json({ error: 'Could not extract document ID from URL. Make sure it\'s a Google Docs or Drive link.' });
  }

  // Try multiple export strategies in order
  const strategies = isGoogleDoc ? [
    `https://docs.google.com/document/d/${docId}/export?format=txt`,
    `https://docs.google.com/document/d/${docId}/export?format=html`,
    `https://docs.google.com/feeds/download/documents/export/Export?id=${docId}&exportFormat=txt`,
  ] : [
    `https://drive.google.com/uc?export=download&id=${docId}`,
    `https://drive.google.com/uc?id=${docId}&export=download`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/plain,text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  for (const exportUrl of strategies) {
    try {
      const upstream = await fetch(exportUrl, { headers, redirect: 'follow' });

      if (!upstream.ok) continue; // try next strategy

      const text = await upstream.text();

      // Clean HTML if needed
      const clean = text
        .replace(/<\/?(p|div|tr|td|th|li|h[1-6]|br|section|article)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (clean.length < 50) continue; // try next strategy

      // Check if we got an auth/login page instead of content
      if (clean.toLowerCase().includes('sign in') && clean.toLowerCase().includes('google') && clean.length < 2000) {
        continue;
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(clean);
    } catch (err) {
      console.error(`Strategy failed for ${exportUrl}:`, err.message);
      continue;
    }
  }

  // All strategies failed
  res.status(404).json({
    error: 'Could not fetch document. Make sure it\'s set to "Anyone with the link can view" in Google Drive sharing settings.'
  });
});


app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Overland Planner running on http://localhost:${PORT}`);
});
