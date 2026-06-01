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

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini' });
    }

    // Log complet pour debug
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    console.log('Parts count:', parts.length);
    console.log('Finish reason:', candidate?.finishReason);
    parts.forEach((p, i) => {
      console.log(`Part ${i} keys:`, Object.keys(p));
      if (p.text) console.log(`Part ${i} text (first 200):`, p.text.slice(0, 200));
    });

    // Collecte tout le texte de tous les parts
    const allText = parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('\n');

    if (!allText) {
      return res.status(500).json({ 
        error: 'Aucun texte trouvé',
        finish_reason: candidate?.finishReason,
        parts_count: parts.length,
        parts_keys: parts.map(p => Object.keys(p))
      });
    }

    // Extrait le JSON
    const match = allText.match(/\{[\s\S]*?"found"[\s\S]*?\}(?=\s*$|\s*```)/);
    const clean = match ? match[0] : allText.replace(/```json|```/g, '').trim();

    return res.status(200).json({ text: clean });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
