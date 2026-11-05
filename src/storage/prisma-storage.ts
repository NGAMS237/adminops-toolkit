import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  AddressRowInput, CommandInput, Attachment, DashboardStats, DataDump, Equipment, EquipmentInput, EquipmentWithLabs, Lab, LabFilter,
  LabInput, LabSummary, Procedure, ProcedureFilter, ProcedureInput, ProcedureSummary, SearchHit,
} from "@/domain/types";
import type { Storage } from "./types";

const labInclude = {
  addressRows: { orderBy: { position: "asc" } },
  commands: { orderBy: { position: "asc" } },
  attachments: { orderBy: { createdAt: "asc" } },
  equipment: { include: { equipment: true } },
  procedures: { include: { procedure: { include: { _count: { select: { commands: true, labs: true } } } } } },
  revisions: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.LabInclude;

type LabRow = Prisma.LabGetPayload<{ include: typeof labInclude }>;

function toProcSummary(p: {
  id: string; title: string; category: string; platform: string; description: string; tags: string;
  isTemplate: boolean; updatedAt: Date; createdAt: Date; _count: { commands: number; labs: number };
}): ProcedureSummary {
  return {
    id: p.id, title: p.title, category: p.category, platform: p.platform, description: p.description,
    tags: p.tags, isTemplate: p.isTemplate, updatedAt: p.updatedAt, createdAt: p.createdAt,
    commandCount: p._count.commands, labCount: p._count.labs,
  };
}

function toLab(r: LabRow): Lab {
  return {
    id: r.id, title: r.title, category: r.category, status: r.status, date: r.date, description: r.description,
    objectives: r.objectives, prerequisites: r.prerequisites, topologyNotes: r.topologyNotes,
    configSteps: r.configSteps, tests: r.tests, problems: r.problems, diagnostics: r.diagnostics,
    conclusion: r.conclusion, archived: r.archived, createdAt: r.createdAt, updatedAt: r.updatedAt,
    addressRows: r.addressRows, commands: r.commands, attachments: r.attachments,
    equipment: r.equipment.map((e) => e.equipment),
    procedures: r.procedures.map((p) => toProcSummary(p.procedure)),
    revisions: r.revisions,
  };
}

const labData = (i: LabInput) => ({
  title: i.title, category: i.category, status: i.status, date: i.date, description: i.description,
  objectives: i.objectives, prerequisites: i.prerequisites, topologyNotes: i.topologyNotes,
  configSteps: i.configSteps, tests: i.tests, problems: i.problems, diagnostics: i.diagnostics,
  conclusion: i.conclusion,
});

/** Ne retient que les champs métier (évite de propager id / labId / procedureId lors des copies). */
const addrRow = (a: AddressRowInput, position: number) => ({
  position, device: a.device, interface: a.interface, ip: a.ip, mask: a.mask, gateway: a.gateway, vlan: a.vlan, notes: a.notes,
});
const cmdRow = (c: CommandInput, position: number) => ({
  position, title: c.title, language: c.language, code: c.code, explanation: c.explanation,
});

// Ordre d'insertion respectant les clés étrangères
const TABLES = [
  "setting", "equipment", "procedure", "lab", "addressRow", "commandBlock", "attachment",
  "labEquipment", "labProcedure", "revision",
] as const;
const DATE_FIELDS = ["date", "createdAt", "updatedAt"];

export class PrismaStorage implements Storage {
  labs: Storage["labs"] = {
    list: async (filter: LabFilter = {}): Promise<LabSummary[]> => {
      const where: Prisma.LabWhereInput = {};
      if (filter.archived !== undefined) where.archived = filter.archived;
      if (filter.category) where.category = filter.category;
      if (filter.status) where.status = filter.status;
      if (filter.q) {
        const q = filter.q;
        where.OR = [
          { title: { contains: q } }, { description: { contains: q } }, { objectives: { contains: q } },
          { configSteps: { contains: q } }, { commands: { some: { code: { contains: q } } } },
          { equipment: { some: { equipment: { name: { contains: q } } } } },
        ];
      }
      const rows = await prisma.lab.findMany({
        where, orderBy: { updatedAt: "desc" },
        include: { _count: { select: { commands: true, equipment: true, attachments: true } } },
      });
      return rows.map(({ _count, ...r }) => ({
        ...r,
        counts: { commands: _count.commands, equipment: _count.equipment, attachments: _count.attachments },
      }));
    },
    get: async (id) => {
      const r = await prisma.lab.findUnique({ where: { id }, include: labInclude });
      return r ? toLab(r) : null;
    },
    create: async (input) => {
      const r = await prisma.lab.create({
        data: {
          ...labData(input),
          addressRows: { create: input.addressRows.map(addrRow) },
          commands: { create: input.commands.map(cmdRow) },
          equipment: { create: input.equipmentIds.map((equipmentId) => ({ equipmentId })) },
          procedures: { create: input.procedureIds.map((procedureId) => ({ procedureId })) },
        },
        include: labInclude,
      });
      return toLab(r);
    },
    update: async (id, input) => {
      const r = await prisma.$transaction(async (tx) => {
        await tx.addressRow.deleteMany({ where: { labId: id } });
        await tx.commandBlock.deleteMany({ where: { labId: id } });
        await tx.labEquipment.deleteMany({ where: { labId: id } });
        await tx.labProcedure.deleteMany({ where: { labId: id } });
        return tx.lab.update({
          where: { id },
          data: {
            ...labData(input),
            addressRows: { create: input.addressRows.map(addrRow) },
            commands: { create: input.commands.map(cmdRow) },
            equipment: { create: input.equipmentIds.map((equipmentId) => ({ equipmentId })) },
            procedures: { create: input.procedureIds.map((procedureId) => ({ procedureId })) },
          },
          include: labInclude,
        });
      });
      return toLab(r);
    },
    setArchived: async (id, archived) => {
      await prisma.lab.update({ where: { id }, data: { archived } });
    },
    delete: async (id) => {
      await prisma.lab.delete({ where: { id } });
    },
    addRevision: async (labId, summary) => {
      await prisma.revision.create({ data: { labId, summary } });
    },
    listRevisions: (labId) => prisma.revision.findMany({ where: { labId }, orderBy: { createdAt: "desc" } }),
  };

  equipment: Storage["equipment"] = {
    list: async (q) => {
      const rows = await prisma.equipment.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q } }, { manufacturer: { contains: q } }, { osVersion: { contains: q } },
                { ipAddress: { contains: q } }, { role: { contains: q } }, { interfaces: { contains: q } },
                { vlans: { contains: q } }, { type: { contains: q } },
              ],
            }
          : undefined,
        orderBy: { name: "asc" },
        include: { labs: { include: { lab: { select: { id: true, title: true } } } } },
      });
      return rows.map(({ labs, ...e }): EquipmentWithLabs => ({ ...e, labs: labs.map((l) => l.lab) }));
    },
    get: async (id) => {
      const r = await prisma.equipment.findUnique({
        where: { id },
        include: { labs: { include: { lab: { select: { id: true, title: true } } } } },
      });
      if (!r) return null;
      const { labs, ...e } = r;
      return { ...e, labs: labs.map((l) => l.lab) };
    },
    create: (input: EquipmentInput) => prisma.equipment.create({ data: input }),
    update: (id, input) => prisma.equipment.update({ where: { id }, data: input }),
    delete: async (id) => {
      await prisma.equipment.delete({ where: { id } });
    },
  };

  procedures: Storage["procedures"] = {
    list: async (f: ProcedureFilter = {}) => {
      const where: Prisma.ProcedureWhereInput = {};
      const and: Prisma.ProcedureWhereInput[] = [];
      if (f.category) where.category = f.category;
      if (f.platform) where.platform = f.platform;
      if (f.templatesOnly) where.isTemplate = true;
      if (f.q) {
        and.push({
          OR: [
            { title: { contains: f.q } }, { description: { contains: f.q } }, { tags: { contains: f.q } },
            { content: { contains: f.q } }, { commands: { some: { code: { contains: f.q } } } },
          ],
        });
      }
      if (f.equipment) {
        and.push({
          OR: [
            { tags: { contains: f.equipment } }, { content: { contains: f.equipment } },
            { commands: { some: { code: { contains: f.equipment } } } },
          ],
        });
      }
      if (and.length) where.AND = and;
      const rows = await prisma.procedure.findMany({
        where, orderBy: [{ isTemplate: "desc" }, { updatedAt: "desc" }],
        include: { _count: { select: { commands: true, labs: true } } },
      });
      return rows.map(toProcSummary);
    },
    get: async (id) => {
      const r = await prisma.procedure.findUnique({
        where: { id },
        include: {
          commands: { orderBy: { position: "asc" } },
          attachments: true,
          labs: { include: { lab: { select: { id: true, title: true } } } },
        },
      });
      if (!r) return null;
      const { labs, ...p } = r;
      return { ...p, labs: labs.map((l) => l.lab) } as Procedure;
    },
    create: async (input) => {
      const { commands, ...rest } = input;
      const r = await prisma.procedure.create({
        data: { ...rest, commands: { create: commands.map(cmdRow) } },
        include: { commands: { orderBy: { position: "asc" } }, attachments: true },
      });
      return { ...r, labs: [] };
    },
    update: async (id, input) => {
      const { commands, ...rest } = input;
      const r = await prisma.$transaction(async (tx) => {
        await tx.commandBlock.deleteMany({ where: { procedureId: id } });
        return tx.procedure.update({
          where: { id },
          data: { ...rest, commands: { create: commands.map(cmdRow) } },
          include: {
            commands: { orderBy: { position: "asc" } }, attachments: true,
            labs: { include: { lab: { select: { id: true, title: true } } } },
          },
        });
      });
      return { ...r, labs: r.labs.map((l) => l.lab) };
    },
    delete: async (id) => {
      await prisma.procedure.delete({ where: { id } });
    },
  };

  attachments: Storage["attachments"] = {
    list: async (f = {}) => {
      const where: Prisma.AttachmentWhereInput = {};
      if (f.labId) where.labId = f.labId;
      if (f.procedureId) where.procedureId = f.procedureId;
      if (f.standalone) { where.labId = null; where.procedureId = null; }
      return prisma.attachment.findMany({ where, orderBy: { createdAt: "desc" } });
    },
    get: (id) => prisma.attachment.findUnique({ where: { id } }),
    create: (data) => prisma.attachment.create({ data }),
    update: async (id, data) => {
      await prisma.attachment.update({ where: { id }, data });
    },
    delete: async (id) => {
      await prisma.attachment.delete({ where: { id } });
    },
  };

  settings: Storage["settings"] = {
    getAll: async () => Object.fromEntries((await prisma.setting.findMany()).map((s) => [s.key, s.value])),
    set: async (key, value) => {
      await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    },
  };

  async search(q: string): Promise<SearchHit[]> {
    q = q.trim();
    if (!q) return [];
    const c = { contains: q };
    const [labs, procs, eq, cmds, atts] = await Promise.all([
      prisma.lab.findMany({
        where: { OR: [{ title: c }, { description: c }, { objectives: c }, { prerequisites: c }, { configSteps: c }, { tests: c }, { problems: c }, { diagnostics: c }, { conclusion: c }] },
        take: 20, orderBy: { updatedAt: "desc" },
      }),
      prisma.procedure.findMany({
        where: { OR: [{ title: c }, { description: c }, { tags: c }, { content: c }] },
        take: 20, orderBy: { updatedAt: "desc" },
      }),
      prisma.equipment.findMany({
        where: { OR: [{ name: c }, { manufacturer: c }, { osVersion: c }, { ipAddress: c }, { role: c }, { interfaces: c }, { vlans: c }] },
        take: 20,
      }),
      prisma.commandBlock.findMany({
        where: { OR: [{ code: c }, { title: c }, { explanation: c }] },
        take: 20,
        include: { lab: { select: { id: true, title: true } }, procedure: { select: { id: true, title: true } } },
      }),
      prisma.attachment.findMany({ where: { OR: [{ filename: c }, { caption: c }] }, take: 20 }),
    ]);
    const hits: SearchHit[] = [];
    for (const l of labs) hits.push({ type: "lab", id: l.id, title: l.title, subtitle: `Laboratoire · ${l.category}`, href: `/labs/${l.id}`, excerpt: l.description.slice(0, 160) });
    for (const p of procs) hits.push({ type: "procedure", id: p.id, title: p.title, subtitle: `Procédure · ${p.platform}`, href: `/procedures/${p.id}`, excerpt: p.description.slice(0, 160) });
    for (const e of eq) hits.push({ type: "equipment", id: e.id, title: e.name, subtitle: `Équipement · ${e.type}${e.ipAddress ? " · " + e.ipAddress : ""}`, href: `/inventory/${e.id}`, excerpt: e.role });
    for (const m of cmds) {
      const parent = m.lab ?? m.procedure;
      if (!parent) continue;
      const line = m.code.split("\n").find((l) => l.toLowerCase().includes(q.toLowerCase())) ?? m.code.split("\n")[0];
      hits.push({
        type: "command", id: m.id, title: m.title || line.slice(0, 60),
        subtitle: `Commande · ${m.lab ? "Labo" : "Procédure"} « ${parent.title} »`,
        href: m.lab ? `/labs/${m.lab.id}` : `/procedures/${m.procedure!.id}`, excerpt: line.slice(0, 160),
      });
    }
    for (const a of atts) hits.push({ type: "document", id: a.id, title: a.filename, subtitle: "Document", href: `/api/attachments/${a.id}`, excerpt: a.caption });
    return hits;
  }

  async stats(): Promise<DashboardStats> {
    const [labs, archivedLabs, procedures, equipment, attachments, groups, rl, rp, re] = await Promise.all([
      prisma.lab.count({ where: { archived: false } }),
      prisma.lab.count({ where: { archived: true } }),
      prisma.procedure.count(),
      prisma.equipment.count(),
      prisma.attachment.count(),
      prisma.lab.groupBy({ by: ["category"], where: { archived: false }, _count: { _all: true } }),
      prisma.lab.findMany({ orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
      prisma.procedure.findMany({ orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, title: true, updatedAt: true } }),
      prisma.equipment.findMany({ orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, name: true, updatedAt: true } }),
    ]);
    const recent = [
      ...rl.map((x) => ({ type: "lab" as const, id: x.id, title: x.title, updatedAt: x.updatedAt, href: `/labs/${x.id}` })),
      ...rp.map((x) => ({ type: "procedure" as const, id: x.id, title: x.title, updatedAt: x.updatedAt, href: `/procedures/${x.id}` })),
      ...re.map((x) => ({ type: "equipment" as const, id: x.id, title: x.name, updatedAt: x.updatedAt, href: `/inventory/${x.id}` })),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);
    return {
      labs, archivedLabs, procedures, equipment, attachments,
      byCategory: groups.map((g) => ({ category: g.category, count: g._count._all })),
      recent,
    };
  }

  async dump(): Promise<DataDump> {
    const tables: DataDump["tables"] = {};
    for (const t of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tables[t] = (await (prisma as any)[t].findMany()) as Record<string, unknown>[];
    }
    return { format: "adminops-toolkit-backup", version: 1, exportedAt: new Date().toISOString(), tables };
  }

  async restore(dump: DataDump): Promise<void> {
    if (dump?.format !== "adminops-toolkit-backup" || dump.version !== 1) {
      throw new Error("Fichier de sauvegarde invalide ou version non supportée.");
    }
    const revive = (rows: Record<string, unknown>[]) =>
      rows.map((r) => {
        const o: Record<string, unknown> = { ...r };
        for (const k of DATE_FIELDS) if (typeof o[k] === "string") o[k] = new Date(o[k] as string);
        return o;
      });
    await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tx as any;
      for (const name of [...TABLES].reverse()) await t[name].deleteMany();
      for (const name of TABLES) {
        const rows = dump.tables[name] ?? [];
        if (rows.length) await t[name].createMany({ data: revive(rows) });
      }
    }, { timeout: 60000 });
  }
}

export type { Attachment, Equipment };
