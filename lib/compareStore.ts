// lib/compareStore.ts
"use client";

const KEY = "compareIds"; // store slugs

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {}
  return [];
}

function write(arr: string[]) {
  localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("compare:changed"));
}

export function getCompareIds(): string[] {
  return read();
}

export function getCompareSlugs(): string[] {
  return read();
}

export function getCompareCount(): number {
  return read().length;
}

export function isInCompare(slug: string): boolean {
  return read().includes(slug);
}

export function addCompareId(slug: string): boolean {
  const cur = read();
  if (cur.includes(slug)) return true;
  if (cur.length >= 3) return false;
  cur.push(slug);
  write(cur);
  return true;
}

export function removeCompareId(slug: string) {
  const cur = read().filter((x) => x !== slug);
  write(cur);
}

export function clearCompare() {
  write([]);
}
