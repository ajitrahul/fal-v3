// lib/ai/json.ts
export function tryParseJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // try to trim code fences if present
    const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }
}
