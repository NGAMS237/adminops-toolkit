import Link from "next/link";
import { CATEGORIES, STATUSES } from "@/domain/constants";
import { storage } from "@/storage";
import { createLabAction } from "@/app/actions";
import NewItemForm from "@/components/NewItemForm";
import { CategoryBadge, Empty, PageHeader, Pill, StatusBadge, fmtDate } from "@/components/ui";

export default async function LabsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string; archived?: string }> }) {
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const labs = await storage.labs.list({ q: sp.q, category: sp.category || undefined, status: sp.status || undefined, archived });
  return (
    <>
      <PageHeader title="Laboratoires" subtitle={archived ? "Laboratoires archivés" : "Vos laboratoires et fiches de documentation."} actions={<NewItemForm kind="lab" action={createLabAction} />} />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1"><label className="label" htmlFor="q">Recherche</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="Titre, commande, équipement…" /></div>
        <div><label className="label" htmlFor="category">Catégorie</label>
          <select id="category" name="category" defaultValue={sp.category ?? ""} className="input"><option value="">Toutes</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="status">Statut</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Tous</option>{STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="archived" value="1" defaultChecked={archived} />Archivés</label>
        <button className="btn btn-primary">Filtrer</button>
        <Link href="/labs" className="btn">Réinitialiser</Link>
      </form>
      {labs.length === 0 ? (
        <Empty title="Aucun laboratoire" hint={archived ? "Aucune archive pour ces critères." : "Créez un laboratoire ou modifiez les filtres."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {labs.map((l) => (
            <Link key={l.id} href={`/labs/${l.id}`} className="card block p-5 transition hover:border-brand-400">
              <div className="mb-2 flex flex-wrap items-center gap-2"><CategoryBadge value={l.category} /><StatusBadge value={l.status} />{l.archived && <Pill>Archivé</Pill>}</div>
              <h3 className="font-semibold leading-snug">{l.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{l.description || "Pas de description."}</p>
              <p className="mt-3 text-xs text-slate-500">{fmtDate(l.date)} · {l.counts.commands} bloc(s) de commandes · {l.counts.equipment} équipement(s) · {l.counts.attachments} fichier(s)</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
