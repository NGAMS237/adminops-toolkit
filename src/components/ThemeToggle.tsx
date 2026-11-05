"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle({ full = false }: { full?: boolean }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { setMode((localStorage.getItem("theme") as Mode) || "system"); } catch { /* ignoré */ }
  }, []);
  function choose(m: Mode) {
    setMode(m);
    try { localStorage.setItem("theme", m); } catch { /* ignoré */ }
    apply(m);
  }
  const opts: { m: Mode; icon: React.ReactNode; label: string }[] = [
    { m: "light", icon: <Sun size={15} />, label: "Clair" },
    { m: "dark", icon: <Moon size={15} />, label: "Sombre" },
    { m: "system", icon: <Monitor size={15} />, label: "Système" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Thème">
      {opts.map((o) => (
        <button key={o.m} type="button" onClick={() => choose(o.m)} title={o.label} aria-pressed={mode === o.m}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${mode === o.m ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
          {o.icon}{full && o.label}
        </button>
      ))}
    </div>
  );
}
