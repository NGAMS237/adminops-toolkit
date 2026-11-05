import AdmZip from "adm-zip";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DataDump } from "@/domain/types";
import { fileStore, storage } from "@/storage";
import { attachmentExportName, inventoryToMarkdown, labToMarkdown, procedureToMarkdown, slug } from "./markdown-export";

export const backupDir = () => path.resolve(process.cwd(), "./data/backups");

interface ZipSink {
  append(data: Buffer | string, opts: { name: string }): void;
}
async function zipToBuffer(build: (a: ZipSink) => Promise<void>): Promise<Buffer> {
  const zip = new AdmZip();
  await build({
    append: (data, { name }) => zip.addFile(name, Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8")),
  });
  return zip.toBuffer();
}

/** Sauvegarde complète : data.json + fichiers joints. */
export async function buildBackupZip(): Promise<Buffer> {
  const dump = await storage.dump();
  return zipToBuffer(async (a) => {
    a.append(JSON.stringify(dump, null, 2), { name: "data.json" });
    for (const att of await storage.attachments.list()) {
      if (await fileStore.exists(att.storedName)) a.append(await fileStore.read(att.storedName), { name: `uploads/${att.storedName}` });
    }
  });
}

export async function buildJsonExport(): Promise<string> {
  return JSON.stringify(await storage.dump(), null, 2);
}

/** Export Markdown : un fichier par laboratoire / procédure + inventaire + pièces jointes. */
export async function buildMarkdownZip(): Promise<Buffer> {
  const labs = (await Promise.all((await storage.labs.list()).map((l) => storage.labs.get(l.id)))).filter(Boolean);
  const procs = (await Promise.all((await storage.procedures.list()).map((p) => storage.procedures.get(p.id)))).filter(Boolean);
  const equipment = await storage.equipment.list();
  return zipToBuffer(async (a) => {
    for (const lab of labs) {
      if (!lab) continue;
      const dir = `laboratoires/${slug(lab.title)}-${lab.id.slice(-4)}`;
      a.append(labToMarkdown(lab), { name: `${dir}/README.md` });
      for (const att of lab.attachments) {
        if (await fileStore.exists(att.storedName)) a.append(await fileStore.read(att.storedName), { name: `${dir}/attachments/${attachmentExportName(att)}` });
      }
    }
    for (const p of procs) {
      if (!p) continue;
      const dir = `procedures`;
      a.append(procedureToMarkdown(p), { name: `${dir}/${slug(p.title)}-${p.id.slice(-4)}.md` });
    }
    a.append(inventoryToMarkdown(equipment), { name: "inventaire.md" });
  });
}

export async function saveBackupFile(): Promise<{ name: string; size: number }> {
  await fs.mkdir(backupDir(), { recursive: true });
  const buf = await buildBackupZip();
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const name = `adminops-backup-${stamp}.zip`;
  await fs.writeFile(path.join(backupDir(), name), buf);
  return { name, size: buf.length };
}

export async function listBackupFiles() {
  try {
    const names = (await fs.readdir(backupDir())).filter((n) => n.endsWith(".zip")).sort().reverse();
    return Promise.all(names.map(async (name) => {
      const st = await fs.stat(path.join(backupDir(), name));
      return { name, size: st.size, date: st.mtime };
    }));
  } catch {
    return [];
  }
}

export async function readBackupFile(name: string) {
  const safe = path.basename(name);
  if (!/^[\w.-]+\.zip$/.test(safe)) throw new Error("Nom de sauvegarde invalide.");
  return fs.readFile(path.join(backupDir(), safe));
}

const MAX_TOTAL = 2 * 1024 * 1024 * 1024;

/** Restauration : remplace TOUTES les données. Une sauvegarde de sécurité est créée avant. */
export async function restoreBackup(buf: Buffer): Promise<{ labs: number; files: number }> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buf);
  } catch {
    throw new Error("Archive ZIP illisible.");
  }
  const entry = zip.getEntry("data.json");
  if (!entry) throw new Error("Archive invalide : data.json manquant.");
  let total = 0;
  for (const e of zip.getEntries()) total += e.header.size;
  if (total > MAX_TOTAL) throw new Error("Archive trop volumineuse.");
  let dump: DataDump;
  try {
    dump = JSON.parse(entry.getData().toString("utf8"));
  } catch {
    throw new Error("data.json invalide.");
  }
  if (dump?.format !== "adminops-toolkit-backup") throw new Error("Ce fichier n'est pas une sauvegarde AdminOps Toolkit.");

  await saveBackupFile(); // filet de sécurité avant écrasement

  // Fichiers : on remplace le contenu du dossier d'uploads
  for (const name of await fileStore.list()) await fileStore.remove(name);
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");
  await fs.mkdir(dir, { recursive: true });
  let files = 0;
  for (const e of zip.getEntries()) {
    if (e.isDirectory || !e.entryName.startsWith("uploads/")) continue;
    const base = path.basename(e.entryName);
    if (!/^[\w.-]+$/.test(base)) continue;
    await fs.writeFile(path.join(dir, base), e.getData());
    files++;
  }
  await storage.restore(dump);
  return { labs: dump.tables.lab?.length ?? 0, files };
}
