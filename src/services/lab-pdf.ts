import type { Lab } from "@/domain/types";
import { generateLabPdf } from "@/pdf/lab-report";
import { fileStore, storage } from "@/storage";
import { getSettings } from "./settings";

/** Assemble les données (réglages, procédures liées, images) puis génère le PDF A4. */
export async function buildLabPdf(lab: Lab): Promise<Buffer> {
  const settings = await getSettings();
  const procedures = (await Promise.all(lab.procedures.map((p) => storage.procedures.get(p.id)))).filter((p) => !!p);
  const images = new Map<string, Buffer>();
  for (const a of lab.attachments) {
    if (!/\.(png|jpe?g)$/i.test(a.filename)) continue;
    try { images.set(a.id, await fileStore.read(a.storedName)); } catch { /* fichier manquant : ignoré */ }
  }
  // images collées dans les procédures liées
  for (const p of procedures) for (const a of p!.attachments) {
    if (/\.(png|jpe?g)$/i.test(a.filename)) { try { images.set(a.id, await fileStore.read(a.storedName)); } catch { /* ignoré */ } }
  }
  return generateLabPdf(lab, { ...settings, procedures: procedures as NonNullable<(typeof procedures)[number]>[], images });
}
