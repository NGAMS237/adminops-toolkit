import { storage } from "@/storage";
import { procedureSchema } from "./schemas";
import { duplicateAttachment } from "./attachments";

export const parseProcedureInput = (raw: unknown) => procedureSchema.parse(raw);

export async function duplicateProcedure(id: string, asTemplate = false) {
  const src = await storage.procedures.get(id);
  if (!src) throw new Error("Procédure introuvable.");
  const copy = await storage.procedures.create({
    title: asTemplate ? src.title.replace(/^\[Modèle\]\s*/i, "") : `${src.title} (copie)`,
    category: src.category, platform: src.platform, description: src.description, content: src.content,
    tags: src.tags, isTemplate: false,
    commands: src.commands.map(({ id: _i, position: _p, ...c }) => c),
  });
  for (const a of src.attachments) await duplicateAttachment(a, { procedureId: copy.id });
  return copy;
}
