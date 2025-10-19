// app/api/submissions/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import os from "os";

// IMPORTANT: use Ajv 2020 to match your schema's $schema:"draft/2020-12"
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

type Body = {
  mode: "add" | "edit";
  email: string;
  slug?: string;
  payload: any;
};

function validEmail(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

/** Resolve a writable folder for pending files, with fallback to OS temp. */
async function resolvePendingDir(): Promise<string> {
  const primary = path.join(process.cwd(), ".tmp", "pending-submissions");
  try {
    await mkdir(primary, { recursive: true });
    return primary;
  } catch {
    const fallback = path.join(os.tmpdir(), "ai-tools-directory-v2", "pending-submissions");
    await mkdir(fallback, { recursive: true });
    return fallback;
  }
}

/** Health check: confirms route is mounted */
export async function GET() {
  return NextResponse.json(
    { ok: true, route: "/api/submissions", methods: ["POST"], note: "Health OK" },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  try {
    // 1) Parse body safely
    let body: Body | null = null;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body.", code: "BAD_BODY", hint: "Ensure Content-Type: application/json and valid JSON." },
        { status: 400 }
      );
    }

    // 2) Basic field checks
    if (!body?.email || !validEmail(body.email)) {
      return NextResponse.json(
        { error: "Valid E-Mail is required.", code: "BAD_EMAIL" },
        { status: 400 }
      );
    }
    if (!body?.payload || typeof body.payload !== "object") {
      return NextResponse.json(
        { error: "Missing payload.", code: "MISSING_PAYLOAD" },
        { status: 400 }
      );
    }
    if (body.mode === "edit" && !body.slug) {
      return NextResponse.json(
        { error: "Slug is required for edit mode.", code: "MISSING_SLUG" },
        { status: 400 }
      );
    }

    // 3) Load your JSON Schema (Draft 2020-12)
    const schemaPath = path.join(process.cwd(), "schemas", "tools-schema-2-updated.json");
    let schemaRaw = "";
    try {
      schemaRaw = await readFile(schemaPath, "utf8");
    } catch {
      return NextResponse.json(
        { error: "Schema file not found.", code: "SCHEMA_NOT_FOUND", hint: `Expected at ${schemaPath}` },
        { status: 500 }
      );
    }

    let schema: any = null;
    try {
      schema = JSON.parse(schemaRaw);
    } catch (e: any) {
      return NextResponse.json(
        { error: "Schema JSON is invalid.", code: "SCHEMA_PARSE_ERROR" },
        { status: 500 }
      );
    }

    // 4) Validate with Ajv 2020 (+ formats)
    let ajv: Ajv2020;
    try {
      ajv = new Ajv2020({ allErrors: true, strict: false });
      addFormats(ajv); // supports "uri", "email", "date-time", etc.
    } catch (e: any) {
      return NextResponse.json(
        { error: "AJV init failed.", code: "AJV_INIT_ERROR", hint: "Run `npm i ajv ajv-formats` and restart dev server." },
        { status: 500 }
      );
    }

    let validate;
    try {
      validate = ajv.compile(schema);
    } catch (e: any) {
      return NextResponse.json(
        { error: "Schema compile failed.", code: "AJV_COMPILE_ERROR", hint: String(e?.message || e) },
        { status: 500 }
      );
    }

    const ok = validate(body.payload);
    if (!ok) {
      return NextResponse.json(
        { error: "Schema validation failed.", code: "VALIDATION_ERROR", details: validate.errors },
        { status: 400 }
      );
    }

    // 5) Persist pending file (with fallback directory)
    const pendingDir = await resolvePendingDir();
    const id = Date.now() + "-" + (body.slug || body.payload?.slug || "new");
    const record = {
      id,
      when: new Date().toISOString(),
      mode: body.mode,
      email: body.email,
      slug: body.slug || body.payload?.slug || "",
      payload: body.payload,
      status: "pending",
      pendingDir,
    };

    await writeFile(path.join(pendingDir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");

    return NextResponse.json({ ok: true, id, status: "pending", pendingDir }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error in /api/submissions.", code: "UNCAUGHT", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
