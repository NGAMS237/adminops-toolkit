import { notFound } from "next/navigation";
import { storage } from "@/storage";
import LabEditor, { type LabFormData } from "@/components/editor/LabEditor";
import { PageHeader, toDateInput } from "@/components/ui";

export default async function EditLab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lab = await storage.labs.get(id);
  if (!lab) notFound();
  const [equipment, procSummaries] = await Promise.all([storage.equipment.list(), storage.procedures.list()]);
  const procs = await Promise.all(procSummaries.map((p) => storage.procedures.get(p.id)));
  const initial: LabFormData = {
    title: lab.title, category: lab.category, status: lab.status, date: toDateInput(lab.date),
    description: lab.description, objectives: lab.objectives, prerequisites: lab.prerequisites, topologyNotes: lab.topologyNotes,
    configSteps: lab.configSteps, tests: lab.tests, problems: lab.problems, diagnostics: lab.diagnostics, conclusion: lab.conclusion,
    addressRows: lab.addressRows.map(({ id: _i, position: _p, ...r }) => r),
    commands: lab.commands.map(({ id: _i, position: _p, ...c }) => c),
    equipmentIds: lab.equipment.map((e) => e.id), procedureIds: lab.procedures.map((p) => p.id),
  };
  return (
    <>
      <PageHeader title="Éditer le laboratoire" subtitle="Les modifications sont versionnées dans l'historique à chaque enregistrement." />
      <LabEditor
        labId={lab.id} initial={initial} initialAttachments={lab.attachments} revisions={lab.revisions}
        equipment={equipment.map((e) => ({ id: e.id, title: e.name, sub: [e.type, e.ipAddress].filter(Boolean).join(" · ") }))}
        procedures={procs.filter((p) => !!p).map((p) => ({
          id: p!.id, title: p!.title, sub: p!.platform, commands: p!.commands.map((c) => ({ title: c.title, language: c.language, code: c.code, explanation: c.explanation })),
        }))}
      />
    </>
  );
}
