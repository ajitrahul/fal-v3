// app/reset-password/page.tsx
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password • Find AI List",
  description: "Choose a new password.",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const token = searchParams?.token || "";
  const email = searchParams?.email || "";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-zinc-400">
        Enter your new password below.
      </p>
      <ResetPasswordForm token={token} emailDefault={email} />
    </div>
  );
}
