// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { forgotSchema } from "@/lib/validators/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const TOKEN_BYTES = 32;
const TTL_MINUTES = 60;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues?.[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 to avoid account enumeration
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Create token
    const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = sha256Hex(raw);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    // Invalidate prior tokens for this user (optional hardening)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Build reset URL
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(
      raw
    )}&email=${encodeURIComponent(email)}`;

    const sent = await sendPasswordResetEmail(email, resetUrl);

    // In dev or without SMTP, return URL so you can click it
    if (!sent && process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, devResetUrl: resetUrl });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { message: "Unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
