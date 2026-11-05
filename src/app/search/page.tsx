import { Search } from "lucide-react";
import Link from "next/link";
import { storage } from "@/storage";
import { Empty, PageHeader } from "@/components/ui";

const GROUPS = [["lab", "Laboratoires"], ["procedure", "Procédures"], ["command", "Commandes"], ["equipment", "Équipements"], ["document", "Documents"]] as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const hits = q.trim() ? await storage.search(q) : [];
  return (
    <>
      <PageHeader title="Recherche globale" subtitle={q ? `${hits.length} résultat(s) pour « ${q} »` : "Laboratoires, procédures, commandes, équipements et documents."} />
      <form className="mb-6"><div className="relative"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input name="q" defaultValue={q} autoFocus className="input !py-2.5 pl-10 text-base" placeholder="ex. : ospf, 192.168.30, ufw, VLAN 10…" aria-label="Recherche" /></div></form>
      {q && hits.length === 0 && <Empty title="Aucun résultat" hint="Essayez un autre mot-clé (la recherche ignore la casse)." />}
      <div className="space-y-6">
        {GROUPS.map(([type, title]) => {
          const g = hits.filter((h) => h.type === type);
          if (!g.length) return null;
          return (
            <section key={type}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title} ({g.length})</h2>
              <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                {g.map((h) => (
                  <li key={h.type + h.id}><Link href={h.href} className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="font-medium">{h.title}</span><span className="ml-2 text-xs text-slate-500">{h.subtitle}</span>
                    {h.excerpt && <span className={`mt-0.5 block truncate text-sm text-slate-500 ${h.type === "command" ? "font-mono text-xs" : ""}`}>{h.excerpt}</span>}
                  </Link></li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
