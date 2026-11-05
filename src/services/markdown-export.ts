import { CATEGORIES, LANGUAGES, STATUSES, label } from "@/domain/constants";
import type { Equipment, Lab, Procedure } from "@/domain/types";

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fence = (lang: string) => ({ cisco: "cisco", bash: "bash", powershell: "powershell", azure: "bash", text: "" } as Record<string, string>)[lang] ?? "";
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function slug(s: string) {
  return (
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sans-titre"
  );
}

/** Les images internes (/api/attachments/<id>) sont réécrites en chemins relatifs pour l'export. */
function rewriteImages(md: string, names: Map<string, string>) {
  return md.replace(/\/api\/attachments\/([a-z0-9]+)/gi, (m, id) => (names.has(id) ? `attachments/${names.get(id)}` : m));
}

export function attachmentExportName(a: { id: string; filename: string }) {
  return `${a.id.slice(-6)}-${a.filename}`;
}

function section(title: string, body: string) {
  return body.trim() ? `## ${title}\n\n${body.trim()}\n\n` : "";
}

export function labToMarkdown(lab: Lab): string {
  const names = new Map(lab.attachments.map((a) => [a.id, attachmentExportName(a)]));
  const r = (s: string) => rewriteImages(s, names);
  let md = `# ${lab.title}\n\n`;
  md += `- **Catégorie** : ${label(CATEGORIES, lab.category)}\n- **Statut** : ${label(STATUSES, lab.status)}\n- **Date** : ${fmtDate(lab.date)}\n\n`;
  md += section("Description", r(lab.description));
  md += section("Objectifs", r(lab.objectives));
  md += section("Prérequis", r(lab.prerequisites));
  const topo = lab.attachments.filter((a) => a.kind === "topology" || a.kind === "capture");
  let topoBody = r(lab.topologyNotes);
  for (const a of topo) if (/\.(png|jpe?g)$/i.test(a.filename) && !lab.topologyNotes.includes(a.id)) topoBody += `\n\n![${a.caption || a.filename}](attachments/${names.get(a.id)})`;
  md += section("Topologie", topoBody);
  if (lab.addressRows.length) {
    md += "## Plan d'adressage\n\n| Équipement | Interface | Adresse IP | Masque | Passerelle | VLAN | Notes |\n|---|---|---|---|---|---|---|\n";
    for (const a of lab.addressRows) md += `| ${esc(a.device)} | ${esc(a.interface)} | ${esc(a.ip)} | ${esc(a.mask)} | ${esc(a.gateway)} | ${esc(a.vlan)} | ${esc(a.notes)} |\n`;
    md += "\n";
  }
  if (lab.equipment.length) {
    md += "## Équipements associés\n\n" + lab.equipment.map((e) => `- **${e.name}** (${e.type}${e.ipAddress ? ", " + e.ipAddress : ""})${e.role ? " — " + e.role : ""}`).join("\n") + "\n\n";
  }
  md += section("Étapes de configuration", r(lab.configSteps));
  if (lab.commands.length) {
    md += "## Commandes\n\n";
    for (const c of lab.commands) {
      md += `### ${c.title || "Commande"} _(${label(LANGUAGES, c.language)})_\n\n\`\`\`${fence(c.language)}\n${c.code}\n\`\`\`\n\n`;
      if (c.explanation.trim()) md += `**Explication :** ${c.explanation.trim()}\n\n`;
    }
  }
  md += section("Tests et résultats", r(lab.tests));
  md += section("Problèmes rencontrés", r(lab.problems));
  md += section("Diagnostic et solutions", r(lab.diagnostics));
  md += section("Conclusion", r(lab.conclusion));
  if (lab.procedures.length) md += "## Procédures liées\n\n" + lab.procedures.map((p) => `- ${p.title}`).join("\n") + "\n\n";
  if (lab.attachments.length) md += "## Pièces jointes\n\n" + lab.attachments.map((a) => `- [${a.filename}](attachments/${names.get(a.id)})`).join("\n") + "\n\n";
  if (lab.revisions.length) md += "## Historique des modifications\n\n" + lab.revisions.map((v) => `- ${v.createdAt.toISOString().replace("T", " ").slice(0, 16)} — ${v.summary}`).join("\n") + "\n";
  return md;
}

export function procedureToMarkdown(p: Procedure): string {
  const names = new Map(p.attachments.map((a) => [a.id, attachmentExportName(a)]));
  let md = `# ${p.title}\n\n- **Catégorie** : ${label(CATEGORIES, p.category)}\n- **Plateforme** : ${p.platform}\n`;
  if (p.tags) md += `- **Mots-clés** : ${p.tags}\n`;
  if (p.isTemplate) md += "- **Modèle** : oui\n";
  md += "\n";
  md += section("Description", p.description);
  md += section("Contenu", rewriteImages(p.content, names));
  if (p.commands.length) {
    md += "## Commandes\n\n";
    for (const c of p.commands) {
      md += `### ${c.title || "Commande"}\n\n\`\`\`${fence(c.language)}\n${c.code}\n\`\`\`\n\n`;
      if (c.explanation.trim()) md += `**Explication :** ${c.explanation.trim()}\n\n`;
    }
  }
  return md;
}

export function inventoryToMarkdown(items: (Equipment & { labs?: { title: string }[] })[]): string {
  let md = "# Inventaire des équipements\n\n| Nom | Type | Fabricant | OS / Firmware | Adresse IP | Rôle | Laboratoires |\n|---|---|---|---|---|---|---|\n";
  for (const e of items) md += `| ${esc(e.name)} | ${esc(e.type)} | ${esc(e.manufacturer)} | ${esc(e.osVersion)} | ${esc(e.ipAddress)} | ${esc(e.role)} | ${esc((e.labs ?? []).map((l) => l.title).join(", "))} |\n`;
  md += "\n";
  for (const e of items) {
    if (!e.interfaces.trim() && !e.vlans.trim()) continue;
    md += `## ${e.name}\n\n`;
    if (e.interfaces.trim()) md += `**Interfaces**\n\n\`\`\`\n${e.interfaces.trim()}\n\`\`\`\n\n`;
    if (e.vlans.trim()) md += `**VLAN**\n\n\`\`\`\n${e.vlans.trim()}\n\`\`\`\n\n`;
  }
  return md;
}
