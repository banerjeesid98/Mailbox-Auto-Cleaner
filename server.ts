import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for Gmail User Profile
  app.get('/api/gmail/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Missing Authorization header' });
    }

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Google auth token expired or invalid' });
        }
        const errText = await response.text();
        return res.status(response.status).json({ error: 'GMAIL_API_ERROR', details: errText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Server proxy profile error:', err);
      return res.status(500).json({ error: 'PROXY_ERROR', message: err.message || 'Internal proxy error' });
    }
  });

  // Proxy endpoint for Searching Gmail Messages
  app.get('/api/gmail/messages/search', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Missing Authorization header' });
    }

    const query = (req.query.q as string) || '';
    const maxResults = (req.query.maxResults as string) || '100';
    const pageToken = (req.query.pageToken as string) || '';

    const gmailUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    gmailUrl.searchParams.set('q', query);
    gmailUrl.searchParams.set('maxResults', maxResults);
    if (pageToken) {
      gmailUrl.searchParams.set('pageToken', pageToken);
    }

    try {
      const response = await fetch(gmailUrl.toString(), {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Google auth token expired or invalid' });
        }
        const errText = await response.text();
        console.error(`Gmail search proxy error for query "${query}":`, errText);
        return res.status(response.status).json({ error: 'GMAIL_API_ERROR', details: errText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Server proxy search error:', err);
      return res.status(500).json({ error: 'PROXY_ERROR', message: err.message || 'Internal proxy error' });
    }
  });

  // Proxy endpoint for Message Details
  app.get('/api/gmail/messages/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Missing Authorization header' });
    }

    const { id } = req.params;
    const gmailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
    gmailUrl.searchParams.set('format', 'metadata');
    gmailUrl.searchParams.append('metadataHeaders', 'From');
    gmailUrl.searchParams.append('metadataHeaders', 'Subject');
    gmailUrl.searchParams.append('metadataHeaders', 'Date');

    try {
      const response = await fetch(gmailUrl.toString(), {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Google auth token expired or invalid' });
        }
        const errText = await response.text();
        return res.status(response.status).json({ error: 'GMAIL_API_ERROR', details: errText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error(`Server proxy details error for message ${id}:`, err);
      return res.status(500).json({ error: 'PROXY_ERROR', message: err.message || 'Internal proxy error' });
    }
  });

  // Proxy endpoint for Bulk Batch Message Details (returns real headers in parallel with controlled concurrency & 429 retries)
  app.post('/api/gmail/messages/batch-metadata', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Missing Authorization header' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json([]);
    }

    const targetIds = ids.slice(0, 500);

    // Controlled fetch with exponential backoff retry for 429 rate limits
    const fetchSingleMetadata = async (id: string, retries = 3): Promise<any> => {
      const gmailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
      gmailUrl.searchParams.set('format', 'metadata');
      gmailUrl.searchParams.append('metadataHeaders', 'From');
      gmailUrl.searchParams.append('metadataHeaders', 'Subject');
      gmailUrl.searchParams.append('metadataHeaders', 'Date');

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(gmailUrl.toString(), {
            headers: { Authorization: authHeader },
          });

          if (response.status === 429 || response.status === 403) {
            // Rate limit exceeded, wait briefly before retrying
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            continue;
          }

          if (!response.ok) {
            return null;
          }

          return await response.json();
        } catch {
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, 150));
          }
        }
      }
      return null;
    };

    try {
      const results: any[] = [];
      const CONCURRENCY = 15; // Max 15 concurrent requests to stay safely under Gmail quota

      for (let i = 0; i < targetIds.length; i += CONCURRENCY) {
        const chunk = targetIds.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(
          chunk.map((id: string) => fetchSingleMetadata(id))
        );
        chunkResults.forEach((resItem) => {
          if (resItem) results.push(resItem);
        });
      }

      return res.json(results);
    } catch (err: any) {
      console.error('Server proxy batch-metadata error:', err);
      return res.status(500).json({ error: 'PROXY_ERROR', message: err.message || 'Internal proxy error' });
    }
  });

  // Proxy endpoint for Trashing / Deleting Messages
  app.post('/api/gmail/messages/trash', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Missing Authorization header' });
    }

    const { ids, mode } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'INVALID_REQUEST', message: 'ids array is required' });
    }

    try {
      if (mode === 'permanent') {
        // Batch delete
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchDelete', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Google auth token expired or invalid' });
          }
          const errText = await response.text();
          return res.status(response.status).json({ error: 'GMAIL_API_ERROR', details: errText });
        }
        return res.json({ success: true, count: ids.length, mode: 'permanent' });
      } else {
        // Move to Trash using batchModify or loop
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids,
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX', 'UNREAD'],
          }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return res.status(401).json({ error: 'AUTH_EXPIRED', message: 'Google auth token expired or invalid' });
          }
          const errText = await response.text();
          return res.status(response.status).json({ error: 'GMAIL_API_ERROR', details: errText });
        }
        return res.json({ success: true, count: ids.length, mode: 'trash' });
      }
    } catch (err: any) {
      console.error('Server proxy trash error:', err);
      return res.status(500).json({ error: 'PROXY_ERROR', message: err.message || 'Internal proxy error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
