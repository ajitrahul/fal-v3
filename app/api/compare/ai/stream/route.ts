import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt, buildUserPrompt, pickLite } from '@/lib/ai/compare';
import { DB } from '@/lib/data';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = (body?.ids || []).slice(0, 4);
    if (!ids.length) return NextResponse.json({ error: 'No tool ids provided' }, { status: 400 });

    const tools = DB.tools.filter(t => ids.includes(t.slug)).map(pickLite);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    const temperature = Number(process.env.GEMINI_TEMPERATURE || 0.3);
    const maxOutputTokens = Number(process.env.GEMINI_MAX_TOKENS || 1600);

    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: modelName });

    const sys = buildSystemPrompt();
    const user = buildUserPrompt(tools, 'markdown');

    const streamResult = await model.generateContentStream({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: user }] },
      ],
      generationConfig: { temperature, maxOutputTokens }
    });

    const encoder = new TextEncoder();

    const rs = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`\n\n**[Error streaming: ${String((e as any)?.message || e)}]**`));
        } finally {
          controller.close();
        }
      }
    });

    // Track request (non-blocking)
    try {
      fetch(`${process.env.SITE_URL || ''}/api/track`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'ai_compare_requested', ids, model: modelName, stream: true })
      });
    } catch {}

    return new Response(rs, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI stream failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
