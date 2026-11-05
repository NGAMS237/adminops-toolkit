import { PrismaStorage } from "./prisma-storage";
import { LocalFileStore } from "./file-store";
import type { FileStore, Storage } from "./types";

const g = globalThis as unknown as { __storage?: Storage; __files?: FileStore };

/** Point unique de sélection de l'implémentation. */
export const storage: Storage = (g.__storage ??= new PrismaStorage());
export const fileStore: FileStore = (g.__files ??= new LocalFileStore());
export type { Storage, FileStore };
