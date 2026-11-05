"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { storage } from "@/storage";
import { deleteAttachment } from "@/services/attachments";
import { createLab, deleteLab, duplicateLab, importProcedureCommands, setArchived, updateLab } from "@/services/labs";
import { duplicateProcedure, parseProcedureInput } from "@/services/procedures";
import { saveSettings } from "@/services/settings";
import { listBackupFiles, readBackupFile, restoreBackup, saveBackupFile } from "@/services/backup";
import { equipmentSchema } from "@/services/schemas";
import { fileStore } from "@/storage";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof ZodError) return { ok: false, error: e.issues.map((i) => i.message).join(" · ") };
  return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
}
const refresh = () => revalidatePath("/", "layout");

/* ---------------- Laboratoires ---------------- */
export async function createLabAction(data: { title: string; category: string }) {
  let id: string;
  try {
    const lab = await createLab({ title: data.title, category: data.category });
    id = lab.id;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/labs/${id}/edit`);
}

export async function saveLabAction(id: string, data: unknown): Promise<Result<{ savedAt: string }>> {
  try {
    await updateLab(id, data);
    refresh();
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateLabAction(id: string) {
  const copy = await duplicateLab(id);
  refresh();
  redirect(`/labs/${copy.id}/edit`);
}
export async function archiveLabAction(id: string, archived: boolean) {
  await setArchived(id, archived);
  refresh();
}
export async function deleteLabAction(id: string) {
  await deleteLab(id);
  refresh();
  redirect("/labs");
}

/* ---------------- Procédures ---------------- */
export async function createProcedureAction(data: { title: string; category: string; platform?: string; isTemplate?: boolean }) {
  let id: string;
  try {
    const p = await storage.procedures.create(parseProcedureInput({ ...data, commands: [] }));
    id = p.id;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/procedures/${id}/edit`);
}
export async function saveProcedureAction(id: string, data: unknown): Promise<Result<{ savedAt: string }>> {
  try {
    await storage.procedures.update(id, parseProcedureInput(data));
    refresh();
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}
export async function duplicateProcedureAction(id: string, fromTemplate = false) {
  const copy = await duplicateProcedure(id, fromTemplate);
  refresh();
  redirect(`/procedures/${copy.id}/edit`);
}
export async function deleteProcedureAction(id: string) {
  const p = await storage.procedures.get(id);
  if (p) {
    await storage.procedures.delete(id);
    for (const a of p.attachments) await fileStore.remove(a.storedName);
  }
  refresh();
  redirect("/procedures");
}
export async function linkProcedureToLabAction(labId: string, procedureId: string): Promise<Result> {
  try {
    const lab = await storage.labs.get(labId);
    if (!lab) throw new Error("Laboratoire introuvable.");
    if (!lab.procedures.some((p) => p.id === procedureId)) {
      await updateLab(labId, {
        ...lab,
        addressRows: lab.addressRows, commands: lab.commands,
        equipmentIds: lab.equipment.map((e) => e.id),
        procedureIds: [...lab.procedures.map((p) => p.id), procedureId],
      });
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function importProcedureCommandsAction(labId: string, procedureId: string): Promise<Result> {
  try {
    const p = await storage.procedures.get(procedureId);
    if (!p) throw new Error("Procédure introuvable.");
    await importProcedureCommands(labId, p);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Inventaire ---------------- */
export async function saveEquipmentAction(id: string | null, data: unknown): Promise<Result<{ id: string }>> {
  try {
    const input = equipmentSchema.parse(data);
    const e = id ? await storage.equipment.update(id, input) : await storage.equipment.create(input);
    refresh();
    return { ok: true, id: e.id };
  } catch (e) {
    return fail(e);
  }
}
export async function deleteEquipmentAction(id: string) {
  await storage.equipment.delete(id);
  refresh();
  redirect("/inventory");
}

/* ---------------- Pièces jointes ---------------- */
export async function deleteAttachmentAction(id: string): Promise<Result> {
  try {
    await deleteAttachment(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function updateAttachmentAction(id: string, data: { kind?: string; caption?: string }): Promise<Result> {
  try {
    await storage.attachments.update(id, data);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- Paramètres / sauvegardes ---------------- */
export async function saveSettingsAction(data: { organization: string; author: string; footerText: string }): Promise<Result> {
  try {
    await saveSettings(data);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
export async function createBackupAction(): Promise<Result<{ name: string; size: number }>> {
  try {
    const r = await saveBackupFile();
    refresh();
    return { ok: true, ...r };
  } catch (e) {
    return fail(e);
  }
}
export async function restoreLocalBackupAction(name: string): Promise<Result<{ labs: number; files: number }>> {
  try {
    const known = (await listBackupFiles()).some((b) => b.name === name);
    if (!known) throw new Error("Sauvegarde introuvable.");
    const r = await restoreBackup(await readBackupFile(name));
    refresh();
    return { ok: true, ...r };
  } catch (e) {
    return fail(e);
  }
}
