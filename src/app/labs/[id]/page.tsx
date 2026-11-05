import { Archive, ArchiveRestore, Copy, Download, FileText, Pencil, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/storage";
import { archiveLabAction, deleteLabAction, duplicateLabAction } from "@/app/actions";
import ActionButton from "@/components/ActionButton";
import CodeBlock from "@/components/CodeBlock";
import Markdown from "@/components/Markdown";
import { CategoryBadge, PageHeader, Pill, StatusBadge, fmtDate, fmtDateTime, fmtSize } from "@/components/ui";

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="card scroll-mt-6 p-5"><h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-semibold dark:border-slate-800">{title}</h2>{children}</section>;
}

export default async function LabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lab = await storage.labs.get(id);
  if (!lab) notFound();
  const has = (s: string) => s.trim().length > 0;
  const referenced = new Set([lab.description, lab.objectives, lab.prerequisites, lab.topologyNotes, lab.configSteps, lab.tests, lab.problems, lab.diagnostics, lab.conclusion].flatMap((t) => [...t.matchAll(/\/api\/attachments\/([A-Za-z0-9]+)/g)].map((m) => m[1])));
  const isImg = (n: string) => /\.(png|jpe?g)$/i.test(n);
  const topo = lab.attachments.filter((a) => a.kind === "topology" && isImg(a.filename) && !referenced.has(a.id));
  const used = lab.addressRows.length ? (["device", "interface", "ip", "mask", "gateway", "vlan", "notes"] as const).filter((k) => lab.addressRows.some((r) => r[k].trim())) : [];
  const H = { device: "Équipement", interface: "Interface", ip: "Adresse IP", mask: "Masque", gateway: "Passerelle", vlan: "VLAN", notes: "Notes" } as const;

  const toc: [string, string, boolean][] = [
    ["objectives", "Objectifs", has(lab.objectives)], ["prerequisites", "Prérequis", has(lab.prerequisites)],
    ["topology", "Topologie", has(lab.topologyNotes) || topo.length > 0], ["addressing", "Plan d'adressage", lab.addressRows.length > 0],
    ["equipment", "Équipements", lab.equipment.length > 0], ["config", "Configuration", has(lab.configSteps)],
    ["commands", "Commandes", lab.commands.length > 0], ["tests", "Tests et résultats", has(lab.tests)],
    ["problems", "Problèmes", has(lab.problems)], ["diagnostics", "Diagnostic", has(lab.diagnostics)], ["conclusion", "Conclusion", has(lab.conclusion)],
    ["procedures", "Procédures liées", lab.procedures.length > 0], ["files", "Pièces jointes", lab.attachments.length > 0], ["history", "Historique", true],
  ];

  return (
    <>
      <PageHeader
        title={lab.title}
        subtitle={`Laboratoire du ${fmtDate(lab.date)} · modifié le ${fmtDateTime(lab.updatedAt)}`}
        actions={
          <>
            <Link href={`/labs/${lab.id}/edit`} className="btn btn-primary"><Pencil size={15} />Modifier</Link>
            <a href={`/api/labs/${lab.id}/pdf`} className="btn"><Download size={15} />Générer PDF</a>
            <a href={`/api/labs/${lab.id}/pdf?inline=1`} target="_blank" rel="noreferrer" className="btn"><Printer size={15} />Aperçu / Imprimer</a>
            <ActionButton className="btn" action={duplicateLabAction.bind(null, lab.id)}><Copy size={15} />Dupliquer</ActionButton>
            <ActionButton className="btn" action={archiveLabAction.bind(null, lab.id, !lab.archived)}>
              {lab.archived ? <><ArchiveRestore size={15} />Désarchiver</> : <><Archive size={15} />Archiver</>}
            </ActionButton>
            <ActionButton className="btn btn-danger" confirm={`Supprimer définitivement « ${lab.title} » et ses pièces jointes ?`} action={deleteLabAction.bind(null, lab.id)}><Trash2 size={15} />Supprimer</ActionButton>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2"><CategoryBadge value={lab.category} /><StatusBadge value={lab.status} />{lab.archived && <Pill>Archivé</Pill>}</div>
      <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
        <div className="min-w-0 space-y-5">
          {has(lab.description) && <div className="card p-5"><Markdown>{lab.description}</Markdown></div>}
          {has(lab.objectives) && <Block id="objectives" title="Objectifs"><Markdown>{lab.objectives}</Markdown></Block>}
          {has(lab.prerequisites) && <Block id="prerequisites" title="Prérequis"><Markdown>{lab.prerequisites}</Markdown></Block>}
          {(has(lab.topologyNotes) || topo.length > 0) && (
            <Block id="topology" title="Topologie">
              <Markdown>{lab.topologyNotes}</Markdown>
              {topo.map((a) => (
                <figure key={a.id} className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/attachments/${a.id}`} alt={a.caption || a.filename} className="max-h-[520px] rounded-lg border border-slate-200 dark:border-slate-700" />
                  {a.caption && <figcaption className="mt-1 text-xs text-slate-500">{a.caption}</figcaption>}
                </figure>
              ))}
            </Block>
          )}
          {lab.addressRows.length > 0 && (
            <Block id="addressing" title="Plan d'adressage">
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50"><tr>{used.map((k) => <th key={k} className="th">{H[k]}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{lab.addressRows.map((r) => <tr key={r.id}>{used.map((k) => <td key={k} className={`td ${k === "ip" || k === "mask" || k === "gateway" ? "font-mono text-xs" : ""}`}>{r[k]}</td>)}</tr>)}</tbody>
              </table></div>
            </Block>
          )}
          {lab.equipment.length > 0 && (
            <Block id="equipment" title="Équipements associés">
              <ul className="grid gap-2 sm:grid-cols-2">{lab.equipment.map((e) => (
                <li key={e.id}><Link href={`/inventory/${e.id}`} className="block rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-400 dark:border-slate-700">
                  <span className="font-medium">{e.name}</span> <span className="text-xs text-slate-500">{e.type}{e.ipAddress ? ` · ${e.ipAddress}` : ""}</span>
                  {e.role && <span className="block text-xs text-slate-500">{e.role}</span>}</Link></li>
              ))}</ul>
            </Block>
          )}
          {has(lab.configSteps) && <Block id="config" title="Étapes de configuration"><Markdown>{lab.configSteps}</Markdown></Block>}
          {lab.commands.length > 0 && (
            <Block id="commands" title="Commandes et explications">
              <div className="space-y-6">
                {lab.commands.map((c, i) => (
                  <div key={c.id}>
                    <h3 className="mb-2 text-sm font-semibold">{i + 1}. {c.title || "Commande"}</h3>
                    <CodeBlock code={c.code} language={c.language} />
                    {has(c.explanation) && <div className="mt-2 rounded-lg bg-brand-50 p-3 dark:bg-brand-900/20"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Explication</p><Markdown>{c.explanation}</Markdown></div>}
                  </div>
                ))}
              </div>
            </Block>
          )}
          {has(lab.tests) && <Block id="tests" title="Tests et résultats"><Markdown>{lab.tests}</Markdown></Block>}
          {has(lab.problems) && <Block id="problems" title="Problèmes rencontrés"><Markdown>{lab.problems}</Markdown></Block>}
          {has(lab.diagnostics) && <Block id="diagnostics" title="Diagnostic et solutions"><Markdown>{lab.diagnostics}</Markdown></Block>}
          {has(lab.conclusion) && <Block id="conclusion" title="Conclusion"><Markdown>{lab.conclusion}</Markdown></Block>}
          {lab.procedures.length > 0 && (
            <Block id="procedures" title="Procédures liées">
              <ul className="space-y-1 text-sm">{lab.procedures.map((p) => <li key={p.id}><Link href={`/procedures/${p.id}`} className="text-brand-600 hover:underline dark:text-brand-400">{p.title}</Link> <span className="text-xs text-slate-500">· utilisée dans {p.labCount} labo(s)</span></li>)}</ul>
            </Block>
          )}
          {lab.attachments.length > 0 && (
            <Block id="files" title="Pièces jointes">
              <ul className="space-y-1.5 text-sm">{lab.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2"><FileText size={15} className="text-slate-400" />
                  <a className="text-brand-600 hover:underline dark:text-brand-400" href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer">{a.filename}</a>
                  <span className="text-xs text-slate-500">{fmtSize(a.size)}{/\.pkt$/i.test(a.filename) ? " · fichier Packet Tracer (conservé tel quel)" : ""}</span></li>
              ))}</ul>
            </Block>
          )}
          <Block id="history" title="Historique des modifications">
            <ul className="space-y-1 text-sm">{lab.revisions.map((r) => <li key={r.id}><span className="text-slate-500">{fmtDateTime(r.createdAt)}</span> — {r.summary}</li>)}</ul>
          </Block>
        </div>
        <aside className="no-print hidden lg:block">
          <nav className="sticky top-6 text-sm" aria-label="Sommaire">
            <p className="label">Sommaire</p>
            <ul className="space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
              {toc.filter((t) => t[2]).map(([a, t]) => <li key={a}><a href={`#${a}`} className="text-slate-600 hover:text-brand-600 dark:text-slate-400">{t}</a></li>)}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
