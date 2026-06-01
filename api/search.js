export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\nRequête : ' + query }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini' });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const allText = parts.filter(p => p.text).map(p => p.text).join('');

    if (!allText) {
      return res.status(500).json({ error: 'Réponse vide' });
    }

    const match = allText.match(/\{[\s\S]*?"found"[\s\S]*\}/);
    const clean = match ? match[0] : allText.replace(/```json|```/g, '').trim();

    return res.status(200).json({ text: clean });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
