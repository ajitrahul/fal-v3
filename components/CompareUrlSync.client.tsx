// components/CompareUrlSync.client.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { COMPARE_QS_KEY, parseCompareParam, serializeCompareParam, sameSet } from "@/lib/compare-url";

type Props = {
  /** Current selected tool slugs from your tray/page state */
  selected: string[];
  /** Update function in your tray/page state */
  onChange: (next: string[]) => void;
  /** Limit sync to /compare only (default) or allow global */
  scope?: "page" | "global";
  /** Optional explicit enable; otherwise uses env flag */
  enabled?: boolean;
};

/**
 * Syncs selection <-> URL query (?tools=) with zero visual impact.
 * Default OFF unless NEXT_PUBLIC_COMPARE_URL_SYNC=1 or enabled={true}.
 */
export default function CompareUrlSync({ selected, onChange, scope = "page", enabled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const envEnabled = process.env.NEXT_PUBLIC_COMPARE_URL_SYNC === "1";
  const isEnabled = enabled ?? envEnabled;

  const inScope = scope === "global" ? true : pathname?.startsWith("/compare");

  // Track last URL value we wrote to avoid loops
  const lastWritten = useRef<string | null>(null);

  const currentParam = useMemo(() => {
    const raw = searchParams?.get(COMPARE_QS_KEY) ?? null;
    return raw;
  }, [searchParams]);

  // 1) On mount/URL change: if URL has tools, load them into state
  useEffect(() => {
    if (!isEnabled || !inScope) return;

    const fromUrl = parseCompareParam(currentParam);
    if (fromUrl.length === 0) return;

    // Avoid pointless updates
    if (!sameSet(fromUrl, selected)) {
      onChange(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, inScope, currentParam]);

  // 2) When selection changes: write to URL (replace; no scroll)
  useEffect(() => {
    if (!isEnabled || !inScope) return;

    const serialized = serializeCompareParam(selected);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");

    if (serialized) sp.set(COMPARE_QS_KEY, serialized);
    else sp.delete(COMPARE_QS_KEY);

    const next = `${pathname}?${sp.toString()}`;

    // Avoid loop if we already wrote this exact value
    if (lastWritten.current === next) return;
    lastWritten.current = next;

    router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, inScope, selected, pathname]);
  
  return null;
}
