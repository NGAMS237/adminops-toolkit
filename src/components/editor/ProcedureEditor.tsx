"use client";
import { Check, Eye, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveProcedureAction } from "@/app/actions";
import { CATEGORIES, PLATFORMS } from "@/domain/constants";
import type { Attachment, CommandInput } from "@/domain/types";
import AttachmentsPanel from "./AttachmentsPanel";
import CommandsEditor from "./CommandsEditor";
import MarkdownField from "./MarkdownField";

export interface ProcedureFormData {
  title: string; category: string; platform: string; description: string; content: string; tags: string; isTemplate: boolean; commands: CommandInput[];
}

export default function ProcedureEditor({ procId, initial, initialAttachments }: { procId: string; initial: ProcedureFormData; initialAttachments: Attachment[] }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ error: false, text: "" });
  const [pending, start] = useTransition();
  const ref = useRef(form);
  ref.current = form;
  const set = <K extends keyof ProcedureFormData>(k: K, v: ProcedureFormData[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const target = useMemo(() => ({ procedureId: procId }), [procId]);
  const onUploaded = useCallback(() => { fetch(`/api/attachments?procedureId=${procId}`).then((r) => r.json()).then(setAttachments).catch(() => {}); }, [procId]);

  const save = useCallback(() => {
    start(async () => {
      const r = await saveProcedureAction(procId, ref.current);
      if (r.ok) { setDirty(false); setStatus({ error: false, text: `Enregistré à ${new Date(r.savedAt).toLocaleTimeString("fr-CA")}` }); router.refresh(); }
      else setStatus({ error: true, text: r.error });
    });
  }, [procId, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } };
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("keydown", onKey); window.addEventListener("beforeunload", onUnload);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onUnload); };
  }, [save, dirty]);

  return (
    <div className="space-y-5">
      <div className="no-print sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:-mx-8 sm:px-8">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{form.title || "Sans titre"}</p>
          <p className={`text-xs ${status.error ? "text-red-600" : "text-slate-500"}`} role="status">{pending ? "Enregistrement…" : status.error ? status.text : dirty ? "Modifications non enregistrées" : status.text || "À jour"}</p>
        </div>
        <Link href={`/procedures/${procId}`} className="btn"><Eye size={15} />Voir</Link>
        <button className="btn btn-primary" onClick={save} disabled={pending || !form.title.trim()}>{dirty ? <Save size={15} /> : <Check size={15} />}Enregistrer</button>
      </div>

      <section className="card p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-4"><label className="label" htmlFor="p-title">Titre</label><input id="p-title" className="input text-base font-medium" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><label className="label" htmlFor="p-cat">Catégorie</label><select id="p-cat" className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="label" htmlFor="p-plat">Plateforme</label><select id="p-plat" className="input" value={form.platform} onChange={(e) => set("platform", e.target.value)}>{PLATFORMS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div className="md:col-span-2"><label className="label" htmlFor="p-tags">Mots-clés (séparés par des espaces)</label><input id="p-tags" className="input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="ospf routage cisco" /></div>
          <label className="flex items-center gap-2 text-sm md:col-span-4"><input type="checkbox" checked={form.isTemplate} onChange={(e) => set("isTemplate", e.target.checked)} />Marquer comme <strong>modèle</strong> (point de départ réutilisable)</label>
          <div className="md:col-span-4"><label className="label" htmlFor="p-desc">Description</label><input id="p-desc" className="input" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
        </div>
      </section>
      <section className="card p-5">
        <MarkdownField id="p-content" label="Contenu (Markdown)" rows={10} value={form.content} onChange={(v) => set("content", v)} target={target} onUploaded={onUploaded} />
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Commandes</h2>
        <CommandsEditor commands={form.commands} onChange={(c) => set("commands", c)} defaultLanguage={form.platform === "autre" ? "text" : form.platform} />
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Pièces jointes</h2>
        <AttachmentsPanel attachments={attachments} target={target} onChange={setAttachments} />
      </section>
    </div>
  );
}
