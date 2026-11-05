import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { restoreBackup } from "@/services/backup";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier." }, { status: 400 });
  try {
    const r = await restoreBackup(Buffer.from(await file.arrayBuffer()));
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec de la restauration" }, { status: 400 });
  }
}
