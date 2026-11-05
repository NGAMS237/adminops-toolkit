import { NextResponse } from "next/server";
import { storage } from "@/storage";
import { buildLabPdf } from "@/services/lab-pdf";
import { slug } from "@/services/markdown-export";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lab = await storage.labs.get(id);
  if (!lab) return new NextResponse("Laboratoire introuvable", { status: 404 });
  try {
    const pdf = await buildLabPdf(lab);
    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${slug(lab.title)}-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Erreur génération PDF", e);
    return NextResponse.json({ error: "Échec de la génération du PDF : " + (e instanceof Error ? e.message : "inconnue") }, { status: 500 });
  }
}
