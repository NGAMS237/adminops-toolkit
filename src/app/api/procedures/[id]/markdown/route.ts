import { NextResponse } from "next/server";
import { storage } from "@/storage";
import { procedureToMarkdown, slug } from "@/services/markdown-export";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await storage.procedures.get(id);
  if (!p) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(procedureToMarkdown(p), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${slug(p.title)}.md"` },
  });
}
