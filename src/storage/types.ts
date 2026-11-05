import type {
  Attachment, DashboardStats, DataDump, Equipment, EquipmentInput, EquipmentWithLabs, Lab, LabFilter,
  LabInput, LabSummary, Procedure, ProcedureFilter, ProcedureInput, ProcedureSummary, Revision, SearchHit,
} from "@/domain/types";

/**
 * Abstraction de stockage des données structurées.
 * L'implémentation actuelle est Prisma + SQLite (src/storage/prisma-storage.ts).
 * Pour migrer vers une base cloud : implémenter cette interface et changer src/storage/index.ts.
 */
export interface Storage {
  labs: {
    list(filter?: LabFilter): Promise<LabSummary[]>;
    get(id: string): Promise<Lab | null>;
    create(input: LabInput): Promise<Lab>;
    update(id: string, input: LabInput): Promise<Lab>;
    setArchived(id: string, archived: boolean): Promise<void>;
    delete(id: string): Promise<void>;
    addRevision(labId: string, summary: string): Promise<void>;
    listRevisions(labId: string): Promise<Revision[]>;
  };
  equipment: {
    list(q?: string): Promise<EquipmentWithLabs[]>;
    get(id: string): Promise<EquipmentWithLabs | null>;
    create(input: EquipmentInput): Promise<Equipment>;
    update(id: string, input: EquipmentInput): Promise<Equipment>;
    delete(id: string): Promise<void>;
  };
  procedures: {
    list(filter?: ProcedureFilter): Promise<ProcedureSummary[]>;
    get(id: string): Promise<Procedure | null>;
    create(input: ProcedureInput): Promise<Procedure>;
    update(id: string, input: ProcedureInput): Promise<Procedure>;
    delete(id: string): Promise<void>;
  };
  attachments: {
    list(filter?: { labId?: string; procedureId?: string; standalone?: boolean }): Promise<Attachment[]>;
    get(id: string): Promise<Attachment | null>;
    create(data: Omit<Attachment, "id" | "createdAt">): Promise<Attachment>;
    update(id: string, data: Partial<Pick<Attachment, "kind" | "caption" | "labId" | "procedureId">>): Promise<void>;
    delete(id: string): Promise<void>;
  };
  settings: {
    getAll(): Promise<Record<string, string>>;
    set(key: string, value: string): Promise<void>;
  };
  search(q: string): Promise<SearchHit[]>;
  stats(): Promise<DashboardStats>;
  /** Sauvegarde / restauration logique de toutes les tables. */
  dump(): Promise<DataDump>;
  restore(dump: DataDump): Promise<void>;
}

/** Abstraction du stockage des fichiers (pièces jointes). */
export interface FileStore {
  save(buffer: Buffer, originalName: string): Promise<string>; // retourne le nom stocké
  read(storedName: string): Promise<Buffer>;
  remove(storedName: string): Promise<void>;
  exists(storedName: string): Promise<boolean>;
  list(): Promise<string[]>;
}
