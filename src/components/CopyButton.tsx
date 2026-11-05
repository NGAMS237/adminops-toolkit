"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <button type="button" onClick={copy} className={`btn btn-sm ${className}`} aria-label="Copier le code">
      {done ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      {done ? "Copié" : "Copier"}
    </button>
  );
}
