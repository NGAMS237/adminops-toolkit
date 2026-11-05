import Link from "next/link";
import { CATEGORIES, PLATFORMS, label } from "@/domain/constants";
import { storage } from "@/storage";
import { createProcedureAction } from "@/app/actions";
import NewItemForm from "@/components/NewItemForm";
import { CategoryBadge, Empty, PageHeader, Pill, fmtDate } from "@/components/ui";

export default async function ProceduresPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; platform?: string; equipment?: string; templates?: string }> }) {
  const sp = await searchParams;
  const list = await storage.procedures.list({ q: sp.q, category: sp.category || undefined, platform: sp.platform || undefined, equipment: sp.equipment || undefined, templatesOnly: sp.templates === "1" });
  return (
    <>
      <PageHeader title="Bibliothèque de procédures" subtitle="Procédures et modèles réutilisables dans plusieurs laboratoires." actions={<NewItemForm kind="procedure" action={createProcedureAction} />} />
      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="lg:col-span-2"><label className="label" htmlFor="q">Mot-clé / commande</label><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="ex. : switchport trunk, ufw, Install-ADDS" /></div>
        <div><label className="label" htmlFor="category">Catégorie</label><select id="category" name="category" defaultValue={sp.category ?? ""} className="input"><option value="">Toutes</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="platform">Plateforme</label><select id="platform" name="platform" defaultValue={sp.platform ?? ""} className="input"><option value="">Toutes</option>{PLATFORMS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="equipment">Équipement</label><input id="equipment" name="equipment" defaultValue={sp.equipment} className="input" placeholder="ex. : router, 2960" /></div>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="templates" value="1" defaultChecked={sp.templates === "1"} />Modèles</label><button className="btn btn-primary">Filtrer</button></div>
      </form>
      {list.length === 0 ? <Empty title="Aucune procédure trouvée" hint="Modifiez les filtres ou créez une procédure." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <Link key={p.id} href={`/procedures/${p.id}`} className="card block p-5 transition hover:border-brand-400">
              <div className="mb-2 flex flex-wrap items-center gap-2"><CategoryBadge value={p.category} /><Pill>{label(PLATFORMS, p.platform)}</Pill>{p.isTemplate && <span className="badge bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">Modèle</span>}</div>
              <h3 className="font-semibold leading-snug">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{p.description || "—"}</p>
              <p className="mt-3 text-xs text-slate-500">{p.commandCount} bloc(s) · utilisée dans {p.labCount} labo(s) · {fmtDate(p.updatedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
