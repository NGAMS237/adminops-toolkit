import { notFound } from "next/navigation";
import { storage } from "@/storage";
import ProcedureEditor from "@/components/editor/ProcedureEditor";
import { PageHeader } from "@/components/ui";

export default async function EditProcedure({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await storage.procedures.get(id);
  if (!p) notFound();
  return (
    <>
      <PageHeader title="Éditer la procédure" />
      <ProcedureEditor procId={p.id} initialAttachments={p.attachments}
        initial={{ title: p.title, category: p.category, platform: p.platform, description: p.description, content: p.content, tags: p.tags, isTemplate: p.isTemplate,
          commands: p.commands.map(({ id: _i, position: _p, ...c }) => c) }} />
    </>
  );
}
