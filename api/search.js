export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

      if (response.status === 429 || response.status === 404) {
        lastError = `${model} → ${response.status}`;
        continue;
      }

      if (!response.ok) {
        return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini', model });
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => p.text).map(p => p.text).join('');

      if (!text) {
        return res.status(500).json({ error: 'Réponse vide', model, raw: data });
      }

      return res.status(200).json({ text, model });

    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  res.status(500).json({ error: 'Tous les modèles ont échoué', detail: lastError });
}
