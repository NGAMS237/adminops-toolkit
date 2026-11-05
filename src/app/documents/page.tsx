import { storage } from "@/storage";
import { DocList, UploadZone, type DocRow } from "@/components/DocumentsClient";
import { PageHeader, fmtDate } from "@/components/ui";

export default async function Documents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [atts, labs, procs] = await Promise.all([storage.attachments.list(), storage.labs.list(), storage.procedures.list()]);
  const labMap = new Map(labs.map((l) => [l.id, l.title]));
  const procMap = new Map(procs.map((p) => [p.id, p.title]));
  const rows: DocRow[] = atts
    .filter((a) => !q || a.filename.toLowerCase().includes(q.toLowerCase()) || a.caption.toLowerCase().includes(q.toLowerCase()))
    .map((a) => ({
      id: a.id, filename: a.filename, size: a.size, kind: a.kind, date: fmtDate(a.createdAt),
      parent: a.labId ? { type: "lab", id: a.labId, title: labMap.get(a.labId) } : a.procedureId ? { type: "procedure", id: a.procedureId, title: procMap.get(a.procedureId) } : { type: "libre" },
    }));
  return (
    <>
      <PageHeader title="Documents" subtitle="Import de fichiers (.txt, .md, .png, .jpg, .pdf, .pkt) et pièces jointes de tous vos laboratoires." />
      <UploadZone labs={labs.map((l) => ({ id: l.id, title: l.title }))} procedures={procs.map((p) => ({ id: p.id, title: p.title }))} />
      <form className="my-5 flex gap-3"><input name="q" defaultValue={q} className="input" placeholder="Filtrer par nom de fichier ou légende…" aria-label="Filtrer" /><button className="btn">Filtrer</button></form>
      <DocList rows={rows} />
    </>
  );
}
