export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [{ google_search: {} }],
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\nRequête : ' + query }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini', raw: data });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    if (!text) {
      return res.status(500).json({ error: 'Pas de réponse IA', raw: data });
    }

    res.status(200).json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
