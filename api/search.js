export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Clé API manquante' });

  const { query, systemPrompt } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Query manquante' });

  const prompt = (systemPrompt || '') + '\n\nRequête : ' + query;

  let rawText = '';
  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
        })
      }
    );

    rawText = await r.text();

    if (!r.ok) {
      return res.status(500).json({ error: 'Gemini error ' + r.status, raw: rawText.slice(0, 300) });
    }

    const data = JSON.parse(rawText);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text).map(p => p.text).join('');

    if (!text) {
      return res.status(500).json({ error: 'Texte vide', structure: JSON.stringify(data).slice(0, 500) });
    }

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message, raw: rawText.slice(0, 300) });
  }
}
