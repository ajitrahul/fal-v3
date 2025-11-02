// app/forgot-password/page.tsx
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password • Find AI List",
  description: "Request a password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-zinc-400">
        Enter your email and we’ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
