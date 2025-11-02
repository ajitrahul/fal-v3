// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { credentialsSchema } from "@/lib/validators/auth";

const ENV_THEME = (process.env.NEXT_PUBLIC_TOOLCARD_THEME || "auto").toLowerCase();

function useIsDarkFromEnv() {
  const [isDark] = useState<boolean>(() => {
    if (ENV_THEME === "dark") return true;
    if (ENV_THEME === "light") return false;
    if (typeof document !== "undefined")
      return document.documentElement.classList.contains("dark");
    return false;
  });
  return isDark;
}

export default function LoginForm() {
  const isDark = useIsDarkFromEnv();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const googleBtnBase =
    "inline-flex h-10 w-full items-center justify-center gap-3 rounded-md border px-4 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const googleBtnLight =
    "bg-white text-[#3c4043] border-[#dadce0] hover:shadow-md focus:ring-[#1a73e8] focus:ring-offset-white";
  const googleBtnDark =
    "bg-black text-white border-[#3c4043] hover:shadow-md focus:ring-white focus:ring-offset-zinc-900";

  const submitBtnBase =
    "inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const submitBtnLight =
    "bg-black text-white hover:bg-gray-800 focus:ring-black focus:ring-offset-white";
  const submitBtnDark =
    "bg-white text-black hover:bg-zinc-200 focus:ring-white focus:ring-offset-zinc-900";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let parsed;
    try {
      parsed = credentialsSchema.parse({ email, password });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid input.");
      return;
    }

    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: parsed.email,
        password: parsed.password,
        redirect: true,
        callbackUrl: "/",
      });
      if (res?.error) {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Google */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className={[googleBtnBase, isDark ? googleBtnDark : googleBtnLight].join(" ")}
        aria-label="Sign in with Google"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#EA4335" d="M9 7.2v3.6h4.99C13.74 12.75 11.64 14.4 9 14.4A5.4 5.4 0 1 1 9 3.6c1.46 0 2.79.56 3.8 1.47l2.54-2.54A9 9 0 1 0 9 18c4.86 0 8.82-3.51 8.82-8.55 0-.57-.06-1.11-.15-1.65H9Z"/>
          <path fill="#34A853" d="M1.98 5.49a8.4 8.4 0 0 0 0 7.02l2.94-2.28a5.4 5.4 0 0 1 0-2.46L1.98 5.49Z"/>
          <path fill="#FBBC05" d="M1.98 12.51A9 9 0 0 0 9 18c2.64 0 4.74-1.65 4.99-3.6H9v-3.6H4.92l-2.94 2.71Z"/>
          <path fill="#4285F4" d="M13.8 5.07A5.4 5.4 0 0 0 9 3.6v3.6h8.67c.09.54.15 1.08.15 1.65 0 .57-.07 1.11-.15 1.65H9V7.2h4.99c-.13-.75-.51-1.5-1.19-2.13Z"/>
        </svg>
        <span className="text-sm font-medium">Sign in with Google</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-400">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
      </div>

      {/* Email & Password */}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <a href="/forgot-password" className="text-xs underline hover:opacity-80">Forgot password?</a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className={[submitBtnBase, isDark ? submitBtnDark : submitBtnLight].join(" ")}
        >
          {busy ? "Signing in…" : "Sign in with Email"}
        </button>
      </form>

      <p className="text-xs text-gray-500 dark:text-zinc-400">
        By continuing, you agree to our Terms and acknowledge our Privacy Policy.
      </p>
    </div>
  );
}
