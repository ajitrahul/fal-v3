// lib/url.ts
export type QDict = Record<string, string | string[] | undefined>;

export function getStr(q: QDict, key: string, d = ""): string {
  const v = q[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] || d;
  return d;
}

export function getArr(q: QDict, key: string): string[] {
  const v = q[key];
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap((x) => String(x).split(",")).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function setParam(u: URL, key: string, value?: string | string[]) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    u.searchParams.delete(key);
  } else if (Array.isArray(value)) {
    u.searchParams.set(key, value.join(","));
  } else {
    u.searchParams.set(key, value);
  }
}
