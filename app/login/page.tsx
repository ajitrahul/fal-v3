// app/login/page.tsx
import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export const metadata = {
  title: "Login • Find AI List",
  description: "Sign in with Google or email & password.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-zinc-400">
        Sign in using Google or your email and password.
      </p>

      <LoginForm />

      <div className="mt-6 text-sm text-gray-600 dark:text-zinc-400">
        Don’t have an account?{" "}
        <Link href="/register" className="underline hover:opacity-80">
          Create one
        </Link>
        .
      </div>
    </div>
  );
}
