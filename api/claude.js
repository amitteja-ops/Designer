export default async function handler(req, res) {
  // CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    // Read as text first — handle non-JSON responses safely
    const raw = await response.text();

    let data;
    try { data = JSON.parse(raw); }
    catch(_) { return res.status(500).json({ error: `Anthropic returned non-JSON: ${raw.slice(0,200)}` }); }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || `Anthropic error ${response.status}: ${raw.slice(0,100)}`
      });
    }

    return res.status(200).json(data);

  } catch(e) {
    return res.status(500).json({ error: `Proxy error: ${e.message}` });
  }
}
