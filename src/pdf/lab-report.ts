import PDFDocument from "pdfkit";
import { marked } from "marked";
import { CATEGORIES, LANGUAGES, STATUSES, label } from "@/domain/constants";
import type { Attachment, Lab, Procedure } from "@/domain/types";
import { pdfSafe } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = InstanceType<typeof PDFDocument>;

const PRIMARY = "#1e3a8a";
const ACCENT = "#2563eb";
const TEXT = "#1f2937";
const MUTED = "#64748b";
const LIGHT = "#f1f5f9";
const LINE = "#cbd5e1";
const CODE_BG = "#f3f4f6";
const CODE_TXT = "#111827";
const CODE_COMMENT = "#6b7280";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const L = 56;
const R = 56;
const TOP = 84;
const BOTTOM = 72;
const W = PAGE_W - L - R;

export interface ReportOptions {
  organization: string;
  author: string;
  footerText: string;
  procedures: Procedure[];
  /** id de pièce jointe -> contenu binaire (images PNG/JPEG) */
  images: Map<string, Buffer>;
}

type Run = { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: boolean; img?: { src: string; alt: string } };

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-CA", { year: "numeric", month: "long", day: "numeric" }).format(d);
const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("fr-CA", { dateStyle: "short", timeStyle: "short" }).format(d);
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function generateLabPdf(lab: Lab, opts: ReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc: Doc = new PDFDocument({
      size: "A4",
      margins: { top: TOP, bottom: BOTTOM, left: L, right: R },
      bufferPages: true,
      info: {
        Title: pdfSafe(lab.title),
        Author: pdfSafe(opts.author || opts.organization || "AdminOps Toolkit"),
        Subject: `Rapport de laboratoire — ${label(CATEGORIES, lab.category)}`,
        Creator: "AdminOps Toolkit",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      build(doc, lab, opts);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function build(doc: Doc, lab: Lab, opts: ReportOptions) {
  const toc: { label: string; page: number; level: number }[] = [];
  let sectionNo = 0;

  const pageIndex = () => doc.bufferedPageRange().count - 1;
  const bottomY = () => PAGE_H - BOTTOM;
  const ensureSpace = (h: number) => {
    if (doc.y + h > bottomY()) doc.addPage();
  };
  const t = (s: string) => pdfSafe(s);

  /* ------------------------------ Primitives ------------------------------ */
  function h1(title: string) {
    ensureSpace(110);
    if (doc.y > TOP + 4) doc.y += 10;
    sectionNo++;
    const lbl = `${sectionNo}. ${title}`;
    toc.push({ label: lbl, page: pageIndex(), level: 1 });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(PRIMARY).text(t(lbl), L, doc.y, { width: W });
    const y = doc.y + 2;
    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(1.2).strokeColor(ACCENT).stroke();
    doc.y = y + 10;
  }
  function h2(title: string, size = 11.5) {
    ensureSpace(60);
    doc.font("Helvetica-Bold").fontSize(size).fillColor(PRIMARY).text(t(title), L, doc.y, { width: W });
    doc.y += 3;
  }
  function para(text: string, size = 10, color = TEXT, italic = false, x = L, w = W) {
    doc.font(italic ? "Helvetica-Oblique" : "Helvetica").fontSize(size).fillColor(color).text(t(text), x, doc.y, { width: w, lineGap: 2 });
    doc.y += 4;
  }

  function drawImage(buf: Buffer, caption: string, x = L, w = W) {
    let img: any;
    try {
      img = (doc as any).openImage(buf);
    } catch {
      para(`[Image non affichable${caption ? " : " + caption : ""}]`, 9, MUTED, true, x, w);
      return;
    }
    const capH = caption ? 24 : 8;
    const avail = bottomY() - doc.y - capH;
    if (avail < 200) doc.addPage();
    const maxH = Math.min(470, bottomY() - doc.y - capH);
    const scale = Math.min(w / img.width, maxH / img.height, 1);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const y = doc.y;
    const ix = x + (w - iw) / 2;
    doc.save().rect(ix - 1, y - 1, iw + 2, ih + 2).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    (doc as any).image(buf, ix, y, { width: iw, height: ih });
    doc.y = y + ih + 6;
    if (caption) {
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTED).text(t(caption), x, doc.y, { width: w, align: "center" });
      doc.y += 6;
    }
  }

  function codeBlock(code: string, x = L, w = W, lang = "") {
    const fontSize = 8.5;
    const pad = 8;
    const lines = pdfSafe(code.replace(/\s+$/, "")).replace(/\t/g, "    ").split("\n");
    doc.font("Courier").fontSize(fontSize);
    ensureSpace(Math.min(lines.length, 3) * 12 + 14);
    doc.y += 2;
    const commentRe = lang === "cisco" ? /^\s*!/ : /^\s*(#|\/\/|REM\s)/i;
    lines.forEach((line, idx) => {
      const txt = line.length ? line : " ";
      doc.font("Courier").fontSize(fontSize);
      const h = doc.heightOfString(txt, { width: w - pad * 2, lineGap: 1.5 }) + (idx === 0 || idx === lines.length - 1 ? 4 : 0);
      if (doc.y + h > bottomY()) doc.addPage();
      const y = doc.y;
      doc.save().rect(x, y, w, h).fill(CODE_BG).restore();
      doc.save().rect(x, y, 2.5, h).fill(ACCENT).restore();
      const isComment = commentRe.test(line);
      doc.font("Courier").fontSize(fontSize).fillColor(isComment ? CODE_COMMENT : CODE_TXT)
        .text(txt, x + pad, y + (idx === 0 ? 3 : 0.5), { width: w - pad * 2, lineGap: 1.5 });
      doc.y = y + h;
    });
    doc.y += 8;
  }

  function table(headers: string[], rows: string[][], weights: number[], x = L, w = W, size = 8.5) {
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((wt) => (wt / total) * w);
    const padX = 4;
    const padY = 3.5;
    const rowHeight = (cells: string[], bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
      return Math.max(...cells.map((c, i) => doc.heightOfString(t(c) || " ", { width: widths[i] - padX * 2 }))) + padY * 2;
    };
    const drawRow = (cells: string[], y: number, h: number, kind: "head" | "even" | "odd") => {
      if (kind === "head") doc.save().rect(x, y, w, h).fill(PRIMARY).restore();
      else if (kind === "odd") doc.save().rect(x, y, w, h).fill(LIGHT).restore();
      let cx = x;
      cells.forEach((c, i) => {
        doc.font(kind === "head" ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(kind === "head" ? "#ffffff" : TEXT)
          .text(t(c), cx + padX, y + padY, { width: widths[i] - padX * 2, height: h - padY * 2, lineBreak: true });
        cx += widths[i];
      });
      doc.save().moveTo(x, y + h).lineTo(x + w, y + h).lineWidth(0.4).strokeColor(LINE).stroke().restore();
    };
    const headH = rowHeight(headers, true);
    ensureSpace(headH + (rows[0] ? rowHeight(rows[0]) : 0) + 4);
    let y = doc.y;
    drawRow(headers, y, headH, "head");
    y += headH;
    rows.forEach((r, i) => {
      const h = rowHeight(r);
      if (y + h > bottomY()) {
        doc.addPage();
        y = doc.y;
        drawRow(headers, y, headH, "head");
        y += headH;
      }
      drawRow(r, y, h, i % 2 ? "odd" : "even");
      y += h;
    });
    doc.y = y + 8;
  }

  /* ------------------------------ Markdown ------------------------------ */
  function inlineRuns(tokens: any[] | undefined, style: Partial<Run> = {}): Run[] {
    const out: Run[] = [];
    for (const tk of tokens ?? []) {
      switch (tk.type) {
        case "text":
        case "escape":
          if (tk.tokens?.length) out.push(...inlineRuns(tk.tokens, style));
          else out.push({ ...style, text: decodeEntities(tk.text ?? tk.raw ?? "") });
          break;
        case "strong": out.push(...inlineRuns(tk.tokens, { ...style, bold: true })); break;
        case "em": out.push(...inlineRuns(tk.tokens, { ...style, italic: true })); break;
        case "del": out.push(...inlineRuns(tk.tokens, style)); break;
        case "codespan": out.push({ ...style, code: true, text: decodeEntities(tk.text) }); break;
        case "link": out.push(...inlineRuns(tk.tokens, { ...style, link: true })); break;
        case "br": out.push({ ...style, text: "\n" }); break;
        case "image": out.push({ text: "", img: { src: tk.href, alt: tk.text || "" } }); break;
        case "html": break;
        default:
          if (tk.raw) out.push({ ...style, text: tk.raw });
      }
    }
    return out;
  }
  function decodeEntities(s: string) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function writeRuns(runs: Run[], x: number, w: number, size: number, color: string, baseItalic = false) {
    const rs = runs.filter((r) => r.text.length);
    rs.forEach((r, i) => {
      const it = r.italic || baseItalic;
      const font = r.code ? "Courier" : r.bold && it ? "Helvetica-BoldOblique" : r.bold ? "Helvetica-Bold" : it ? "Helvetica-Oblique" : "Helvetica";
      doc.font(font).fontSize(r.code ? size - 1 : size).fillColor(r.code ? "#9d174d" : r.link ? ACCENT : color);
      const o = { continued: i < rs.length - 1, width: w, lineGap: 2, underline: !!r.link };
      if (i === 0) doc.text(t(r.text), x, doc.y, o);
      else doc.text(t(r.text), o);
    });
    if (rs.length) doc.y += 3;
  }

  function imageFromSrc(src: string, alt: string, x: number, w: number) {
    const m = /\/api\/attachments\/([A-Za-z0-9]+)/.exec(src);
    const buf = m ? opts.images.get(m[1]) : undefined;
    if (buf) drawImage(buf, alt, x, w);
    else para(`[Image : ${alt || src}]`, 8.5, MUTED, true, x, w);
  }

  function inlineBlock(tokens: any[] | undefined, x: number, w: number, size = 10, color = TEXT, italic = false) {
    const runs = inlineRuns(tokens);
    let buf: Run[] = [];
    for (const r of runs) {
      if (r.img) {
        writeRuns(buf, x, w, size, color, italic);
        buf = [];
        imageFromSrc(r.img.src, r.img.alt, x, w);
      } else buf.push(r);
    }
    writeRuns(buf, x, w, size, color, italic);
  }

  function renderBlocks(tokens: any[], x: number, w: number, color = TEXT, italic = false) {
    for (const tk of tokens) {
      switch (tk.type) {
        case "heading": {
          const size = [0, 13, 12, 11, 10.5, 10, 10][tk.depth] ?? 10;
          ensureSpace(40);
          doc.y += 2;
          doc.font("Helvetica-Bold").fontSize(size).fillColor(PRIMARY).text(t(tk.text), x, doc.y, { width: w });
          doc.y += 3;
          break;
        }
        case "paragraph":
        case "text":
          inlineBlock(tk.tokens ?? [{ type: "text", text: tk.text }], x, w, 10, color, italic);
          break;
        case "code": codeBlock(tk.text, x, w, tk.lang ?? ""); break;
        case "list": {
          (tk.items as any[]).forEach((item, i) => {
            ensureSpace(24);
            const y = doc.y;
            const bullet = tk.ordered ? `${(Number(tk.start) || 1) + i}.` : "•";
            doc.font("Helvetica").fontSize(10).fillColor(color).text(bullet, x + 2, y, { width: 16, lineBreak: false });
            doc.y = y;
            renderBlocks(item.tokens, x + 18, w - 18, color, italic);
          });
          doc.y += 2;
          break;
        }
        case "blockquote": {
          const p0 = pageIndex();
          const y0 = doc.y;
          renderBlocks(tk.tokens, x + 12, w - 12, MUTED, true);
          if (pageIndex() === p0) doc.save().rect(x + 2, y0, 2.5, Math.max(doc.y - y0 - 3, 4)).fill(LINE).restore();
          break;
        }
        case "table": {
          const cellText = (c: any) => inlineRuns(c.tokens).map((r) => r.text).join("");
          const headers = (tk.header as any[]).map(cellText);
          const rows = (tk.rows as any[][]).map((r) => r.map(cellText));
          table(headers, rows, headers.map(() => 1), x, w);
          break;
        }
        case "hr":
          ensureSpace(14);
          doc.moveTo(x, doc.y + 4).lineTo(x + w, doc.y + 4).lineWidth(0.6).strokeColor(LINE).stroke();
          doc.y += 12;
          break;
        case "html": {
          const plain = decodeEntities(String(tk.text ?? "").replace(/<[^>]+>/g, "")).trim();
          if (plain) para(plain, 10, color, italic, x, w);
          break;
        }
        default: break;
      }
    }
  }

  function markdown(md: string) {
    if (!md.trim()) return;
    renderBlocks(marked.lexer(md) as any[], L, W);
  }

  /* ------------------------------ Contenu ------------------------------ */
  const referenced = new Set<string>();
  const mdFields = [lab.description, lab.objectives, lab.prerequisites, lab.topologyNotes, lab.configSteps, lab.tests, lab.problems, lab.diagnostics, lab.conclusion];
  for (const f of mdFields) for (const m of f.matchAll(/\/api\/attachments\/([A-Za-z0-9]+)/g)) referenced.add(m[1]);

  const isImg = (a: Attachment) => /\.(png|jpe?g)$/i.test(a.filename);
  const topoImgs = lab.attachments.filter((a) => a.kind === "topology" && isImg(a) && opts.images.has(a.id) && !referenced.has(a.id));
  const captureImgs = lab.attachments.filter((a) => a.kind !== "topology" && isImg(a) && opts.images.has(a.id) && !referenced.has(a.id));

  /* ---- Page de garde ---- */
  doc.rect(0, 0, PAGE_W, 270).fill(PRIMARY);
  doc.rect(0, 270, PAGE_W, 5).fill(ACCENT);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#bfdbfe")
    .text(t(`RAPPORT DE LABORATOIRE  ·  ${label(CATEGORIES, lab.category).toUpperCase()}`), L, 70, { width: W, characterSpacing: 1 });
  doc.font("Helvetica-Bold").fontSize(30).fillColor("#ffffff").text(t(lab.title), L, 110, { width: W, lineGap: 4, height: 130, ellipsis: true });
  if (lab.description.trim()) {
    const plain = lab.description.replace(/[#*`>_\[\]!]/g, "").replace(/\(\/api\/[^)]*\)/g, "").trim();
    doc.font("Helvetica").fontSize(11).fillColor("#dbeafe").text(t(plain), L, 222, { width: W, height: 34, ellipsis: true });
  }
  let cy = 310;
  const info: [string, string][] = [
    ["Catégorie", label(CATEGORIES, lab.category)],
    ["Statut", label(STATUSES, lab.status)],
    ["Date du laboratoire", fmtDate(lab.date)],
    ["Auteur", opts.author || "—"],
    ["Organisation", opts.organization || "—"],
    ["Équipements", lab.equipment.length ? lab.equipment.map((e) => e.name).join(", ") : "—"],
    ["Dernière modification", fmtDateTime(lab.updatedAt)],
  ];
  for (const [k, v] of info) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text(t(k.toUpperCase()), L, cy, { width: 150, characterSpacing: 0.5 });
    doc.font("Helvetica").fontSize(11.5).fillColor(TEXT).text(t(v), L + 160, cy - 2, { width: W - 160 });
    cy = Math.max(doc.y, cy + 18) + 8;
    doc.moveTo(L, cy - 5).lineTo(L + W, cy - 5).lineWidth(0.4).strokeColor(LINE).stroke();
  }
  {
    const m = doc.page.margins;
    const saved = m.bottom;
    m.bottom = 0;
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
      .text(t(`Généré le ${fmtDateTime(new Date())} avec AdminOps Toolkit`), L, PAGE_H - 60, { width: W, lineBreak: false });
    m.bottom = saved;
  }

  /* ---- Page sommaire (remplie à la fin) ---- */
  doc.addPage();
  doc.addPage(); // début du contenu (page index 2)

  const has = (s: string) => s.trim().length > 0;

  // 1. Informations générales
  h1("Informations générales");
  table(["Champ", "Valeur"], [
    ["Titre", lab.title],
    ["Catégorie", label(CATEGORIES, lab.category)],
    ["Statut", label(STATUSES, lab.status)],
    ["Date", fmtDate(lab.date)],
    ["Créé le", fmtDate(lab.createdAt)],
    ["Mis à jour le", fmtDateTime(lab.updatedAt)],
  ], [1, 3]);
  if (has(lab.description)) markdown(lab.description);

  if (has(lab.objectives)) { h1("Objectifs"); markdown(lab.objectives); }
  if (has(lab.prerequisites)) { h1("Prérequis"); markdown(lab.prerequisites); }

  if (has(lab.topologyNotes) || topoImgs.length) {
    h1("Topologie");
    markdown(lab.topologyNotes);
    for (const a of topoImgs) drawImage(opts.images.get(a.id)!, a.caption || a.filename);
  }

  if (lab.addressRows.length) {
    h1("Plan d'adressage");
    const cols: { h: string; k: keyof Lab["addressRows"][number]; w: number }[] = [
      { h: "Équipement", k: "device", w: 17 }, { h: "Interface", k: "interface", w: 13 }, { h: "Adresse IP", k: "ip", w: 15 },
      { h: "Masque", k: "mask", w: 15 }, { h: "Passerelle", k: "gateway", w: 15 }, { h: "VLAN", k: "vlan", w: 7 }, { h: "Notes", k: "notes", w: 18 },
    ];
    const used = cols.filter((c) => lab.addressRows.some((r) => String(r[c.k]).trim()));
    table(used.map((c) => c.h), lab.addressRows.map((r) => used.map((c) => String(r[c.k]))), used.map((c) => c.w));
  }

  if (lab.equipment.length) {
    h1("Équipements associés");
    table(["Nom", "Type", "Fabricant", "OS / Firmware", "Adresse IP", "Rôle"],
      lab.equipment.map((e) => [e.name, e.type, e.manufacturer, e.osVersion, e.ipAddress, e.role]), [16, 11, 14, 19, 15, 25]);
  }

  if (has(lab.configSteps)) { h1("Étapes de configuration"); markdown(lab.configSteps); }

  if (lab.commands.length) {
    h1("Commandes et explications");
    lab.commands.forEach((c, i) => {
      ensureSpace(70);
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT).text(t(`${i + 1}. ${c.title || "Commande"}`), L, y, { width: W - 90, lineBreak: true });
      const after = doc.y;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(ACCENT).text(t(label(LANGUAGES, c.language)), L + W - 88, y + 2, { width: 88, align: "right", lineBreak: false });
      doc.y = after + 3;
      codeBlock(c.code, L, W, c.language);
      if (has(c.explanation)) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(PRIMARY).text("Explication", L, doc.y, { width: W });
        doc.y += 1;
        markdownInline(c.explanation);
      }
      doc.y += 6;
    });
  }
  function markdownInline(md: string) {
    renderBlocks(marked.lexer(md) as any[], L, W);
  }

  if (has(lab.tests)) { h1("Tests et résultats"); markdown(lab.tests); }
  if (has(lab.problems)) { h1("Problèmes rencontrés"); markdown(lab.problems); }
  if (has(lab.diagnostics)) { h1("Diagnostic et solutions"); markdown(lab.diagnostics); }
  if (has(lab.conclusion)) { h1("Conclusion"); markdown(lab.conclusion); }

  if (captureImgs.length) {
    h1("Captures d'écran");
    for (const a of captureImgs) drawImage(opts.images.get(a.id)!, a.caption || a.filename);
  }

  if (opts.procedures.length) {
    h1("Procédures de référence");
    for (const p of opts.procedures) {
      h2(p.title, 12);
      para(`${label(CATEGORIES, p.category)} · ${p.platform}${p.tags ? " · " + p.tags : ""}`, 8.5, MUTED);
      if (has(p.description)) para(p.description);
      markdown(p.content);
      p.commands.forEach((c) => {
        ensureSpace(60);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT).text(t(c.title || "Commande"), L, doc.y, { width: W });
        doc.y += 2;
        codeBlock(c.code, L, W, c.language);
        if (has(c.explanation)) markdownInline(c.explanation);
      });
      doc.y += 6;
    }
  }

  const files = lab.attachments;
  if (files.length) {
    h1("Pièces jointes");
    table(["Fichier", "Type", "Taille", "Description"], files.map((a) => [
      a.filename, a.kind === "topology" ? "Topologie" : a.kind === "capture" ? "Capture" : "Fichier", fmtSize(a.size),
      /\.pkt$/i.test(a.filename) ? (a.caption ? a.caption + " — " : "") + "Fichier Packet Tracer conservé tel quel (non analysé)" : a.caption,
    ]), [34, 12, 10, 44]);
  }

  if (lab.revisions.length) {
    h1("Historique des modifications");
    table(["Date", "Modification"], lab.revisions.slice(0, 60).map((r) => [fmtDateTime(r.createdAt), r.summary]), [1, 3.5]);
  }

  /* ---- Sommaire ---- */
  const total = pageIndex() + 1;
  doc.switchToPage(1);
  doc.y = TOP;
  doc.font("Helvetica-Bold").fontSize(20).fillColor(PRIMARY).text("Sommaire", L, TOP, { width: W });
  doc.moveTo(L, doc.y + 4).lineTo(L + 60, doc.y + 4).lineWidth(2.5).strokeColor(ACCENT).stroke();
  let ty = doc.y + 24;
  for (const e of toc) {
    if (ty > bottomY() - 20) break;
    doc.font("Helvetica").fontSize(11).fillColor(TEXT);
    const label = t(e.label);
    const num = String(e.page + 1);
    const lw = doc.widthOfString(label);
    const nw = doc.widthOfString(num);
    doc.text(label, L, ty, { lineBreak: false });
    // points de conduite
    const dotsW = W - lw - nw - 12;
    if (dotsW > 10) {
      const dotUnit = doc.widthOfString(".");
      doc.fillColor(LINE).text(".".repeat(Math.floor(dotsW / dotUnit)), L + lw + 6, ty, { lineBreak: false });
    }
    doc.fillColor(TEXT).text(num, L + W - nw, ty, { lineBreak: false });
    ty += 24;
  }

  /* ---- En-tête / pied de page ---- */
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    const m = doc.page.margins;
    const saved = { ...m };
    m.top = 0; m.bottom = 0;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(PRIMARY)
      .text(t(lab.title), L, 34, { width: W * 0.65, lineBreak: false, ellipsis: true });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
      .text(t(opts.organization || "AdminOps Toolkit"), L + W * 0.65, 34, { width: W * 0.35, align: "right", lineBreak: false, ellipsis: true });
    doc.moveTo(L, 50).lineTo(L + W, 50).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.moveTo(L, PAGE_H - 52).lineTo(L + W, PAGE_H - 52).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(t(`${opts.footerText}  ·  ${fmtDate(new Date())}`), L, PAGE_H - 42, { width: W * 0.75, lineBreak: false, ellipsis: true });
    doc.text(`Page ${i + 1} / ${total}`, L + W - 90, PAGE_H - 42, { width: 90, align: "right", lineBreak: false });
    Object.assign(m, saved);
  }
  doc.flushPages();
}
