import { NextResponse } from "next/server";
import { readBackupFile } from "@/services/backup";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  try {
    const buf = await readBackupFile(name);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name.replace(/[^\w.-]/g, "_")}"` },
    });
  } catch {
    return new NextResponse("Introuvable", { status: 404 });
  }
}
