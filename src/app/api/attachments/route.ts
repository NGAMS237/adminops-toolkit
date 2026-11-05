import { NextResponse } from "next/server";
import { storage } from "@/storage";

export const runtime = "nodejs";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const labId = sp.get("labId") ?? undefined;
  const procedureId = sp.get("procedureId") ?? undefined;
  if (!labId && !procedureId) return NextResponse.json([], { status: 400 });
  return NextResponse.json(await storage.attachments.list({ labId, procedureId }));
}
