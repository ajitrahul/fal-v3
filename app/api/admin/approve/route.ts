// app/api/admin/approve/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile, rm } from "fs/promises";
import path from "path";
import crypto from "crypto";

/* ====================== Types ====================== */
type Body = {
  id: string;
  action: "approve" | "reject";
  note?: string;
};

type RepoInfo = {
  owner: string;
  repo: string;
  defaultBranch: string;
  toolsDir: string;
  token: string;
  botName?: string;
  botEmail?: string;
};

/* ====================== Email (no-op by default) ====================== */
async function sendMail(opts: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.RESEND_FROM || "";
  if (!apiKey || !from) {
    console.log("[email:no-op]", opts);
    return;
  }
  console.log("[email:stubbed]", opts);
}

/* ====================== Auth helpers ====================== */
function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s || "", "utf8").digest("hex");
}
function headerToken(req: Request): string {
  const direct = (req.headers.get("x-admin-token") || "").trim();
  if (direct) return direct;
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}
function isAuthorized(req: Request) {
  const envTok = (process.env.ADMIN_TOKEN || "").trim();
  const got = headerToken(req);
  return Boolean(envTok) && Boolean(got) && envTok === got;
}

/* ====================== GitHub helpers ====================== */
async function gh<T>(ri: RepoInfo, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ri.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

function getRepoInfo(): RepoInfo {
  const repoEnv = process.env.GITHUB_REPOSITORY || "";
  const [owner, name] = repoEnv.split("/");
  if (!owner || !name) throw new Error("GITHUB_REPOSITORY must be 'owner/repo'.");
  const token = process.env.GITHUB_TOKEN || "";
  if (!token) throw new Error("GITHUB_TOKEN is missing.");
  const defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || "main";
  const toolsDir = process.env.GITHUB_TOOLS_DIR || "data/tools";
  const botName = process.env.GITHUB_BOT_NAME;
  const botEmail = process.env.GITHUB_BOT_EMAIL;
  return { owner, repo: name, defaultBranch, toolsDir, token, botName, botEmail };
}

/** Robustly get a base SHA, trying env branch, then main, then master. */
async function getBaseShaAuto(
  ri: RepoInfo
): Promise<{ sha: string; branch: string; tried: string[] }> {
  const trials = Array.from(new Set([ri.defaultBranch, "main", "master"])).filter(Boolean);
  const tried: string[] = [];
  for (const b of trials) {
    tried.push(b);
    try {
      const data = await gh<{ name: string; commit: { sha: string } }>(
        ri,
        `/repos/${ri.owner}/${ri.repo}/branches/${encodeURIComponent(b)}`
      );
      if (data?.commit?.sha) return { sha: data.commit.sha, branch: b, tried };
    } catch {
      // try next
    }
  }
  throw new Error(`Could not resolve base branch SHA. Tried: ${tried.join(", ")}`);
}

async function ensureBranch(ri: RepoInfo, newBranch: string, fromSha: string) {
  await gh(
    ri,
    `/repos/${ri.owner}/${ri.repo}/git/refs`,
    { method: "POST", body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha }) }
  );
}

async function getFileOnBranch(
  ri: RepoInfo,
  filePath: string,
  branch: string
): Promise<{ sha: string } | null> {
  try {
    const data = await gh<{ sha: string }>(
      ri,
      `/repos/${ri.owner}/${ri.repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`
    );
    return { sha: (data as any).sha };
  } catch (e: any) {
    if (String(e?.message || "").includes("404")) return null;
    throw e;
  }
}

async function upsertFile(
  ri: RepoInfo,
  opts: { branch: string; filePath: string; content: string; message: string; sha?: string }
) {
  const body: any = {
    message: opts.message,
    content: Buffer.from(opts.content, "utf8").toString("base64"),
    branch: opts.branch,
  };
  if (ri.botName || ri.botEmail) {
    body.committer = { name: ri.botName || "AI Tools Bot", email: ri.botEmail || "bot@example.com" };
  }
  if (opts.sha) body.sha = opts.sha;

  await gh(
    ri,
    `/repos/${ri.owner}/${ri.repo}/contents/${encodeURIComponent(opts.filePath)}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
}

async function createPullRequest(
  ri: RepoInfo,
  opts: { head: string; base: string; title: string; body?: string }
): Promise<{ number: number; html_url: string }> {
  return gh<{ number: number; html_url: string }>(
    ri,
    `/repos/${ri.owner}/${ri.repo}/pulls`,
    { method: "POST", body: JSON.stringify({ title: opts.title, head: opts.head, base: opts.base, body: opts.body || "" }) }
  );
}

async function addPrLabel(ri: RepoInfo, prNumber: number, label: string) {
  await gh(
    ri,
    `/repos/${ri.owner}/${ri.repo}/issues/${prNumber}/labels`,
    { method: "POST", body: JSON.stringify({ labels: [label] }) }
  );
}

/* ====================== DEBUG GET ====================== */
/**
 * GET /api/admin/approve[?probe=github]
 * - without probe: shows token hash compare (no secret leak)
 * - with probe=github: verifies repo access & lists branches + default_branch
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe");

  const envTok = (process.env.ADMIN_TOKEN || "").trim();
  const hdrTok = headerToken(req);

  const base = {
    route: "/api/admin/approve",
    hasEnvToken: Boolean(envTok),
    envTokenLen: envTok.length,
    headerTokenLen: hdrTok.length,
    envTokenSha256: envTok ? sha256Hex(envTok) : null,
    headerTokenSha256: hdrTok ? sha256Hex(hdrTok) : null,
    equal: envTok && hdrTok ? sha256Hex(envTok) === sha256Hex(hdrTok) : false,
  };

  if (probe === "github") {
    try {
      const ri = getRepoInfo();
      const repoMeta = await gh<any>(ri, `/repos/${ri.owner}/${ri.repo}`);
      const branches = await gh<any[]>(
        ri,
        `/repos/${ri.owner}/${ri.repo}/branches?per_page=100`
      );
      return NextResponse.json({
        ...base,
        github: {
          ok: true,
          repository: `${ri.owner}/${ri.repo}`,
          envDefaultBranch: ri.defaultBranch,
          apiDefaultBranch: repoMeta?.default_branch || null,
          branchNames: (branches || []).map((b: any) => b?.name),
        },
      }, { status: 200 });
    } catch (e: any) {
      return NextResponse.json({ ...base, github: { ok: false, error: String(e?.message || e) } }, { status: 500 });
    }
  }

  return NextResponse.json(base, { status: 200 });
}

/* ====================== MAIN POST ====================== */
export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, action, note } = (await req.json()) as Body;
    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required." }, { status: 400 });
    }

    const pendingDir = path.join(process.cwd(), ".tmp", "pending-submissions");
    const file = path.join(pendingDir, `${id}.json`);

    let subRaw = "";
    try {
      subRaw = await readFile(file, "utf8");
    } catch {
      return NextResponse.json({ error: "Pending submission not found.", id }, { status: 404 });
    }
    const sub = JSON.parse(subRaw);

    if (action === "reject") {
      await sendMail({
        to: sub.email,
        subject: "AI Tools Directory — Submission Rejected",
        text: [
          `Your submission (${sub.slug}) was rejected.`,
          note ? `\n\nNote from admin:\n${note}` : ""
        ].join("")
      });
      try { await rm(file); } catch {}
      return NextResponse.json({ ok: true, status: "rejected" }, { status: 200 });
    }

    // APPROVE → create PR
    const ri = getRepoInfo();

    const slug: string = String(sub.slug || sub.payload?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Submission missing slug." }, { status: 400 });
    }

    // find base SHA with fallback (env -> main -> master)
    const { sha: baseSha, branch: baseBranch, tried } = await getBaseShaAuto(ri);

    const newBranch = `submission/${slug}/${Date.now()}`;
    await ensureBranch(ri, newBranch, baseSha);

    const filePath = path.posix.join(ri.toolsDir, `${slug}.json`);
    const existing = await getFileOnBranch(ri, filePath, baseBranch);
    const message = existing
      ? `chore(tools): update ${slug}.json from submission ${id}`
      : `chore(tools): add ${slug}.json from submission ${id}`;

    await upsertFile(ri, {
      branch: newBranch,
      filePath,
      content: JSON.stringify(sub.payload, null, 2) + "\n",
      message,
      sha: existing?.sha,
    });

    const prTitle = existing ? `Update tool: ${slug}` : `Add new tool: ${slug}`;
    const prBody = [
      "This PR was created automatically from a user submission.",
      `- Submission ID: \`${id}\``,
      `- Submitter email: \`${sub.email}\``,
      note ? `- Admin note: ${note}` : null,
      "",
      `Base branch used: ${baseBranch} (tried: ${tried.join(", ")})`,
      "",
      "Please review and merge when ready."
    ].filter(Boolean).join("\n");

    const pr = await createPullRequest(ri, {
      head: newBranch,
      base: baseBranch,
      title: prTitle,
      body: prBody,
    });

    const label = process.env.GITHUB_PR_LABEL || "tool-submission";
    try { await addPrLabel(ri, pr.number, label); } catch {}

    await sendMail({
      to: sub.email,
      subject: `AI Tools Directory — Submission Approved (PR #${pr.number})`,
      text: [
        `Your submission (${slug}) has been approved and opened as PR #${pr.number}.`,
        "",
        pr.html_url,
        "",
        "You will be notified when it’s merged."
      ].join("\n")
    });

    try { await rm(file); } catch {}

    return NextResponse.json(
      { ok: true, status: "approved", slug, pr_number: pr.number, pr_url: pr.html_url },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error.", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
