export const CATEGORIES = [
  { value: "reseau", label: "Réseau" },
  { value: "linux", label: "Linux" },
  { value: "windows", label: "Windows Server" },
  { value: "azure", label: "Azure" },
  { value: "securite", label: "Sécurité" },
  { value: "scripts", label: "Scripts" },
] as const;

export const STATUSES = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
] as const;

export const LANGUAGES = [
  { value: "cisco", label: "Cisco IOS" },
  { value: "bash", label: "Bash" },
  { value: "powershell", label: "PowerShell" },
  { value: "azure", label: "Azure CLI" },
  { value: "text", label: "Texte brut" },
] as const;

export const PLATFORMS = [
  { value: "cisco", label: "Cisco IOS" },
  { value: "bash", label: "Bash" },
  { value: "powershell", label: "PowerShell" },
  { value: "azure", label: "Azure CLI" },
  { value: "autre", label: "Autre" },
] as const;

export const EQUIPMENT_TYPES = [
  { value: "routeur", label: "Routeur" },
  { value: "switch", label: "Switch" },
  { value: "pare-feu", label: "Pare-feu" },
  { value: "serveur", label: "Serveur" },
  { value: "poste", label: "Poste client" },
  { value: "vm", label: "Machine virtuelle" },
  { value: "cloud", label: "Ressource cloud" },
  { value: "autre", label: "Autre" },
] as const;

export const ATTACHMENT_KINDS = [
  { value: "topology", label: "Topologie" },
  { value: "capture", label: "Capture" },
  { value: "file", label: "Fichier" },
] as const;

/** Extensions autorisées à l'import. */
export const ALLOWED_EXTENSIONS = [".txt", ".md", ".png", ".jpg", ".jpeg", ".pdf", ".pkt"] as const;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const label = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;
