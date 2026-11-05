import { NextResponse } from "next/server";
import { buildMarkdownZip } from "@/services/backup";

export const runtime = "nodejs";
export async function GET() {
  const zip = await buildMarkdownZip();
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="adminops-markdown-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
