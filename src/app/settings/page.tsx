import { listBackupFiles } from "@/services/backup";
import { getSettings } from "@/services/settings";
import { BackupPanel, SettingsForm, ThemeCard } from "@/components/SettingsClient";
import { PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  const [settings, backups] = await Promise.all([getSettings(), listBackupFiles()]);
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Apparence, rapports PDF, exports et sauvegardes locales." />
      <div className="space-y-5">
        <ThemeCard />
        <SettingsForm initial={settings} />
        <BackupPanel backups={backups.map((b) => ({ name: b.name, size: b.size, date: b.date.toISOString() }))} />
        <div className="card p-5 text-sm text-slate-600 dark:text-slate-400">
          <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">Données locales</h2>
          <p>Base SQLite : <code>data/adminops.db</code> · Pièces jointes : <code>data/uploads/</code> · Sauvegardes : <code>data/backups/</code>. Le dossier <code>data/</code> et les fichiers <code>.env</code> sont exclus de Git.</p>
        </div>
      </div>
    </>
  );
}
