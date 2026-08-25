export interface ParsedCritique {
  scores: Record<string, number>;
  rationales: Record<string, string>;
  critiques: Record<string, string>;
  parseMode: 'json' | 'structured-lines' | 'none';
}

const MAX_SCORE = 10;

function clampScore(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(MAX_SCORE, Math.max(0, n));
  return Math.round(clamped * 100) / 100;
}

/** Strip markdown fences and prose around a JSON array, then parse it. */
function tryParseJson(raw: string): Array<Record<string, unknown>> | null {
  let text = raw.trim();
  // strip ```json ... ``` fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/,'');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
    if (parsed && Array.isArray((parsed as any).results)) return (parsed as any).results;
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a critic's response into per-submission scores.
 *
 * Security/robustness properties:
 * - Scores are clamped to [0, 10].
 * - Only submission indices in [1..expectedCount] are accepted.
 * - Duplicate entries for the same index keep the FIRST occurrence.
 * - Free-text elsewhere in the response cannot inject scores:
 *   structured fallback only matches lines that START with "Code N".
 * - No default/fabricated scores: unparsable responses yield empty maps
 *   so callers can surface an honest error instead of a fake ranking.
 */
export function parseCriticResponse(raw: string, expectedCount: number): ParsedCritique {
  const scores: Record<string, number> = {};
  const rationales: Record<string, string> = {};
  const critiques: Record<string, string> = {};

  const accept = (index: number, score: unknown, feedback: unknown): boolean => {
    if (!Number.isInteger(index) || index < 1 || index > expectedCount) return false;
    const clamped = clampScore(typeof score === 'number' ? score : Number(score));
    if (clamped === null) return false;
    const key = `code_${index}`;
    if (key in scores) return false; // first occurrence wins
    const fb = typeof feedback === 'string' && feedback.trim() ? feedback.trim() : '';
    scores[key] = clamped;
    rationales[key] = `Score: ${clamped}${fb ? ` - ${fb}` : ''}`;
    critiques[key] = fb || '(no feedback provided)';
    return true;
  };

  // 1) Strict JSON
  const jsonEntries = tryParseJson(raw);
  if (jsonEntries && jsonEntries.length > 0) {
    for (const entry of jsonEntries) {
      const idx = Number(entry?.code ?? entry?.['index'] ?? NaN);
      accept(idx, entry?.score, entry?.feedback);
    }
    if (Object.keys(scores).length > 0) {
      return { scores, rationales, critiques, parseMode: 'json' };
    }
  }

  // 2) Structured lines: "Code 1: 8 - feedback" / "Code 1: 8.5 - feedback"
  const lineRe = /^\s*(?:Code|Submission)\s*#?(\d+)\s*[:\-–]\s*(\d+(?:\.\d+)?)\s*(?:[-–—:]\s*)?(.*)$/i;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(lineRe);
    if (m) accept(parseInt(m[1], 10), parseFloat(m[2]), m[3]);
  }
  if (Object.keys(scores).length > 0) {
    return { scores, rationales, critiques, parseMode: 'structured-lines' };
  }

  // 3) Give up honestly
  return { scores: {}, rationales: {}, critiques: {}, parseMode: 'none' };
}
