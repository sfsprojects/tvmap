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

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    console.log('Finish reason:', candidate?.finishReason);
    console.log('Parts count:', parts.length);
    if (parts[0]?.text) console.log('First part (200):', parts[0].text.slice(0, 200));

    const allText = parts.filter(p => p.text).map(p => p.text).join('\n');

    if (!allText) {
      return res.status(500).json({
        error: 'Aucun texte',
        finish_reason: candidate?.finishReason,
        safety: candidate?.safetyRatings
      });
    }

    const match = allText.match(/\{[\s\S]*?"found"[\s\S]*\}/);
    const clean = match ? match[0] : allText.replace(/```json|```/g, '').trim();

    return res.status(200).json({ text: clean });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
