// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Server-side NextAuth session helper
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type GETQuery = {
  searchParams?: {
    toolSlug?: string;
    page?: string;
    perPage?: string;
  };
};

// GET: list comments for a tool (public)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const toolSlug = url.searchParams.get("toolSlug");
    const page = Number(url.searchParams.get("page") || "1");
    const perPage = Math.min(50, Number(url.searchParams.get("perPage") || "20"));

    if (!toolSlug) return NextResponse.json({ error: "toolSlug is required" }, { status: 400 });

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { toolSlug, isApproved: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          toolSlug: true,
          userId: true,
          author: true,
          body: true,
          createdAt: true,
        },
      }),
      prisma.comment.count({ where: { toolSlug, isApproved: true } }),
    ]);

    return NextResponse.json({ comments, total, page, perPage });
  } catch (err) {
    console.error("GET /api/comments error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: create a comment (auth required)
export async function POST(request: Request) {
  try {
    // enforce session (auth-only)
    const session = await getServerSession(authOptions as any);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // prefer using a stable user id field (depends on your NextAuth session)
    // expecting session.user.id to be string and present
    const userId = (session.user as any).id ?? (session.user as any).sub ?? null;
    const author = (session.user as any).name ?? (session.user as any).email ?? null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized — no user id in session" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const toolSlug = String(body?.toolSlug ?? "").trim();
    const text = String(body?.body ?? "").trim();

    if (!toolSlug || !text) {
      return NextResponse.json({ error: "toolSlug and body are required" }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });
    }

    // basic sanitization: strip control chars
    const clean = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").slice(0, 2000);

    const comment = await prisma.comment.create({
      data: {
        toolSlug,
        body: clean,
        author: author ?? null,
        userId,
        isApproved: true, // auto-approve - change later if moderation desired
      },
      select: {
        id: true,
        toolSlug: true,
        author: true,
        body: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/comments error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
