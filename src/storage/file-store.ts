import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FileStore } from "./types";

export function uploadDir() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./data/uploads");
}

/** Stockage local sur disque. Les noms stockés sont aléatoires (aucune entrée utilisateur dans le chemin). */
export class LocalFileStore implements FileStore {
  constructor(private dir = uploadDir()) {}

  private resolve(storedName: string) {
    const safe = path.basename(storedName);
    return path.join(this.dir, safe);
  }
  async save(buffer: Buffer, originalName: string) {
    await fs.mkdir(this.dir, { recursive: true });
    const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const stored = `${randomUUID()}${ext}`;
    await fs.writeFile(this.resolve(stored), buffer);
    return stored;
  }
  async read(storedName: string) {
    return fs.readFile(this.resolve(storedName));
  }
  async remove(storedName: string) {
    await fs.rm(this.resolve(storedName), { force: true });
  }
  async exists(storedName: string) {
    try {
      await fs.access(this.resolve(storedName));
      return true;
    } catch {
      return false;
    }
  }
  async list() {
    try {
      return await fs.readdir(this.dir);
    } catch {
      return [];
    }
  }
}
