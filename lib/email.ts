// lib/email.ts
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
  } = process.env as Record<string, string | undefined>;

  // If SMTP env is missing, skip sending (dev fallback)
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.warn("[email] SMTP not configured — returning dev fallback URL");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "Reset your password",
    text: `Click the link to reset your password: ${resetUrl}`,
    html: `
      <p>Click the button below to reset your password. This link expires in 60 minutes.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#000;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `,
  });

  return !!info.messageId;
}
