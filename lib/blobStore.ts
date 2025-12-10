import { del, list, put, type PutBlobResult } from "@vercel/blob";

type PutBody = Parameters<typeof put>[1];

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function assertBlobEnv() {
  if (!BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN 未配置");
  }
}

function toPutBody(data: Blob | ArrayBuffer | ArrayBufferView | string): PutBody {
  if (typeof data === "string") {
    return Buffer.from(data);
  }
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(
      data.buffer,
      data.byteOffset,
      data.byteLength
    );
  }
  throw new Error("不支持的上传数据类型");
}

export async function uploadBlob(
  pathname: string,
  data: Blob | ArrayBuffer | ArrayBufferView | string
): Promise<PutBlobResult> {
  assertBlobEnv();
  const res = await put(pathname, toPutBody(data), {
    access: "public",
    token: BLOB_READ_WRITE_TOKEN,
  });
  return res;
}

export async function deleteBlob(pathname: string) {
  assertBlobEnv();
  await del(pathname, { token: BLOB_READ_WRITE_TOKEN });
}

export async function listBlobs(prefix?: string) {
  assertBlobEnv();
  return list({ token: BLOB_READ_WRITE_TOKEN, prefix });
}

