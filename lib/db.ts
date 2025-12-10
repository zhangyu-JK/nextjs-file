import { createClient, type Client } from "@libsql/client";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

function assertDbEnv() {
  if (!TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  if (!TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
}

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  assertDbEnv();
  client = createClient({
    url: TURSO_DATABASE_URL!,
    authToken: TURSO_AUTH_TOKEN!,
  });
  return client;
}

