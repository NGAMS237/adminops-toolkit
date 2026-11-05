"use client";
import { useTransition } from "react";

/** Bouton déclenchant une server action (liée), avec confirmation optionnelle. */
export default function ActionButton({
  action, confirm: msg, children, className = "btn", title,
}: {
  action: () => Promise<unknown>;
  confirm?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={className} title={title} disabled={pending}
      onClick={() => {
        if (msg && !window.confirm(msg)) return;
        start(async () => { await action(); });
      }}>
      {children}
    </button>
  );
}
