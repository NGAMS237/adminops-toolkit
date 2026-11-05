import { NextResponse } from "next/server";
import { fileStore, storage } from "@/storage";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await storage.attachments.get(id);
  if (!a) return new NextResponse("Introuvable", { status: 404 });
  let buf: Buffer;
  try {
    buf = await fileStore.read(a.storedName);
  } catch {
    return new NextResponse("Fichier manquant sur le disque", { status: 404 });
  }
  const inlineOk = /^(image\/(png|jpeg)|application\/pdf)/.test(a.mime) && new URL(req.url).searchParams.get("download") !== "1";
  const name = encodeURIComponent(a.filename);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": a.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inlineOk ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=300",
    },
  });
}
