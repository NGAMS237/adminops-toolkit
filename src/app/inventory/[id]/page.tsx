import { Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/storage";
import { deleteEquipmentAction } from "@/app/actions";
import ActionButton from "@/components/ActionButton";
import EquipmentForm from "@/components/EquipmentForm";
import { PageHeader } from "@/components/ui";

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await storage.equipment.get(id);
  if (!e) notFound();
  return (
    <>
      <PageHeader title={e.name} subtitle="Fiche équipement"
        actions={<ActionButton className="btn btn-danger" confirm={`Supprimer « ${e.name} » de l'inventaire ?`} action={deleteEquipmentAction.bind(null, e.id)}><Trash2 size={15} />Supprimer</ActionButton>} />
      <EquipmentForm id={e.id} initial={{ name: e.name, type: e.type, manufacturer: e.manufacturer, osVersion: e.osVersion, ipAddress: e.ipAddress, interfaces: e.interfaces, vlans: e.vlans, role: e.role, notes: e.notes }} />
      <section className="card mt-6 p-5">
        <h2 className="mb-2 font-semibold">Laboratoires associés</h2>
        {e.labs.length ? <ul className="list-disc pl-5 text-sm">{e.labs.map((l) => <li key={l.id}><Link className="text-brand-600 hover:underline dark:text-brand-400" href={`/labs/${l.id}`}>{l.title}</Link></li>)}</ul>
          : <p className="text-sm text-slate-500">Cet équipement n'est associé à aucun laboratoire.</p>}
      </section>
    </>
  );
}
