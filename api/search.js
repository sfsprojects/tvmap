export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  // Essai 1 : avec googleSearch (web temps réel)
  // Essai 2 : sans googleSearch (connaissances internes) si le premier échoue
  const attempts = [
    { model: 'gemini-2.5-flash', useSearch: true },
    { model: 'gemini-2.5-flash', useSearch: false },
    { model: 'gemini-2.5-flash-lite', useSearch: false },
  ];

  for (const attempt of attempts) {
    try {
      const body = {
        contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\nRequête : ' + query }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      };
      if (attempt.useSearch) body.tools = [{ googleSearch: {} }];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );

      const data = await response.json();
      if (!response.ok) continue;

      const parts = data.candidates?.[0]?.content?.parts || [];
      if (!parts.length) continue;

      const allText = parts.filter(p => p.text).map(p => p.text).join('');
      if (!allText) continue;

      const match = allText.match(/\{[\s\S]*?"found"[\s\S]*\}/);
      const clean = match ? match[0] : allText.replace(/```json|```/g, '').trim();

      return res.status(200).json({ text: clean, usedSearch: attempt.useSearch, model: attempt.model });

    } catch(e) {
      continue;
    }
  }

  return res.status(500).json({ error: 'Tous les modèles ont échoué' });
}
