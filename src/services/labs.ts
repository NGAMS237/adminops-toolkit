import type { Lab, LabInput, Procedure } from "@/domain/types";
import { fileStore, storage } from "@/storage";
import { labSchema } from "./schemas";
import { duplicateAttachment } from "./attachments";

export function parseLabInput(raw: unknown): LabInput {
  return labSchema.parse(raw);
}

const FIELD_LABELS: Record<string, string> = {
  title: "titre", category: "catégorie", status: "statut", date: "date", description: "description",
  objectives: "objectifs", prerequisites: "prérequis", topologyNotes: "topologie", configSteps: "configuration",
  tests: "tests", problems: "problèmes", diagnostics: "diagnostic", conclusion: "conclusion",
};

function summarizeChanges(before: Lab, after: LabInput): string {
  const changed: string[] = [];
  for (const k of Object.keys(FIELD_LABELS)) {
    const a = (before as unknown as Record<string, unknown>)[k];
    const b = (after as unknown as Record<string, unknown>)[k];
    const same = a instanceof Date && b instanceof Date ? a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10) : a === b;
    if (!same) changed.push(FIELD_LABELS[k]);
  }
  const sig = (xs: unknown[]) => JSON.stringify(xs);
  const rows = (xs: { device: string; interface: string; ip: string; mask: string; gateway: string; vlan: string; notes: string }[]) =>
    xs.map((r) => ({ device: r.device, interface: r.interface, ip: r.ip, mask: r.mask, gateway: r.gateway, vlan: r.vlan, notes: r.notes }));
  if (sig(rows(before.addressRows)) !== sig(rows(after.addressRows))) changed.push(`plan d'adressage (${after.addressRows.length} lignes)`);
  const bc = before.commands.map((c) => ({ title: c.title, language: c.language, code: c.code, explanation: c.explanation }));
  const ac = after.commands.map((c) => ({ title: c.title, language: c.language, code: c.code, explanation: c.explanation }));
  if (sig(bc) !== sig(ac)) changed.push(`commandes (${before.commands.length} → ${after.commands.length})`);
  const bEq = before.equipment.map((e) => e.id).sort().join();
  if (bEq !== [...after.equipmentIds].sort().join()) changed.push("équipements associés");
  const bPr = before.procedures.map((p) => p.id).sort().join();
  if (bPr !== [...after.procedureIds].sort().join()) changed.push("procédures liées");
  return changed.length ? `Modifié : ${changed.join(", ")}` : "Enregistrement sans changement";
}

export async function createLab(raw: unknown) {
  const lab = await storage.labs.create(parseLabInput(raw));
  await storage.labs.addRevision(lab.id, "Création de la fiche");
  return lab;
}

export async function updateLab(id: string, raw: unknown) {
  const input = parseLabInput(raw);
  const before = await storage.labs.get(id);
  if (!before) throw new Error("Laboratoire introuvable.");
  const summary = summarizeChanges(before, input);
  const lab = await storage.labs.update(id, input);
  if (summary !== "Enregistrement sans changement") await storage.labs.addRevision(id, summary);
  return lab;
}

export async function duplicateLab(id: string) {
  const src = await storage.labs.get(id);
  if (!src) throw new Error("Laboratoire introuvable.");
  const copy = await storage.labs.create({
    title: `${src.title} (copie)`, category: src.category, status: "brouillon", date: new Date(),
    description: src.description, objectives: src.objectives, prerequisites: src.prerequisites,
    topologyNotes: src.topologyNotes, configSteps: src.configSteps, tests: src.tests, problems: src.problems,
    diagnostics: src.diagnostics, conclusion: src.conclusion,
    addressRows: src.addressRows.map(({ id: _i, position: _p, ...r }) => r),
    commands: src.commands.map(({ id: _i, position: _p, ...c }) => c),
    equipmentIds: src.equipment.map((e) => e.id),
    procedureIds: src.procedures.map((p) => p.id),
  });
  // Les images référencées dans le Markdown (/api/attachments/<id>) sont remappées vers les copies
  const map = new Map<string, string>();
  for (const a of src.attachments) {
    const n = await duplicateAttachment(a, { labId: copy.id });
    map.set(a.id, n.id);
  }
  if (map.size) {
    const remap = (s: string) => s.replace(/\/api\/attachments\/([a-z0-9]+)/gi, (m, id) => (map.has(id) ? `/api/attachments/${map.get(id)}` : m));
    const fresh = (await storage.labs.get(copy.id))!;
    await storage.labs.update(copy.id, {
      ...fresh,
      addressRows: fresh.addressRows.map(({ id: _i, position: _p, ...r }) => r),
      commands: fresh.commands.map(({ id: _i, position: _p, ...c }) => c),
      equipmentIds: fresh.equipment.map((e) => e.id),
      procedureIds: fresh.procedures.map((p) => p.id),
      ...Object.fromEntries(
        (["description", "objectives", "prerequisites", "topologyNotes", "configSteps", "tests", "problems", "diagnostics", "conclusion"] as const)
          .map((k) => [k, remap(fresh[k])]),
      ),
    });
  }
  await storage.labs.addRevision(copy.id, `Dupliqué depuis « ${src.title} »`);
  return copy;
}

export async function deleteLab(id: string) {
  const lab = await storage.labs.get(id);
  if (!lab) return;
  await storage.labs.delete(id);
  for (const a of lab.attachments) await fileStore.remove(a.storedName);
}

export async function setArchived(id: string, archived: boolean) {
  await storage.labs.setArchived(id, archived);
  await storage.labs.addRevision(id, archived ? "Laboratoire archivé" : "Laboratoire restauré depuis les archives");
}

/** Copie les blocs de commandes d'une procédure dans un laboratoire. */
export async function importProcedureCommands(labId: string, proc: Procedure) {
  const lab = await storage.labs.get(labId);
  if (!lab) throw new Error("Laboratoire introuvable.");
  const commands = [
    ...lab.commands.map(({ id: _i, position: _p, ...c }) => c),
    ...proc.commands.map((c) => ({
      title: c.title || proc.title, language: c.language, code: c.code, explanation: c.explanation,
    })),
  ];
  await storage.labs.update(labId, {
    ...lab,
    addressRows: lab.addressRows.map(({ id: _i, position: _p, ...r }) => r),
    commands,
    equipmentIds: lab.equipment.map((e) => e.id),
    procedureIds: lab.procedures.map((p) => p.id),
  });
  await storage.labs.addRevision(labId, `Commandes importées depuis la procédure « ${proc.title} »`);
}
