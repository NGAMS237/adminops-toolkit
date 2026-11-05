import Link from "next/link";
import { CATEGORIES, STATUSES, label } from "@/domain/constants";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  reseau: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  linux: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  windows: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  azure: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  securite: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  scripts: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};
export const CategoryBadge = ({ value }: { value: string }) => (
  <span className={`badge ${CAT_COLORS[value] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{label(CATEGORIES, value)}</span>
);
const ST_COLORS: Record<string, string> = {
  brouillon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  termine: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};
export const StatusBadge = ({ value }: { value: string }) => <span className={`badge ${ST_COLORS[value] ?? ST_COLORS.brouillon}`}>{label(STATUSES, value)}</span>;
export const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{children}</span>
);

export function Empty({ title, hint, href, cta }: { title: string; hint?: string; href?: string; cta?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      {href && <Link href={href} className="btn btn-primary mt-2">{cta}</Link>}
    </div>
  );
}

export const fmtDate = (d: Date) => new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium" }).format(d);
export const fmtDateTime = (d: Date) => new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
