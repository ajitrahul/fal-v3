export function inferTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (/\b(gpt|llm|mistral|gemini|claude|llama)\b/.test(t)) tags.push("LLM");
  if (/\b(image|vision|multimodal|video)\b/.test(t)) tags.push("Vision");
  if (/\b(retrieval|rag|vector|embedding)\b/.test(t)) tags.push("RAG");
  if (/\b(funding|seed|series [a-d]|acquire|acquisition)\b/.test(t)) tags.push("Funding");
  if (/\b(benchmark|leaderboard|eval|mmlu|arena)\b/.test(t)) tags.push("Benchmarks");
  if (/\b(policy|regulation|eu ai act|law)\b/.test(t)) tags.push("Policy");
  return tags.slice(0, 2);
}
