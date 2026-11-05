import { NextResponse } from "next/server";
import { buildBackupZip } from "@/services/backup";

export const runtime = "nodejs";
/** Télécharge une sauvegarde complète (données + pièces jointes). */
export async function GET() {
  const zip = await buildBackupZip();
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="adminops-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
