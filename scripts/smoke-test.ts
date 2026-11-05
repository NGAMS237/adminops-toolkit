/**
 * Tests d'intégration (couche services + stockage) sur une base SQLite TEMPORAIRE.
 * N'affecte jamais vos données : data/adminops.db n'est pas touchée.
 * Lancer : npm test
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { makePng } from "./make-test-png";

const root = process.cwd();
process.env.DATABASE_URL = "file:../data/test.db";
process.env.UPLOAD_DIR = "./data/test-uploads";
for (const f of ["data/test.db", "data/test.db-journal"]) rmSync(path.join(root, f), { force: true });
rmSync(path.join(root, "data/test-uploads"), { recursive: true, force: true });
execSync("npx prisma migrate deploy", { stdio: "pipe", env: process.env });

let pass = 0, failed = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${extra}`); }
};
const throws = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };

async function main() {
  const { storage, fileStore } = await import("../src/storage");
  const labs = await import("../src/services/labs");
  const procs = await import("../src/services/procedures");
  const att = await import("../src/services/attachments");
  const backup = await import("../src/services/backup");
  const { buildLabPdf } = await import("../src/services/lab-pdf");
  const { labToMarkdown } = await import("../src/services/markdown-export");
  const { prisma } = await import("../src/lib/db");

  console.log("\n— Laboratoires (CRUD)");
  const eq = await storage.equipment.create({ name: "R1", type: "routeur", manufacturer: "Cisco", osVersion: "IOS 15", ipAddress: "10.0.0.1", interfaces: "Gi0/0", vlans: "10", role: "Edge", notes: "" });
  const lab = await labs.createLab({
    title: "Lab test", category: "reseau", description: "desc", objectives: "- a\n- b",
    addressRows: [{ device: "R1", interface: "Gi0/0", ip: "10.0.0.1", mask: "255.255.255.0", gateway: "", vlan: "10", notes: "" }],
    commands: [{ title: "VLAN", language: "cisco", code: "vlan 10\n name TEST", explanation: "Crée le VLAN" }],
    equipmentIds: [eq.id], tests: "| a | b |\n|---|---|\n| 1 | 2 |",
  });
  check("création", !!lab.id && lab.commands.length === 1 && lab.equipment.length === 1);
  check("titre vide refusé", await throws(() => labs.createLab({ title: "  ", category: "reseau" })));
  check("catégorie invalide refusée", await throws(() => labs.createLab({ title: "x", category: "nope" })));

  const fresh = (await storage.labs.get(lab.id))!;
  const same = {
    ...fresh, date: fresh.date, addressRows: fresh.addressRows, commands: fresh.commands,
    equipmentIds: fresh.equipment.map((e) => e.id), procedureIds: [],
  };
  await labs.updateLab(lab.id, same);
  check("enregistrement sans changement : pas de fausse révision", (await storage.labs.listRevisions(lab.id)).length === 1);

  await labs.updateLab(lab.id, { ...same, conclusion: "Fin", title: "Lab test v2" });
  const revs = await storage.labs.listRevisions(lab.id);
  check("révision après modification", revs.length === 2 && /titre/.test(revs[0].summary) && /conclusion/.test(revs[0].summary), revs[0]?.summary);
  check("recherche par commande", (await storage.search("name TEST")).some((h) => h.type === "command"));
  check("recherche par IP d'équipement", (await storage.search("10.0.0.1")).some((h) => h.type === "equipment"));
  check("filtre catégorie", (await storage.labs.list({ category: "linux" })).length === 0 && (await storage.labs.list({ category: "reseau" })).length === 1);

  console.log("\n— Imports / pièces jointes");
  const png = await att.saveUpload({ name: "topo.png", buffer: makePng(), labId: lab.id, kind: "topology" });
  const pkt = await att.saveUpload({ name: "lab.pkt", buffer: Buffer.from("PKT-BINAIRE-OPAQUE"), labId: lab.id });
  const txt = await att.saveUpload({ name: "notes.txt", buffer: Buffer.from("texte"), labId: null });
  await att.saveUpload({ name: "n.md", buffer: Buffer.from("# md"), labId: lab.id });
  check("png accepté", png.mime === "image/png" && await fileStore.exists(png.storedName));
  check(".pkt conservé tel quel (non analysé)", (await fileStore.read(pkt.storedName)).toString() === "PKT-BINAIRE-OPAQUE");
  check("document libre (sans parent)", txt.labId === null);
  check(".exe refusé", await throws(() => att.saveUpload({ name: "x.exe", buffer: Buffer.from("MZ"), labId: lab.id })));
  check("faux PNG refusé (signature)", await throws(() => att.saveUpload({ name: "fake.png", buffer: Buffer.from("pas un png"), labId: lab.id })));
  check("fichier vide refusé", await throws(() => att.saveUpload({ name: "e.txt", buffer: Buffer.alloc(0), labId: lab.id })));
  check("traversée de chemin neutralisée", att.sanitizeFilename("../../etc/passwd") === "passwd");

  console.log("\n— Procédures");
  const proc = await storage.procedures.create(procs.parseProcedureInput({ title: "OSPF", category: "reseau", platform: "cisco", tags: "ospf", isTemplate: true,
    commands: [{ title: "router", language: "cisco", code: "router ospf 1", explanation: "" }] }));
  const copy = await procs.duplicateProcedure(proc.id);
  check("duplication procédure", copy.commands.length === 1 && copy.title.includes("copie") && !copy.isTemplate);
  check("recherche procédure par commande", (await storage.procedures.list({ q: "router ospf" })).length === 2);
  check("filtre modèles", (await storage.procedures.list({ templatesOnly: true })).length === 1);
  const cur = (await storage.labs.get(lab.id))!;
  await labs.updateLab(lab.id, { ...cur, addressRows: cur.addressRows, commands: cur.commands, equipmentIds: cur.equipment.map((e) => e.id), procedureIds: [proc.id] });
  const withProc = (await storage.labs.get(lab.id))!;
  check("procédure réutilisée dans un labo", withProc.procedures.length === 1 && (await storage.procedures.get(proc.id))!.labs.length === 1);
  await labs.importProcedureCommands(lab.id, (await storage.procedures.get(proc.id))!);
  check("import des commandes d'une procédure", (await storage.labs.get(lab.id))!.commands.length === 2);

  console.log("\n— Duplication / archivage / suppression");
  const dup = await labs.duplicateLab(lab.id);
  const dupFull = (await storage.labs.get(dup.id))!;
  check("duplication labo (données + pièces jointes copiées)", dupFull.commands.length === 2 && dupFull.attachments.length === 3 && dupFull.attachments[0].storedName !== png.storedName);
  await labs.setArchived(dup.id, true);
  check("archivage", (await storage.labs.list({ archived: true })).length === 1 && (await storage.labs.list({ archived: false })).length === 1);
  const dupFiles = dupFull.attachments.map((a) => a.storedName);
  await labs.deleteLab(dup.id);
  check("suppression (fichiers du disque supprimés)", !(await storage.labs.get(dup.id)) && !(await fileStore.exists(dupFiles[0])));
  check("l'original n'est pas affecté", await fileStore.exists(png.storedName));

  console.log("\n— PDF");
  const full = (await storage.labs.get(lab.id))!;
  const pdf = await buildLabPdf(full);
  const txtPdf = pdf.toString("latin1");
  const pages = (txtPdf.match(/\/Type \/Page\b/g) ?? []).length;
  check("PDF valide (%PDF-, EOF)", pdf.subarray(0, 5).toString() === "%PDF-" && txtPdf.includes("%%EOF"));
  check("format A4 (595.28 x 841.89)", /\/MediaBox \[0 0 595\.28 841\.89\]/.test(txtPdf));
  check(`pagination (${pages} pages)`, pages >= 3);
  check("image de topologie intégrée", /\/Subtype \/Image/.test(txtPdf));
  const big = await storage.labs.create({ ...parseBig(full) });
  check("PDF long : plusieurs pages", (await buildLabPdf((await storage.labs.get(big.id))!)).toString("latin1").match(/\/Type \/Page\b/g)!.length > 8);
  const md = labToMarkdown(full);
  check("export Markdown du labo", md.includes("# Lab test v2") && md.includes("| R1 | Gi0/0 |") && md.includes("```cisco"));

  console.log("\n— Sauvegarde / restauration / persistance");
  const zip = await backup.buildBackupZip();
  const countBefore = (await storage.labs.list()).length;
  await labs.deleteLab(lab.id);
  await storage.equipment.delete(eq.id);
  check("données supprimées avant restauration", (await storage.labs.get(lab.id)) === null && !(await fileStore.exists(png.storedName)));
  const r = await backup.restoreBackup(zip);
  const restored = await storage.labs.get(lab.id);
  check("restauration des données", !!restored && restored.title === "Lab test v2" && restored.commands.length === 2 && restored.equipment.length === 1, JSON.stringify(r));
  check("restauration des pièces jointes", await fileStore.exists(png.storedName) && (await fileStore.exists(pkt.storedName)));
  check("même nombre de labos", (await storage.labs.list()).length === countBefore);
  check("sauvegarde de sécurité créée avant restauration", (await backup.listBackupFiles()).length >= 1);
  check("zip invalide refusé", await throws(() => backup.restoreBackup(Buffer.from("pas un zip"))));
  const { PrismaClient } = await import("@prisma/client");
  const other = new PrismaClient();
  check("persistance (nouvelle connexion)", (await other.lab.count()) === countBefore);
  await other.$disconnect();
  const json = await backup.buildJsonExport();
  check("export JSON complet", JSON.parse(json).tables.lab.length === countBefore);
  const mdzip = await backup.buildMarkdownZip();
  check("export Markdown ZIP", mdzip.length > 500);

  await prisma.$disconnect();
  console.log(`\n${failed === 0 ? "✅" : "❌"} ${pass} tests réussis, ${failed} échec(s)`);
  for (const f of ["data/test.db", "data/test.db-journal"]) rmSync(path.join(root, f), { force: true });
  rmSync(path.join(root, "data/test-uploads"), { recursive: true, force: true });
  if (existsSync(path.join(root, "data/backups"))) {
    // supprime uniquement les sauvegardes de sécurité créées par ce test (< 2 min)
    const { readdirSync, statSync } = await import("node:fs");
    for (const n of readdirSync(path.join(root, "data/backups"))) {
      const p = path.join(root, "data/backups", n);
      if (Date.now() - statSync(p).mtimeMs < 120000 && n.startsWith("adminops-backup-")) rmSync(p, { force: true });
    }
  }
  process.exit(failed ? 1 : 0);
}

/** Labo volumineux (80 blocs de commandes) pour tester la pagination. */
function parseBig(base: { category: string; date: Date }) {
  const long = Array.from({ length: 80 }, (_, i) => `interface Gi0/${i}\n description lien ${i}\n ip address 10.${i}.0.1 255.255.255.0\n no shutdown`).join("\n");
  return {
    title: "Labo volumineux", category: base.category, status: "termine", date: base.date,
    description: "", objectives: "", prerequisites: "", topologyNotes: "", configSteps: "", tests: "", problems: "", diagnostics: "", conclusion: "",
    addressRows: Array.from({ length: 60 }, (_, i) => ({ device: `SW${i}`, interface: `Vlan${i}`, ip: `10.0.${i}.1`, mask: "255.255.255.0", gateway: "", vlan: String(i), notes: "ligne " + i })),
    commands: [{ title: "Gros bloc", language: "cisco", code: long, explanation: "Un très long bloc qui doit se répartir sur plusieurs pages." }],
    equipmentIds: [], procedureIds: [],
  };
}

main().catch((e) => { console.error("ERREUR FATALE", e); process.exit(1); });
