const API_KEY = process.env.EXPO_PUBLIC_PERSPECTIVE_API_KEY;
const TOXICITY_THRESHOLD = 0.75;

export async function checkToxicity(text: string): Promise<{ flagged: boolean; score: number }> {
  if (!API_KEY || !text.trim()) return { flagged: false, score: 0 };
  try {
    const res = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          languages: ['en'],
          requestedAttributes: { TOXICITY: {} },
        }),
      }
    );
    if (!res.ok) return { flagged: false, score: 0 };
    const data = await res.json();
    const score: number = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
    return { flagged: score >= TOXICITY_THRESHOLD, score };
  } catch {
    return { flagged: false, score: 0 };
  }
}
