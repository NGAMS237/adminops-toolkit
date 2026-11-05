"use client";
import { useState } from "react";

export default function MultiPick({ items, selected, onChange, empty }: {
  items: { id: string; title: string; sub?: string }[]; selected: string[]; onChange: (ids: string[]) => void; empty: string;
}) {
  const [q, setQ] = useState("");
  const shown = items.filter((i) => (i.title + " " + (i.sub ?? "")).toLowerCase().includes(q.toLowerCase()));
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div>
      <input className="input mb-2" placeholder="Filtrer…" aria-label="Filtrer" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 p-1 dark:border-slate-700">
        {shown.map((i) => (
          <label key={i.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
            <input type="checkbox" className="mt-1" checked={selected.includes(i.id)}
              onChange={(e) => onChange(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
            <span><span className="font-medium">{i.title}</span>{i.sub && <span className="ml-2 text-xs text-slate-500">{i.sub}</span>}</span>
          </label>
        ))}
        {!shown.length && <p className="p-2 text-sm text-slate-500">Aucun résultat.</p>}
      </div>
      <p className="mt-1 text-xs text-slate-500">{selected.length} sélectionné(s)</p>
    </div>
  );
}
