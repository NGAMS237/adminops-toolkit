/** Les polices PDF standard (Helvetica/Courier) utilisent l'encodage WinAnsi : on normalise les caractères hors jeu. */
const MAP: Record<string, string> = {
  "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "✓": "OK", "✔": "OK", "✗": "x", "✘": "x", "≥": ">=", "≤": "<=",
  "≠": "!=", " ": " ", " ": " ", "​": "", "﻿": "", "−": "-", "‑": "-", "′": "'", "″": '"',
  "│": "|", "─": "-", "├": "+", "└": "+", "┌": "+", "┐": "+", "┘": "+", "┤": "+", "┬": "+", "┴": "+", "┼": "+",
};
const ALLOWED_HIGH = new Set(["‘", "’", "“", "”", "•", "–", "—", "…", "€", "™"]);

export function pdfSafe(input: string): string {
  let out = "";
  for (const ch of input.replace(/\r\n?/g, "\n")) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (ch === "\n" || ch === "\t") out += ch;
    else {
      const c = ch.codePointAt(0)!;
      if (c < 32) continue;
      if (c <= 0xff || ALLOWED_HIGH.has(ch)) out += ch;
      else out += "?";
    }
  }
  return out;
}
