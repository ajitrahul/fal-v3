"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "compare:list";

/* -----------------------------------------------------------
   Tiny toast hub (no layout edit needed)
   - Creates a single container on first mount
   - Listens to "toast:show" events and renders ephemeral toasts
------------------------------------------------------------ */

function ensureToastHub() {
  if (typeof window === "undefined") return;

  // Avoid duplicate listeners/containers.
  if ((window as any).__toastHubReady) return;
  (window as any).__toastHubReady = true;

  // Create container
  const containerId = "toast-root";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    Object.assign(container.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      pointerEvents: "none",
    } as CSSStyleDeclaration);
    document.body.appendChild(container);
  }

  function showToast(message: string, ms = 2200) {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      pointerEvents: "auto",
      background: "rgba(17,17,17,0.95)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      fontSize: "12px",
      lineHeight: "1.3",
      boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
      opacity: "0",
      transition: "opacity 160ms ease",
      maxWidth: "80vw",
      textAlign: "center",
    } as CSSStyleDeclaration);

    container!.appendChild(toast);
    // fade in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });

    // fade out + remove
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, ms);
  }

  // Listen for app-wide "toast:show" events
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    if (typeof detail.message === "string" && detail.message) {
      showToast(detail.message, Number(detail.ms) || 2200);
    }
  };
  window.addEventListener("toast:show", handler);

  // If you ever need cleanup on full reload, the listener will be garbage collected
  // with the page; we just avoid removing it now to keep the hub global during SPA nav.
}

function toast(message: string, ms = 2200) {
  try {
    window.dispatchEvent(new CustomEvent("toast:show", { detail: { message, ms } }));
  } catch {}
}

/* -----------------------------------------------------------
   Compare storage helpers
------------------------------------------------------------ */

function readList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeList(arr: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(arr))));
    window.dispatchEvent(new CustomEvent("compare:list:changed"));
  } catch {}
}

/* -----------------------------------------------------------
   Component
------------------------------------------------------------ */

export default function CompareToggleInline({
  slug,
  size = 18,
  title = "Add to compare",
}: {
  slug: string;
  size?: number;
  title?: string;
}) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    // mount the toast hub once
    ensureToastHub();

    const refresh = () => setSelected(readList().includes(slug));
    refresh();
    window.addEventListener("compare:list:changed", refresh);
    return () => window.removeEventListener("compare:list:changed", refresh);
  }, [slug]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const list = readList();
      const i = list.indexOf(slug);

      // remove if already selected
      if (i >= 0) {
        list.splice(i, 1);
        writeList(list);
        setSelected(false);
        toast("Removed from Compare");
        return;
      }

      // enforce max 3
      if (list.length >= 3) {
        toast("You can compare up to 3 tools at a time.");
        return;
      }

      // add
      list.push(slug);
      writeList(list);
      setSelected(true);
      toast("Added to Compare");
    },
    [slug]
  );

  return (
    <button
      aria-label={title}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border bg-white transition ${
        selected ? "text-white bg-black hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"
      }`}
      style={{ width: size + 6, height: size + 6 }}
    >
      {/* icon */}
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        {selected ? (
          // checkmark
          <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        ) : (
          // compare/bookmark-ish outline
          <path
            fill="currentColor"
            d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM5 13l-2 2V5h16v8H5z"
          />
        )}
      </svg>
    </button>
  );
}
