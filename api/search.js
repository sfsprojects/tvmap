export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [{ googleSearch: {} }],
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

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini', status: response.status });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];

    let text = '';
    for (const part of parts) {
      if (part.text && part.text.includes('"found"')) {
        text = part.text;
        break;
      }
    }
    if (!text) {
      for (const part of parts) {
        if (part.text) { text = part.text; break; }
      }
    }

    if (!text) {
      return res.status(500).json({ error: 'Réponse vide', parts_count: parts.length });
    }

    const match = text.match(/\{[\s\S]*?"found"[\s\S]*\}/);
    const clean = match ? match[0] : text.replace(/```json|```/g, '').trim();

    return res.status(200).json({ text: clean });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(500).json({ error: 'Délai dépassé — réessayez avec une recherche plus courte.' });
    }
    return res.status(500).json({ error: err.message });
  }
}
