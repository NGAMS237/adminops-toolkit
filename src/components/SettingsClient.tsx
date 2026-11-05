"use client";
import { Download, RotateCcw, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createBackupAction, restoreLocalBackupAction, saveSettingsAction } from "@/app/actions";
import { fmtDateTime, fmtSize } from "./ui";
import ThemeToggle from "./ThemeToggle";

export function SettingsForm({ initial }: { initial: { organization: string; author: string; footerText: string } }) {
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSettingsAction(f); setMsg(r.ok ? "Enregistré." : r.error); }); }}>
      <h2 className="font-semibold">Rapports PDF</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div><label className="label" htmlFor="s-org">Organisation (en-tête)</label><input id="s-org" className="input" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></div>
        <div><label className="label" htmlFor="s-auth">Auteur (page de garde)</label><input id="s-auth" className="input" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></div>
        <div><label className="label" htmlFor="s-foot">Pied de page</label><input id="s-foot" className="input" value={f.footerText} onChange={(e) => setF({ ...f, footerText: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-3"><button className="btn btn-primary" disabled={pending}><Save size={15} />Enregistrer</button><span className="text-sm text-slate-500" role="status">{msg}</span></div>
    </form>
  );
}

export function ThemeCard() {
  return (<div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="font-semibold">Thème</h2><p className="text-sm text-slate-500">Clair, sombre ou selon le système.</p></div><ThemeToggle full /></div>);
}

export function BackupPanel({ backups }: { backups: { name: string; size: number; date: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function restoreFile(file: File) {
    if (!confirm("ATTENTION : la restauration REMPLACE toutes les données actuelles (une sauvegarde de sécurité est créée automatiquement avant). Continuer ?")) return;
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/restore", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: `Restauration réussie : ${d.labs} laboratoire(s), ${d.files} fichier(s).` } : { ok: false, text: d.error ?? "Échec" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="mb-1 font-semibold">Export des données</h2>
        <p className="mb-3 text-sm text-slate-500">Les exports sont générés à la demande et ne sont jamais stockés dans Git.</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/api/export/json"><Download size={15} />JSON (toutes les tables)</a>
          <a className="btn" href="/api/export/markdown"><Download size={15} />Markdown (ZIP)</a>
          <a className="btn" href="/api/inventory/csv"><Download size={15} />Inventaire CSV</a>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="mb-1 font-semibold">Sauvegarde et restauration</h2>
        <p className="mb-3 text-sm text-slate-500">Une sauvegarde contient toutes les données et toutes les pièces jointes (ZIP).</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); const r = await createBackupAction(); setBusy(false); setMsg(r.ok ? { ok: true, text: `Sauvegarde créée : ${r.name}` } : { ok: false, text: r.error }); router.refresh(); }}><Save size={15} />Créer une sauvegarde locale</button>
          <a className="btn" href="/api/backup"><Download size={15} />Télécharger une sauvegarde</a>
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={15} />Restaurer depuis un fichier…</button>
          <input ref={fileRef} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restoreFile(f); e.target.value = ""; }} />
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`} role="status">{msg.text}</p>}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Sauvegardes locales (dossier data/backups)</h3>
        {backups.length === 0 ? <p className="text-sm text-slate-500">Aucune sauvegarde locale.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {backups.map((b) => (
              <li key={b.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><span className="font-medium">{b.name}</span> <span className="text-xs text-slate-500">· {fmtSize(b.size)} · {fmtDateTime(new Date(b.date))}</span></span>
                <span className="flex gap-2">
                  <a className="btn btn-sm" href={`/api/backup/${b.name}`}>Télécharger</a>
                  <button className="btn btn-sm btn-danger" disabled={busy} onClick={async () => { if (!confirm(`Restaurer « ${b.name} » ? Les données actuelles seront remplacées.`)) return; setBusy(true); const r = await restoreLocalBackupAction(b.name); setBusy(false); setMsg(r.ok ? { ok: true, text: `Restauration réussie : ${r.labs} laboratoire(s).` } : { ok: false, text: r.error }); router.refresh(); }}><RotateCcw size={13} />Restaurer</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
