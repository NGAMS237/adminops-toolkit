"use client";
import { Copy, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ALLOWED_EXTENSIONS, ATTACHMENT_KINDS } from "@/domain/constants";
import type { Attachment } from "@/domain/types";
import { deleteAttachmentAction, updateAttachmentAction } from "@/app/actions";
import { fmtSize } from "../ui";
import { uploadFiles, type UploadTarget } from "./MarkdownField";

export default function AttachmentsPanel({ attachments, target, onChange }: {
  attachments: Attachment[]; target: UploadTarget; onChange: (a: Attachment[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("topology");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [drag, setDrag] = useState(false);

  async function send(files: File[]) {
    if (!files.length) return;
    setBusy(true); setMsg(null);
    const { ok, errors } = await uploadFiles(files, target, kind);
    setBusy(false);
    if (ok.length) {
      // recharge la liste complète depuis le serveur pour avoir les métadonnées exactes
      const res = await fetch(`/api/attachments?${target.labId ? "labId=" + target.labId : "procedureId=" + target.procedureId}`);
      if (res.ok) onChange(await res.json());
    }
    setMsg(errors.length ? { ok: false, text: errors.join(" · ") } : { ok: true, text: `${ok.length} fichier(s) ajouté(s).` });
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-4 ${drag ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-300 dark:border-slate-700"}`}>
        <Upload size={20} className="text-slate-400" />
        <div className="flex-1 text-sm">
          <p>Glissez des fichiers ici ou</p>
          <p className="text-xs text-slate-500">Formats : {ALLOWED_EXTENSIONS.join(" ")} — max 50 Mo. Les fichiers .pkt sont conservés tels quels (non analysés).</p>
        </div>
        <select className="input !w-auto" aria-label="Type de pièce jointe" value={kind} onChange={(e) => setKind(e.target.value)}>
          {ATTACHMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Envoi…" : "Parcourir"}</button>
        <input ref={fileRef} type="file" multiple hidden accept={ALLOWED_EXTENSIONS.join(",")} onChange={(e) => { send(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`} role="status">{msg.text}</p>}
      <ul className="mt-3 space-y-2">
        {attachments.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            {/\.(png|jpe?g)$/i.test(a.filename)
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/attachments/${a.id}`} alt="" className="h-12 w-16 rounded object-cover" />
              : <span className="flex h-12 w-16 items-center justify-center rounded bg-slate-100 dark:bg-slate-800"><FileText size={20} /></span>}
            <div className="min-w-[140px] flex-1">
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{a.filename}</a>
              <span className="text-xs text-slate-500">{fmtSize(a.size)}</span>
            </div>
            <input className="input !w-48" placeholder="Légende" aria-label="Légende" defaultValue={a.caption}
              onBlur={(e) => { if (e.target.value !== a.caption) updateAttachmentAction(a.id, { caption: e.target.value }).then(() => onChange(attachments.map((x) => (x.id === a.id ? { ...x, caption: e.target.value } : x)))); }} />
            <select className="input !w-auto" aria-label="Type" value={a.kind}
              onChange={(e) => { const k = e.target.value; updateAttachmentAction(a.id, { kind: k }).then(() => onChange(attachments.map((x) => (x.id === a.id ? { ...x, kind: k } : x)))); }}>
              {ATTACHMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            {/\.(png|jpe?g)$/i.test(a.filename) && (
              <button type="button" className="btn btn-sm" title="Copier le lien Markdown de l'image" onClick={() => navigator.clipboard?.writeText(`![${a.caption || a.filename}](/api/attachments/${a.id})`)}><Copy size={13} />Lien MD</button>
            )}
            <button type="button" className="btn btn-sm btn-danger" aria-label="Supprimer"
              onClick={async () => { if (!confirm(`Supprimer « ${a.filename} » ?`)) return; const r = await deleteAttachmentAction(a.id); if (r.ok) onChange(attachments.filter((x) => x.id !== a.id)); }}><Trash2 size={13} /></button>
          </li>
        ))}
        {!attachments.length && <li className="text-sm text-slate-500">Aucune pièce jointe.</li>}
      </ul>
    </div>
  );
}
