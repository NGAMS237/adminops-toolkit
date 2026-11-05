import { storage } from "@/storage";

export interface AppSettings {
  organization: string;
  author: string;
  footerText: string;
}
const DEFAULTS: AppSettings = { organization: "", author: "", footerText: "Document technique — usage interne" };

export async function getSettings(): Promise<AppSettings> {
  const all = await storage.settings.getAll();
  return {
    organization: all.organization ?? DEFAULTS.organization,
    author: all.author ?? DEFAULTS.author,
    footerText: all.footerText ?? DEFAULTS.footerText,
  };
}
export async function saveSettings(s: Partial<AppSettings>) {
  for (const [k, v] of Object.entries(s)) if (typeof v === "string") await storage.settings.set(k, v.slice(0, 300));
}
