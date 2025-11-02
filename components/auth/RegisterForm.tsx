// components/auth/RegisterForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { registerSchema } from "@/lib/validators/auth";

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

export default function RegisterForm() {
  const isDark = useIsDarkFromEnv();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const submitBtnBase =
    "inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  const submitBtnLight =
    "bg-black text-white hover:bg-gray-800 focus:ring-black focus:ring-offset-white";
  const submitBtnDark =
    "bg-white text-black hover:bg-zinc-200 focus:ring-white focus:ring-offset-zinc-900";
  const btnClass = [submitBtnBase, isDark ? submitBtnDark : submitBtnLight].join(" ");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let parsed: z.infer<typeof registerSchema>;
    try {
      parsed = registerSchema.parse({
        name: name || undefined,
        email,
        password: pw,
        confirmPassword: pw2,
      });
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid input.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Could not create account.");
        setBusy(false);
        return;
      }

      // Auto-login after successful registration
      const login = await signIn("credentials", {
        email: parsed.email,
        password: parsed.password,
        redirect: true,
        callbackUrl: "/",
      });

      if ((login as any)?.error) {
        setError("Account created, but sign-in failed. Please try logging in.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name (optional)
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
          placeholder="Your name"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
          placeholder="At least 8 chars, mix of cases & a number"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
          placeholder="Repeat your password"
          required
        />
      </div>

      <button type="submit" disabled={busy} className={btnClass}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
