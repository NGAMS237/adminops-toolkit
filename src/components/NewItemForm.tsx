"use client";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { CATEGORIES, PLATFORMS } from "@/domain/constants";

type Action = (data: { title: string; category: string; platform?: string; isTemplate?: boolean }) => Promise<unknown>;

/** Mini-formulaire de création (labo ou procédure) : crée la fiche puis ouvre l'éditeur. */
export default function NewItemForm({ action, kind }: { action: Action; kind: "lab" | "procedure" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("reseau");
  const [platform, setPlatform] = useState("cisco");
  const [template, setTemplate] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) return <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />{kind === "lab" ? "Nouveau laboratoire" : "Nouvelle procédure"}</button>;
  return (
    <form className="card flex w-full flex-wrap items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = (await action({ title, category, platform, isTemplate: template })) as { ok?: boolean; error?: string } | undefined;
          if (r && r.ok === false) setError(r.error ?? "Erreur");
        });
      }}>
      <div className="min-w-[220px] flex-1">
        <label className="label" htmlFor="ni-title">Titre</label>
        <input id="ni-title" className="input" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Configuration OSPF multi-zones" />
      </div>
      <div>
        <label className="label" htmlFor="ni-cat">Catégorie</label>
        <select id="ni-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      {kind === "procedure" && (
        <>
          <div>
            <label className="label" htmlFor="ni-plat">Plateforme</label>
            <select id="ni-plat" className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={template} onChange={(e) => setTemplate(e.target.checked)} />Modèle</label>
        </>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending || !title.trim()}>{pending ? "Création…" : "Créer et éditer"}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Annuler</button>
      </div>
      {error && <p className="w-full text-sm text-red-600" role="alert">{error}</p>}
    </form>
  );
}
