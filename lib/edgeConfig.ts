const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const EDGE_CONFIG_RW_TOKEN = process.env.EDGE_CONFIG_RW_TOKEN;

const BASE =
  process.env.VERCEL_EDGE_CONFIG_BASE ?? "https://api.vercel.com/v1/edge-config";

function assertEdgeConfigEnv() {
  if (!EDGE_CONFIG_ID || !EDGE_CONFIG_RW_TOKEN) {
    throw new Error("EDGE_CONFIG_ID 或 EDGE_CONFIG_RW_TOKEN 未配置");
  }
}

type EdgeConfigOp =
  | { op: "upsert"; key: string; value: unknown }
  | { op: "delete"; key: string };

export async function edgeConfigPatch(items: EdgeConfigOp[]) {
  assertEdgeConfigEnv();
  const res = await fetch(`${BASE}/${EDGE_CONFIG_ID}/items`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${EDGE_CONFIG_RW_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge Config PATCH 失败: ${res.status} ${text}`);
  }
}

export async function edgeConfigGet<T = unknown>(key: string): Promise<T | null> {
  assertEdgeConfigEnv();
  const res = await fetch(`${BASE}/${EDGE_CONFIG_ID}/item/${key}`, {
    headers: { Authorization: `Bearer ${EDGE_CONFIG_RW_TOKEN}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge Config GET 失败: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { value: T };
  return data.value;
}

