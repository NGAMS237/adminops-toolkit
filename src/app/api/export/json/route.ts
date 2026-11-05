import { NextResponse } from "next/server";
import { buildJsonExport } from "@/services/backup";

export const runtime = "nodejs";
export async function GET() {
  const body = await buildJsonExport();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="adminops-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
