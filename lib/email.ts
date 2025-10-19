// lib/email.ts
type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // No-op fallback for local/dev if not configured
    console.log("[email:no-op]", mail);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "no-reply@yourdomain.com",
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
    });
  } catch (e) {
    console.error("[email:error]", e);
  }
}
