"use client";
import { Bold, Code, Code2, Image as ImageIcon, Italic, List, Table } from "lucide-react";
import { useRef, useState } from "react";
import Markdown from "../Markdown";

export interface UploadTarget { labId?: string; procedureId?: string }
export interface UploadedAttachment { id: string; filename: string; url: string; kind: string }

export async function uploadFiles(files: File[], target: UploadTarget, kind?: string): Promise<{ ok: UploadedAttachment[]; errors: string[] }> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  if (target.labId) fd.append("labId", target.labId);
  if (target.procedureId) fd.append("procedureId", target.procedureId);
  if (kind) fd.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({ error: "Réponse invalide" }));
  if (!data.results) return { ok: [], errors: [data.error ?? "Échec de l'envoi"] };
  const ok: UploadedAttachment[] = [];
  const errors: string[] = [];
  for (const r of data.results as { name: string; ok: boolean; error?: string; id?: string; url?: string }[]) {
    if (r.ok && r.id) ok.push({ id: r.id, filename: r.name, url: r.url!, kind: /\.(png|jpe?g)$/i.test(r.name) ? "capture" : "file" });
    else errors.push(`${r.name} : ${r.error}`);
  }
  return { ok, errors };
}

export default function MarkdownField({
  id, label, value, onChange, rows = 6, hint, target, onUploaded, mono = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
  target: UploadTarget; onUploaded: (a: UploadedAttachment) => void; mono?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function edit(fn: (sel: string, before: string, after: string) => { text: string; cursor?: number }) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const r = fn(value.slice(s, e), value.slice(0, s), value.slice(e));
    const next = value.slice(0, s) + r.text + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); const c = s + (r.cursor ?? r.text.length); ta.setSelectionRange(c, c); });
  }
  const wrap = (a: string, b = a, ph = "texte") => edit((sel) => ({ text: a + (sel || ph) + b, cursor: a.length + (sel || ph).length + b.length }));

  async function handleFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setBusy(true); setErr("");
    const { ok, errors } = await uploadFiles(imgs, target, "capture");
    setBusy(false);
    if (errors.length) setErr(errors.join(" · "));
    if (ok.length) {
      ok.forEach(onUploaded);
      const md = ok.map((a) => `![${a.filename.replace(/\.[^.]+$/, "")}](${a.url})`).join("\n");
      edit(() => ({ text: `\n${md}\n` }));
    }
  }

  const btn = "btn btn-ghost btn-sm";
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="label !mb-0">{label}</label>
        <div className="flex items-center gap-1">
          {tab === "write" && (
            <>
              <button type="button" className={btn} title="Gras" onClick={() => wrap("**")}><Bold size={14} /></button>
              <button type="button" className={btn} title="Italique" onClick={() => wrap("*")}><Italic size={14} /></button>
              <button type="button" className={btn} title="Code en ligne" onClick={() => wrap("`", "`", "commande")}><Code size={14} /></button>
              <button type="button" className={btn} title="Bloc de code" onClick={() => edit((sel) => ({ text: "\n```\n" + (sel || "commande") + "\n```\n" }))}><Code2 size={14} /></button>
              <button type="button" className={btn} title="Liste" onClick={() => edit((sel) => ({ text: (sel || "élément").split("\n").map((l) => "- " + l).join("\n") }))}><List size={14} /></button>
              <button type="button" className={btn} title="Tableau" onClick={() => edit(() => ({ text: "\n| Colonne 1 | Colonne 2 |\n|---|---|\n| valeur | valeur |\n" }))}><Table size={14} /></button>
              <button type="button" className={btn} title="Insérer une image (ou coller une capture)" onClick={() => fileRef.current?.click()}><ImageIcon size={14} /></button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" multiple hidden onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </>
          )}
          <div className="ml-2 inline-flex rounded-lg border border-slate-300 p-0.5 text-xs dark:border-slate-700">
            <button type="button" onClick={() => setTab("write")} className={`rounded-md px-2 py-0.5 ${tab === "write" ? "bg-brand-600 text-white" : ""}`}>Écrire</button>
            <button type="button" onClick={() => setTab("preview")} className={`rounded-md px-2 py-0.5 ${tab === "preview" ? "bg-brand-600 text-white" : ""}`}>Aperçu</button>
          </div>
        </div>
      </div>
      {tab === "write" ? (
        <textarea
          id={id} ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
          className={`input resize-y ${mono ? "mono-area" : ""}`}
          placeholder="Markdown pris en charge — collez une capture d'écran (Ctrl+V) pour l'insérer"
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); handleFiles(files); }
          }}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); handleFiles(files); }
          }}
        />
      ) : (
        <div className="min-h-[6rem] rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-slate-400">Rien à afficher.</p>}
        </div>
      )}
      {(hint || busy || err) && (
        <p className={`mt-1 text-xs ${err ? "text-red-600" : "text-slate-500"}`}>{busy ? "Envoi de l'image…" : err || hint}</p>
      )}
    </div>
  );
}
