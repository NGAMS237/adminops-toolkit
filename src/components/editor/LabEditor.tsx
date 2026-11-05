"use client";
import { Check, Eye, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveLabAction } from "@/app/actions";
import { CATEGORIES, STATUSES } from "@/domain/constants";
import type { AddressRowInput, Attachment, CommandInput, Revision } from "@/domain/types";
import { fmtDateTime } from "../ui";
import AddressTable from "./AddressTable";
import AttachmentsPanel from "./AttachmentsPanel";
import CommandsEditor, { type ProcedureOption } from "./CommandsEditor";
import MarkdownField from "./MarkdownField";
import MultiPick from "./MultiPick";

export interface LabFormData {
  title: string; category: string; status: string; date: string;
  description: string; objectives: string; prerequisites: string; topologyNotes: string; configSteps: string;
  tests: string; problems: string; diagnostics: string; conclusion: string;
  addressRows: AddressRowInput[]; commands: CommandInput[]; equipmentIds: string[]; procedureIds: string[];
}

const SECTIONS = [
  ["general", "Informations"], ["objectives", "Objectifs"], ["prerequisites", "Prérequis"], ["topology", "Topologie"],
  ["addressing", "Adressage"], ["links", "Équipements & procédures"], ["config", "Configuration"], ["commands", "Commandes"],
  ["tests", "Tests"], ["problems", "Problèmes"], ["diagnostics", "Diagnostic"], ["conclusion", "Conclusion"], ["history", "Historique"],
] as const;

function Section({ id, title, children, hint }: { id: string; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section id={id} className="card scroll-mt-28 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export default function LabEditor({ labId, initial, initialAttachments, revisions, equipment, procedures }: {
  labId: string; initial: LabFormData; initialAttachments: Attachment[]; revisions: Revision[];
  equipment: { id: string; title: string; sub?: string }[]; procedures: (ProcedureOption & { sub?: string })[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<LabFormData>(initial);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error"; text: string }>({ kind: "idle", text: "" });
  const [pending, start] = useTransition();
  const formRef = useRef(form);
  formRef.current = form;

  const set = useCallback(<K extends keyof LabFormData>(k: K, v: LabFormData[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); }, []);
  const target = useMemo(() => ({ labId }), [labId]);
  const onUploaded = useCallback(() => {
    fetch(`/api/attachments?labId=${labId}`).then((r) => r.json()).then(setAttachments).catch(() => {});
  }, [labId]);

  const save = useCallback(() => {
    start(async () => {
      const r = await saveLabAction(labId, formRef.current);
      if (r.ok) { setDirty(false); setStatus({ kind: "ok", text: `Enregistré à ${new Date(r.savedAt).toLocaleTimeString("fr-CA")}` }); router.refresh(); }
      else setStatus({ kind: "error", text: r.error });
    });
  }, [labId, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } };
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onUnload); };
  }, [save, dirty]);

  const md = (id: keyof LabFormData & string, label: string, rows = 6, hint?: string) => (
    <MarkdownField id={`f-${id}`} label={label} rows={rows} hint={hint} value={form[id] as string} onChange={(v) => set(id, v as never)} target={target} onUploaded={onUploaded} />
  );
  const defaultLang = form.category === "windows" ? "powershell" : form.category === "linux" || form.category === "scripts" ? "bash" : form.category === "azure" ? "azure" : "cisco";

  return (
    <div className="space-y-5">
      <div className="no-print sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-50/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:-mx-8 sm:px-8 lg:top-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{form.title || "Sans titre"}</p>
            <p className={`text-xs ${status.kind === "error" ? "text-red-600" : "text-slate-500"}`} role="status">
              {pending ? "Enregistrement…" : status.kind === "error" ? status.text : dirty ? "Modifications non enregistrées" : status.text || "À jour"}
            </p>
          </div>
          <Link href={`/labs/${labId}`} className="btn"><Eye size={15} />Voir la fiche</Link>
          <button className="btn btn-primary" onClick={save} disabled={pending || !form.title.trim()}>
            {dirty ? <Save size={15} /> : <Check size={15} />}Enregistrer <kbd className="hidden text-[10px] opacity-70 sm:inline">Ctrl+S</kbd>
          </button>
        </div>
        <nav className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto pb-1" aria-label="Sections">
          {SECTIONS.map(([id, t]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">{t}</a>)}
        </nav>
      </div>

      <Section id="general" title="Informations générales">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-4">
            <label className="label" htmlFor="f-title">Titre</label>
            <input id="f-title" className="input text-base font-medium" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div><label className="label" htmlFor="f-cat">Catégorie</label>
            <select id="f-cat" className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label" htmlFor="f-status">Statut</label>
            <select id="f-status" className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label" htmlFor="f-date">Date</label>
            <input id="f-date" type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="md:col-span-4">{md("description", "Description", 3, "Résumé affiché sur la page de garde du PDF.")}</div>
        </div>
      </Section>

      <Section id="objectives" title="Objectifs">{md("objectives", "Objectifs", 5)}</Section>
      <Section id="prerequisites" title="Prérequis">{md("prerequisites", "Prérequis", 5)}</Section>

      <Section id="topology" title="Topologie et pièces jointes" hint="Joignez la topologie (PNG/JPG), les fichiers .pkt, PDF et notes. Les images « Topologie » sont intégrées au PDF.">
        <div className="space-y-4">
          {md("topologyNotes", "Notes de topologie", 4)}
          <AttachmentsPanel attachments={attachments} target={target} onChange={setAttachments} />
        </div>
      </Section>

      <Section id="addressing" title="Plan d'adressage"><AddressTable rows={form.addressRows} onChange={(r) => set("addressRows", r)} /></Section>

      <Section id="links" title="Équipements et procédures associés">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between"><span className="label !mb-0">Équipements du laboratoire</span><Link href="/inventory/new" className="text-xs text-brand-600 hover:underline" target="_blank">+ Nouvel équipement</Link></div>
            <MultiPick items={equipment} selected={form.equipmentIds} onChange={(v) => set("equipmentIds", v)} empty="Aucun équipement dans l'inventaire." />
          </div>
          <div>
            <div className="mb-1"><span className="label !mb-0">Procédures réutilisées (annexe du PDF)</span></div>
            <MultiPick items={procedures.map((p) => ({ id: p.id, title: p.title, sub: p.sub }))} selected={form.procedureIds} onChange={(v) => set("procedureIds", v)} empty="Aucune procédure disponible." />
          </div>
        </div>
      </Section>

      <Section id="config" title="Étapes de configuration">{md("configSteps", "Étapes (Markdown)", 8)}</Section>

      <Section id="commands" title="Commandes et explications" hint="Chaque bloc est affiché avec coloration syntaxique et un bouton Copier.">
        <CommandsEditor commands={form.commands} onChange={(c) => set("commands", c)} defaultLanguage={defaultLang} procedureOptions={procedures} />
      </Section>

      <Section id="tests" title="Tests et résultats">{md("tests", "Tests et résultats", 8, "Astuce : collez des sorties de console dans des blocs de code (```) et des captures avec Ctrl+V.")}</Section>
      <Section id="problems" title="Problèmes rencontrés">{md("problems", "Problèmes rencontrés", 5)}</Section>
      <Section id="diagnostics" title="Diagnostic et solutions">{md("diagnostics", "Diagnostic et solutions", 5)}</Section>
      <Section id="conclusion" title="Conclusion">{md("conclusion", "Conclusion", 4)}</Section>

      <Section id="history" title="Historique des modifications" hint="Généré automatiquement à chaque enregistrement.">
        {revisions.length ? (
          <ul className="space-y-1 text-sm">{revisions.map((r) => <li key={r.id}><span className="text-slate-500">{fmtDateTime(new Date(r.createdAt))}</span> — {r.summary}</li>)}</ul>
        ) : <p className="text-sm text-slate-500">Aucune modification enregistrée.</p>}
      </Section>
    </div>
  );
}
