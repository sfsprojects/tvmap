export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, systemPrompt } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      return res.status(500).json({ error: data?.error?.message || 'Erreur Gemini' });
    }

    // Cherche le texte dans toute la structure de la réponse
    let text = '';
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.text) text += part.text;
        // gemini-2.5 peut aussi mettre le texte dans executableCode ou autre
        if (part.executableCode?.code) text += part.executableCode.code;
      }
    }

    // Log la structure pour debug
    if (!text) {
      return res.status(500).json({
        error: 'Réponse vide',
        candidates_count: candidates.length,
        first_candidate: JSON.stringify(candidates[0]).slice(0, 500)
      });
    }

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
