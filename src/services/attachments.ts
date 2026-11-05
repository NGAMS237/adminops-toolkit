import path from "node:path";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/domain/constants";
import type { Attachment } from "@/domain/types";
import { fileStore, storage } from "@/storage";

const MIME: Record<string, string> = {
  ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf", ".pkt": "application/octet-stream",
};

export function extOf(name: string) {
  return path.extname(name).toLowerCase();
}
export const isImage = (nameOrMime: string) => /\.(png|jpe?g)$/i.test(nameOrMime) || /^image\/(png|jpeg)/.test(nameOrMime);

export function sanitizeFilename(name: string) {
  const base = path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_").trim();
  return base.slice(0, 200) || "fichier";
}

/** Vérifie la signature binaire des images/PDF (le contenu doit correspondre à l'extension). */
function checkMagic(ext: string, buf: Buffer) {
  if (ext === ".png" && !(buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG")) return false;
  if ((ext === ".jpg" || ext === ".jpeg") && !(buf[0] === 0xff && buf[1] === 0xd8)) return false;
  if (ext === ".pdf" && buf.toString("ascii", 0, 5) !== "%PDF-") return false;
  return true;
}

export interface UploadInput {
  name: string;
  buffer: Buffer;
  labId?: string | null;
  procedureId?: string | null;
  kind?: string;
  caption?: string;
}

export async function saveUpload(i: UploadInput): Promise<Attachment> {
  const ext = extOf(i.name);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error(`Type de fichier non autorisé (${ext || "sans extension"}). Autorisés : ${ALLOWED_EXTENSIONS.join(", ")}`);
  }
  if (i.buffer.length === 0) throw new Error("Fichier vide.");
  if (i.buffer.length > MAX_UPLOAD_BYTES) throw new Error("Fichier trop volumineux (max 50 Mo).");
  if (!checkMagic(ext, i.buffer)) throw new Error(`Le contenu ne correspond pas à l'extension ${ext}.`);
  const stored = await fileStore.save(i.buffer, i.name);
  const kind = i.kind ?? (isImage(ext) ? "capture" : "file");
  return storage.attachments.create({
    labId: i.labId ?? null,
    procedureId: i.procedureId ?? null,
    filename: sanitizeFilename(i.name),
    storedName: stored,
    mime: MIME[ext] ?? "application/octet-stream",
    size: i.buffer.length,
    kind,
    caption: i.caption ?? "",
  });
}

export async function deleteAttachment(id: string) {
  const a = await storage.attachments.get(id);
  if (!a) return;
  await storage.attachments.delete(id);
  await fileStore.remove(a.storedName);
}

export async function duplicateAttachment(a: Attachment, target: { labId?: string | null; procedureId?: string | null }) {
  const buf = await fileStore.read(a.storedName);
  const stored = await fileStore.save(buf, a.filename);
  return storage.attachments.create({
    labId: target.labId ?? null, procedureId: target.procedureId ?? null, filename: a.filename,
    storedName: stored, mime: a.mime, size: a.size, kind: a.kind, caption: a.caption,
  });
}
