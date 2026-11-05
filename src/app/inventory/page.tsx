import Link from "next/link";
import { Plus } from "lucide-react";
import { EQUIPMENT_TYPES, label } from "@/domain/constants";
import { storage } from "@/storage";
import { Empty, PageHeader, Pill } from "@/components/ui";

export default async function Inventory({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const items = await storage.equipment.list(q);
  return (
    <>
      <PageHeader title="Inventaire" subtitle="Équipements, adresses, interfaces et laboratoires associés."
        actions={<><a className="btn" href="/api/inventory/csv">Exporter CSV</a><Link href="/inventory/new" className="btn btn-primary"><Plus size={16} />Nouvel équipement</Link></>} />
      <form className="card mb-5 flex gap-3 p-4"><input name="q" defaultValue={q} className="input" placeholder="Nom, IP, fabricant, rôle, VLAN…" aria-label="Rechercher" /><button className="btn btn-primary">Rechercher</button></form>
      {items.length === 0 ? <Empty title="Aucun équipement" hint="Ajoutez vos routeurs, switchs, serveurs et ressources cloud." href="/inventory/new" cta="Ajouter un équipement" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800"><tr>{["Nom", "Type", "Fabricant", "OS / Firmware", "Adresse IP", "Rôle", "Laboratoires"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium"><Link href={`/inventory/${e.id}`} className="text-brand-600 hover:underline dark:text-brand-400">{e.name}</Link></td>
                  <td className="td"><Pill>{label(EQUIPMENT_TYPES, e.type)}</Pill></td>
                  <td className="td">{e.manufacturer}</td><td className="td">{e.osVersion}</td>
                  <td className="td font-mono text-xs">{e.ipAddress}</td><td className="td">{e.role}</td>
                  <td className="td">{e.labs.map((l) => <Link key={l.id} href={`/labs/${l.id}`} className="mr-2 inline-block text-xs text-brand-600 hover:underline dark:text-brand-400">{l.title.slice(0, 32)}{l.title.length > 32 ? "…" : ""}</Link>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
