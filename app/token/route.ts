import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { edgeConfigGet, edgeConfigPatch } from "../../lib/edgeConfig";

type TokenStatus = "active" | "disabled";

type StoredToken = {
  id: string;
  hash: string;
  status: TokenStatus;
  createdAt: string;
  expiresAt?: string;
};

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function json(status: number, data: unknown) {
  return NextResponse.json(data, { status });
}

function assertEnv() {
  if (!ADMIN_TOKEN) throw new Error("ADMIN_TOKEN 未配置");
}

function ensureAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length);
  return token === ADMIN_TOKEN;
}

async function upsertToken(item: StoredToken) {
  assertEnv();
  await edgeConfigPatch([
    {
      op: "upsert",
      key: `token:${item.id}`,
      value: item,
    },
  ]);
}

async function deleteToken(id: string) {
  assertEnv();
  await edgeConfigPatch([
    {
      op: "delete",
      key: `token:${id}`,
    },
  ]);
}

async function fetchToken(id: string): Promise<StoredToken | null> {
  assertEnv();
  return edgeConfigGet<StoredToken>(`token:${id}`);
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseTTL(body: any): number | undefined {
  const ttl = body?.ttlSeconds;
  if (ttl === undefined) return undefined;
  const n = Number(ttl);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("ttlSeconds 必须为正数");
  }
  return n;
}

export async function POST(req: NextRequest) {
  try {
    assertEnv();
    if (!ensureAdmin(req)) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const ttlSeconds = parseTTL(body);

    const plain =
      typeof body.token === "string" && body.token.length > 0
        ? body.token
        : crypto.randomBytes(32).toString("base64url");

    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt =
      ttlSeconds !== undefined
        ? new Date(now.getTime() + ttlSeconds * 1000).toISOString()
        : undefined;

    const stored: StoredToken = {
      id,
      hash: hashToken(plain),
      status: "active",
      createdAt: now.toISOString(),
      expiresAt,
    };

    await upsertToken(stored);

    // 返回明文 token，仅创建时可见
    return json(201, {
      id,
      token: plain,
      expiresAt,
      status: stored.status,
    });
  } catch (err: any) {
    return json(400, { error: err?.message ?? "unknown error" });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertEnv();
    if (!ensureAdmin(req)) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string;
    if (!id) return json(400, { error: "id 必填" });

    await deleteToken(id);
    return json(200, { ok: true });
  } catch (err: any) {
    return json(400, { error: err?.message ?? "unknown error" });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    assertEnv();
    if (!ensureAdmin(req)) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string;
    if (!id) return json(400, { error: "id 必填" });

    const token = await fetchToken(id);
    if (!token) return json(404, { error: "token 不存在" });

    const status: TokenStatus =
      body?.status === "disabled" ? "disabled" : "active";

    const updated: StoredToken = { ...token, status };
    await upsertToken(updated);

    return json(200, { id, status });
  } catch (err: any) {
    return json(400, { error: err?.message ?? "unknown error" });
  }
}

