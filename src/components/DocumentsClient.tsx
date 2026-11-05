"use client";
import { Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteAttachmentAction } from "@/app/actions";
import { ALLOWED_EXTENSIONS } from "@/domain/constants";
import { fmtSize } from "./ui";

export interface DocRow { id: string; filename: string; size: number; kind: string; parent: { type: "lab" | "procedure" | "libre"; id?: string; title?: string }; date: string }

export function UploadZone({ labs, procedures }: { labs: { id: string; title: string }[]; procedures: { id: string; title: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState("libre");
  const [asProc, setAsProc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msgs, setMsgs] = useState<{ ok: boolean; text: string; href?: string }[]>([]);

  async function send(files: File[]) {
    if (!files.length) return;
    setBusy(true); setMsgs([]);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const [type, id] = target.split(":");
    if (type === "lab") fd.append("labId", id);
    if (type === "procedure") fd.append("procedureId", id);
    if (asProc) fd.append("mode", "procedure");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    const out = ((data.results ?? []) as { name: string; ok: boolean; error?: string; procedureId?: string }[]).map((r) =>
      r.ok ? { ok: true, text: r.procedureId ? `${r.name} → procédure créée` : `${r.name} importé`, href: r.procedureId ? `/procedures/${r.procedureId}` : undefined } : { ok: false, text: `${r.name} : ${r.error}` });
    setMsgs(out.length ? out : [{ ok: false, text: data.error ?? "Échec de l'import" }]);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); send(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center ${drag ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-300 dark:border-slate-700"}`}>
        <Upload size={28} className="text-slate-400" />
        <p className="font-medium">Glissez vos fichiers ici</p>
        <p className="text-xs text-slate-500">{ALLOWED_EXTENSIONS.join("  ")} · max 50 Mo · les fichiers .pkt sont conservés comme pièces jointes (aucune analyse).</p>
        <button className="btn mt-1" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Import en cours…" : "Choisir des fichiers"}</button>
        <input ref={fileRef} type="file" hidden multiple accept={ALLOWED_EXTENSIONS.join(",")} onChange={(e) => { send(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1"><label className="label" htmlFor="dz-target">Rattacher à</label>
          <select id="dz-target" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="libre">Aucun (document libre)</option>
            <optgroup label="Laboratoires">{labs.map((l) => <option key={l.id} value={`lab:${l.id}`}>{l.title}</option>)}</optgroup>
            <optgroup label="Procédures">{procedures.map((l) => <option key={l.id} value={`procedure:${l.id}`}>{l.title}</option>)}</optgroup>
          </select></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={asProc} onChange={(e) => setAsProc(e.target.checked)} />Convertir les .txt / .md en <strong>nouvelles procédures</strong></label>
      </div>
      {msgs.length > 0 && <ul className="mt-3 space-y-1 text-sm" role="status">{msgs.map((m, i) => <li key={i} className={m.ok ? "text-green-600" : "text-red-600"}>{m.href ? <Link href={m.href} className="underline">{m.text}</Link> : m.text}</li>)}</ul>}
    </div>
  );
}

export function DocList({ rows }: { rows: DocRow[] }) {
  const router = useRouter();
  if (!rows.length) return <p className="card p-6 text-center text-sm text-slate-500">Aucun document pour l'instant.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-slate-800"><tr>{["Fichier", "Rattaché à", "Taille", "Ajouté le", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td"><a className="font-medium text-brand-600 hover:underline dark:text-brand-400" href={`/api/attachments/${r.id}`} target="_blank" rel="noreferrer">{r.filename}</a></td>
              <td className="td">{r.parent.type === "libre" ? <span className="text-slate-500">Document libre</span> : <Link className="hover:underline" href={`/${r.parent.type === "lab" ? "labs" : "procedures"}/${r.parent.id}`}>{r.parent.title}</Link>}</td>
              <td className="td">{fmtSize(r.size)}</td><td className="td">{r.date}</td>
              <td className="td text-right">
                <a className="btn btn-sm mr-1" href={`/api/attachments/${r.id}?download=1`}>Télécharger</a>
                <button className="btn btn-sm btn-danger" aria-label={`Supprimer ${r.filename}`} onClick={async () => { if (confirm(`Supprimer « ${r.filename} » ?`)) { await deleteAttachmentAction(r.id); router.refresh(); } }}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
