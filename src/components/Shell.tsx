"use client";
import { BookOpen, FileText, FlaskConical, LayoutDashboard, Menu, Search, Server, Settings, Terminal, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/labs", label: "Laboratoires", icon: FlaskConical },
  { href: "/procedures", label: "Procédures", icon: BookOpen },
  { href: "/inventory", label: "Inventaire", icon: Server },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-screen lg:flex">
      {/* Barre mobile */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <button className="btn btn-ghost" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button>
        <span className="font-semibold">AdminOps Toolkit</span>
        <Link href="/search" className="btn btn-ghost" aria-label="Rechercher"><Search size={20} /></Link>
      </div>

      {open && <div className="no-print fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Terminal size={18} /></span>
            <span className="text-base font-bold leading-tight">AdminOps<br /><span className="text-xs font-medium text-slate-500">Toolkit</span></span>
          </Link>
          <button className="btn btn-ghost lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button>
        </div>
        <form className="px-4 pb-3" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); setOpen(false); } }}>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input className="input pl-8" placeholder="Recherche globale…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche globale" />
          </div>
        </form>
        <nav className="flex-1 space-y-1 px-3" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active(href) ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <span className="text-xs text-slate-500">v1.0 · local</span>
          <ThemeToggle />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
