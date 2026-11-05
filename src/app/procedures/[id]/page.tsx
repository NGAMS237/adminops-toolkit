import { Copy, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLATFORMS, label } from "@/domain/constants";
import { storage } from "@/storage";
import { deleteProcedureAction, duplicateProcedureAction } from "@/app/actions";
import ActionButton from "@/components/ActionButton";
import CodeBlock from "@/components/CodeBlock";
import Markdown from "@/components/Markdown";
import { CategoryBadge, PageHeader, Pill } from "@/components/ui";

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await storage.procedures.get(id);
  if (!p) notFound();
  return (
    <>
      <PageHeader title={p.title} subtitle={p.description}
        actions={<>
          <Link href={`/procedures/${p.id}/edit`} className="btn btn-primary"><Pencil size={15} />Modifier</Link>
          <ActionButton className="btn" action={duplicateProcedureAction.bind(null, p.id, p.isTemplate)}><Copy size={15} />{p.isTemplate ? "Utiliser ce modèle" : "Dupliquer"}</ActionButton>
          <a className="btn" href={`/api/procedures/${p.id}/markdown`}><Download size={15} />Markdown</a>
          <ActionButton className="btn btn-danger" confirm={`Supprimer « ${p.title} » ?`} action={deleteProcedureAction.bind(null, p.id)}><Trash2 size={15} />Supprimer</ActionButton>
        </>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CategoryBadge value={p.category} /><Pill>{label(PLATFORMS, p.platform)}</Pill>{p.isTemplate && <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">Modèle</span>}
        {p.tags.split(/\s+/).filter(Boolean).map((t) => <Pill key={t}>#{t}</Pill>)}
      </div>
      <div className="space-y-5">
        {p.content.trim() && <div className="card p-5"><Markdown>{p.content}</Markdown></div>}
        {p.commands.map((c, i) => (
          <div key={c.id} className="card p-5">
            <h3 className="mb-2 text-sm font-semibold">{i + 1}. {c.title || "Commande"}</h3>
            <CodeBlock code={c.code} language={c.language} />
            {c.explanation.trim() && <div className="mt-2 rounded-lg bg-brand-50 p-3 dark:bg-brand-900/20"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Explication</p><Markdown>{c.explanation}</Markdown></div>}
          </div>
        ))}
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Utilisée dans</h2>
          {p.labs.length ? <ul className="list-disc pl-5 text-sm">{p.labs.map((l) => <li key={l.id}><Link className="text-brand-600 hover:underline dark:text-brand-400" href={`/labs/${l.id}`}>{l.title}</Link></li>)}</ul>
            : <p className="text-sm text-slate-500">Aucun laboratoire. Associez cette procédure depuis l'éditeur d'un laboratoire (section « Équipements et procédures »).</p>}
        </div>
      </div>
    </>
  );
}
