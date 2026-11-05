import { NextResponse } from "next/server";
import { saveUpload, extOf } from "@/services/attachments";
import { storage } from "@/storage";
import { parseProcedureInput } from "@/services/procedures";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/** POST multipart : files[], labId?, procedureId?, kind?, mode? ("procedure" : crée une procédure depuis .txt/.md) */
export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const labId = (form.get("labId") as string) || null;
  const procedureId = (form.get("procedureId") as string) || null;
  const kind = (form.get("kind") as string) || undefined;
  const mode = form.get("mode") as string | null;
  if (!files.length) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (labId && !(await storage.labs.get(labId))) return NextResponse.json({ error: "Laboratoire introuvable." }, { status: 404 });
  if (procedureId && !(await storage.procedures.get(procedureId))) return NextResponse.json({ error: "Procédure introuvable." }, { status: 404 });

  const results: { name: string; ok: boolean; error?: string; id?: string; url?: string; procedureId?: string }[] = [];
  for (const f of files) {
    try {
      const buffer = Buffer.from(await f.arrayBuffer());
      const ext = extOf(f.name);
      if (mode === "procedure" && (ext === ".txt" || ext === ".md")) {
        const text = buffer.toString("utf8");
        const heading = /^#\s+(.+)$/m.exec(text)?.[1];
        const proc = await storage.procedures.create(parseProcedureInput({
          title: (heading ?? f.name.replace(/\.[^.]+$/, "")).slice(0, 200), category: "reseau", platform: "autre",
          description: "Importée depuis " + f.name, content: text.slice(0, 200000), commands: [],
        }));
        results.push({ name: f.name, ok: true, procedureId: proc.id });
        continue;
      }
      const att = await saveUpload({ name: f.name, buffer, labId, procedureId, kind });
      results.push({ name: f.name, ok: true, id: att.id, url: `/api/attachments/${att.id}` });
    } catch (e) {
      results.push({ name: f.name, ok: false, error: e instanceof Error ? e.message : "Erreur" });
    }
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ results }, { status: results.some((r) => r.ok) ? 200 : 400 });
}
