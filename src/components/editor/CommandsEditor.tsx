"use client";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { LANGUAGES } from "@/domain/constants";
import type { CommandInput } from "@/domain/types";
import { useState } from "react";

export interface ProcedureOption { id: string; title: string; commands: CommandInput[] }

export default function CommandsEditor({
  commands, onChange, defaultLanguage = "cisco", procedureOptions = [],
}: { commands: CommandInput[]; onChange: (c: CommandInput[]) => void; defaultLanguage?: string; procedureOptions?: ProcedureOption[] }) {
  const [pick, setPick] = useState("");
  const set = (i: number, patch: Partial<CommandInput>) => onChange(commands.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= commands.length) return;
    const next = [...commands];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {commands.length === 0 && <p className="text-sm text-slate-500">Aucune commande. Ajoutez un bloc ou insérez celles d'une procédure existante.</p>}
      {commands.map((c, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{i + 1}</span>
            <input className="input min-w-[180px] flex-1" aria-label="Titre du bloc" placeholder="Titre (ex. : Créer les VLAN)" value={c.title} onChange={(e) => set(i, { title: e.target.value })} />
            <select className="input !w-auto" aria-label="Langage" value={c.language} onChange={(e) => set(i, { language: e.target.value })}>
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" title="Monter" onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="btn btn-ghost btn-sm" title="Descendre" onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="btn btn-ghost btn-sm" title="Dupliquer" onClick={() => onChange([...commands.slice(0, i + 1), { ...c }, ...commands.slice(i + 1)])}><Copy size={14} /></button>
            <button type="button" className="btn btn-ghost btn-sm text-red-600" title="Supprimer" onClick={() => onChange(commands.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
          <textarea className="input mono-area resize-y" rows={Math.min(Math.max(c.code.split("\n").length + 1, 4), 22)} spellCheck={false}
            aria-label="Commandes" placeholder="Collez ici vos commandes…" value={c.code} onChange={(e) => set(i, { code: e.target.value })} />
          <textarea className="input mt-2 resize-y" rows={2} aria-label="Explication" placeholder="Explication de la commande (ce qu'elle fait, pourquoi)" value={c.explanation} onChange={(e) => set(i, { explanation: e.target.value })} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={() => onChange([...commands, { title: "", language: defaultLanguage, code: "", explanation: "" }])}><Plus size={15} />Ajouter un bloc</button>
        {procedureOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <select className="input !w-auto max-w-[260px]" aria-label="Procédure à insérer" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Insérer les commandes d'une procédure…</option>
              {procedureOptions.filter((p) => p.commands.length).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button type="button" className="btn" disabled={!pick}
              onClick={() => {
                const p = procedureOptions.find((x) => x.id === pick);
                if (p) onChange([...commands, ...p.commands.map((c) => ({ ...c, title: c.title || p.title }))]);
                setPick("");
              }}>Insérer</button>
          </div>
        )}
      </div>
    </div>
  );
}
