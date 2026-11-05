"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveEquipmentAction } from "@/app/actions";
import { EQUIPMENT_TYPES } from "@/domain/constants";

export interface EquipmentFormData { name: string; type: string; manufacturer: string; osVersion: string; ipAddress: string; interfaces: string; vlans: string; role: string; notes: string }

export default function EquipmentForm({ id, initial }: { id: string | null; initial: EquipmentFormData }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof EquipmentFormData, v: string) => setF((x) => ({ ...x, [k]: v }));
  const field = (k: keyof EquipmentFormData, label: string, ph = "") => (
    <div><label className="label" htmlFor={`e-${k}`}>{label}</label><input id={`e-${k}`} className="input" value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></div>
  );
  return (
    <form className="card space-y-4 p-5" onSubmit={(e) => {
      e.preventDefault(); setMsg(null);
      start(async () => {
        const r = await saveEquipmentAction(id, f);
        if (!r.ok) return setMsg({ ok: false, text: r.error });
        if (!id) router.push(`/inventory/${r.id}`); else { setMsg({ ok: true, text: "Enregistré." }); router.refresh(); }
      });
    }}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">{field("name", "Nom de l'équipement *", "ex. : R1-EDGE")}</div>
        <div><label className="label" htmlFor="e-type">Type</label>
          <select id="e-type" className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>{EQUIPMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        {field("manufacturer", "Fabricant", "Cisco, Microsoft, Dell…")}
        {field("osVersion", "Système d'exploitation / firmware", "IOS 15.4, Ubuntu 24.04…")}
        {field("ipAddress", "Adresse IP", "192.168.1.1")}
        <div className="md:col-span-3">{field("role", "Rôle", "Routeur de bordure, contrôleur de domaine…")}</div>
        <div><label className="label" htmlFor="e-if">Interfaces (une par ligne)</label><textarea id="e-if" rows={5} className="input mono-area" value={f.interfaces} onChange={(e) => set("interfaces", e.target.value)} placeholder={"Gi0/0 — 192.168.10.1/24 — VLAN 10\nGi0/1 — WAN"} /></div>
        <div><label className="label" htmlFor="e-vl">VLAN</label><textarea id="e-vl" rows={5} className="input mono-area" value={f.vlans} onChange={(e) => set("vlans", e.target.value)} placeholder={"10 ADMIN\n20 USERS"} /></div>
        <div><label className="label" htmlFor="e-notes">Notes</label><textarea id="e-notes" rows={5} className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending || !f.name.trim()}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`} role="status">{msg.text}</span>}
      </div>
    </form>
  );
}
