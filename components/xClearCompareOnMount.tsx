"use client";

import { useEffect } from "react";

const STORAGE_KEY = "compare:list";

export default function ClearCompareOnMount() {
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "[]");
      window.dispatchEvent(new CustomEvent("compare:list:changed"));
    } catch {}
  }, []);
  return null;
}
