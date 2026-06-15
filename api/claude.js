// ── Universal Claude API proxy ────────────────────────────────────────
// Single endpoint for all Anthropic API calls from the CRM
// Handles CORS, keeps API key server-side, works for all features

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).set(CORS).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        'x-api-key':           process.env.ANTHROPIC_API_KEY,
        'anthropic-version':   '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).set(CORS).json({
        error: data.error?.message || `Anthropic API error ${response.status}`
      });
    }

    return res.status(200).set(CORS).json(data);

  } catch (e) {
    console.error('Claude proxy error:', e);
    return res.status(500).set(CORS).json({ error: e.message });
  }
}
