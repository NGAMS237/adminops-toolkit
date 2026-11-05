import { BookOpen, FileText, FlaskConical, Search, Server } from "lucide-react";
import Link from "next/link";
import { CATEGORIES } from "@/domain/constants";
import { storage } from "@/storage";
import { CategoryBadge, PageHeader, fmtDateTime } from "@/components/ui";

const TYPE_LABEL = { lab: "Laboratoire", procedure: "Procédure", equipment: "Équipement" } as const;

export default async function Dashboard() {
  const s = await storage.stats();
  const cards = [
    { label: "Laboratoires", value: s.labs, sub: s.archivedLabs ? `${s.archivedLabs} archivé(s)` : "actifs", icon: FlaskConical, href: "/labs" },
    { label: "Procédures", value: s.procedures, sub: "bibliothèque", icon: BookOpen, href: "/procedures" },
    { label: "Équipements", value: s.equipment, sub: "inventaire", icon: Server, href: "/inventory" },
    { label: "Pièces jointes", value: s.attachments, sub: "documents", icon: FileText, href: "/documents" },
  ];
  const max = Math.max(1, ...s.byCategory.map((c) => c.count));
  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre documentation d'infrastructure." />
      <form action="/search" className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input name="q" className="input !py-2.5 pl-10 text-base" placeholder="Rechercher un laboratoire, une commande, une adresse IP, un équipement…" aria-label="Recherche globale" />
        </div>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, href }) => (
          <Link key={label} href={href} className="card flex items-center gap-4 p-5 transition hover:border-brand-400">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon size={22} /></span>
            <div><p className="text-3xl font-bold leading-none">{value}</p><p className="mt-1 text-sm font-medium">{label}</p><p className="text-xs text-slate-500">{sub}</p></div>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Dernières modifications</h2>
          {s.recent.length === 0 ? <p className="text-sm text-slate-500">Rien pour l'instant. Créez votre premier laboratoire.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.recent.map((r) => (
                <li key={r.type + r.id}>
                  <Link href={r.href} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-600">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.title}</span><span className="text-xs text-slate-500">{TYPE_LABEL[r.type]}</span></span>
                    <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(r.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Laboratoires par catégorie</h2>
          <ul className="space-y-3">
            {CATEGORIES.map((c) => {
              const n = s.byCategory.find((x) => x.category === c.value)?.count ?? 0;
              return (
                <li key={c.value}>
                  <Link href={`/labs?category=${c.value}`} className="block">
                    <div className="mb-1 flex items-center justify-between text-sm"><CategoryBadge value={c.value} /><span className="font-medium">{n}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(n / max) * 100}%` }} /></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
