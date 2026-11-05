/** Types du domaine — indépendants de Prisma/SQLite (permet de changer de backend). */

export interface AddressRow {
  id: string;
  position: number;
  device: string;
  interface: string;
  ip: string;
  mask: string;
  gateway: string;
  vlan: string;
  notes: string;
}
export type AddressRowInput = Omit<AddressRow, "id" | "position">;

export interface CommandBlock {
  id: string;
  position: number;
  title: string;
  language: string;
  code: string;
  explanation: string;
}
export type CommandInput = Omit<CommandBlock, "id" | "position">;

export interface Attachment {
  id: string;
  labId: string | null;
  procedureId: string | null;
  filename: string;
  storedName: string;
  mime: string;
  size: number;
  kind: string;
  caption: string;
  createdAt: Date;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  osVersion: string;
  ipAddress: string;
  interfaces: string;
  vlans: string;
  role: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
export type EquipmentInput = Omit<Equipment, "id" | "createdAt" | "updatedAt">;
export interface EquipmentWithLabs extends Equipment {
  labs: { id: string; title: string }[];
}

export interface Revision {
  id: string;
  labId: string;
  summary: string;
  createdAt: Date;
}

export interface LabFields {
  title: string;
  category: string;
  status: string;
  date: Date;
  description: string;
  objectives: string;
  prerequisites: string;
  topologyNotes: string;
  configSteps: string;
  tests: string;
  problems: string;
  diagnostics: string;
  conclusion: string;
}

export interface LabSummary extends LabFields {
  id: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  counts: { commands: number; equipment: number; attachments: number };
}

export interface ProcedureSummary {
  id: string;
  title: string;
  category: string;
  platform: string;
  description: string;
  tags: string;
  isTemplate: boolean;
  updatedAt: Date;
  createdAt: Date;
  commandCount: number;
  labCount: number;
}

export interface Lab extends LabFields {
  id: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  addressRows: AddressRow[];
  commands: CommandBlock[];
  attachments: Attachment[];
  equipment: Equipment[];
  procedures: ProcedureSummary[];
  revisions: Revision[];
}
export interface LabInput extends LabFields {
  addressRows: AddressRowInput[];
  commands: CommandInput[];
  equipmentIds: string[];
  procedureIds: string[];
}

export interface Procedure {
  id: string;
  title: string;
  category: string;
  platform: string;
  description: string;
  content: string;
  tags: string;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  commands: CommandBlock[];
  attachments: Attachment[];
  labs: { id: string; title: string }[];
}
export interface ProcedureInput {
  title: string;
  category: string;
  platform: string;
  description: string;
  content: string;
  tags: string;
  isTemplate: boolean;
  commands: CommandInput[];
}

export interface LabFilter {
  q?: string;
  category?: string;
  status?: string;
  archived?: boolean;
}
export interface ProcedureFilter {
  q?: string;
  category?: string;
  platform?: string;
  equipment?: string;
  templatesOnly?: boolean;
}

export type SearchHit = {
  type: "lab" | "procedure" | "equipment" | "command" | "document";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  excerpt?: string;
};

export interface DashboardStats {
  labs: number;
  archivedLabs: number;
  procedures: number;
  equipment: number;
  attachments: number;
  byCategory: { category: string; count: number }[];
  recent: { type: "lab" | "procedure" | "equipment"; id: string; title: string; updatedAt: Date; href: string }[];
}

/** Export complet (JSON) — format de sauvegarde. */
export interface DataDump {
  format: "adminops-toolkit-backup";
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}
