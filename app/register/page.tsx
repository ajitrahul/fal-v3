// app/register/page.tsx
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account • Find AI List",
  description: "Sign up with your email and password.",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-zinc-400">
        Use your email and a strong password to get started.
      </p>

      <RegisterForm />
    </div>
  );
}
