import { put } from "@vercel/blob";
import { getEnv } from "@/lib/env";

export async function putMp3(opts: { pathname: string; bytes: Uint8Array }) {
  const env = getEnv();
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const res = await put(opts.pathname, Buffer.from(opts.bytes), {
    access: "public",
    contentType: "audio/mpeg",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return res.url;
}

