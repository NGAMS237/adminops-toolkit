"use client";
import { Plus, Trash2 } from "lucide-react";
import type { AddressRowInput } from "@/domain/types";

const COLS: { k: keyof AddressRowInput; h: string; w: string }[] = [
  { k: "device", h: "Équipement", w: "min-w-[110px]" }, { k: "interface", h: "Interface", w: "min-w-[90px]" },
  { k: "ip", h: "Adresse IP", w: "min-w-[120px]" }, { k: "mask", h: "Masque", w: "min-w-[120px]" },
  { k: "gateway", h: "Passerelle", w: "min-w-[120px]" }, { k: "vlan", h: "VLAN", w: "min-w-[60px]" }, { k: "notes", h: "Notes", w: "min-w-[130px]" },
];
const empty = (): AddressRowInput => ({ device: "", interface: "", ip: "", mask: "", gateway: "", vlan: "", notes: "" });

export default function AddressTable({ rows, onChange }: { rows: AddressRowInput[]; onChange: (r: AddressRowInput[]) => void }) {
  const set = (i: number, k: keyof AddressRowInput, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  /** Collage depuis un tableur (TSV) : remplit les cellules à partir de la cellule active. */
  function paste(e: React.ClipboardEvent, ri: number, ci: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
    const next = rows.map((r) => ({ ...r }));
    lines.forEach((cells, li) => {
      while (next.length <= ri + li) next.push(empty());
      cells.forEach((v, cj) => { const col = COLS[ci + cj]; if (col) next[ri + li][col.k] = v.trim(); });
    });
    onChange(next);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <thead><tr>{COLS.map((c) => <th key={c.k} className="th !px-1">{c.h}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {COLS.map((c, ci) => (
                  <td key={c.k} className={`px-0.5 ${c.w}`}>
                    <input className="input !px-2 !py-1" aria-label={`${c.h} ligne ${i + 1}`} value={r[c.k]} onChange={(e) => set(i, c.k, e.target.value)} onPaste={(e) => paste(e, i, ci)} />
                  </td>
                ))}
                <td><button type="button" className="btn btn-ghost btn-sm text-red-600" aria-label="Supprimer la ligne" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="btn" onClick={() => onChange([...rows, empty()])}><Plus size={15} />Ajouter une ligne</button>
        <span className="text-xs text-slate-500">Astuce : collez des cellules copiées depuis Excel/LibreOffice dans une cellule.</span>
      </div>
    </div>
  );
}
