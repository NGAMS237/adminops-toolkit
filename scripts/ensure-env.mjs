// Prépare l'environnement local : .env et dossier data/ (non versionnés). Multiplateforme.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
if (!existsSync(".env")) { copyFileSync(".env.example", ".env"); console.log("✔ .env créé"); }
mkdirSync("data/uploads", { recursive: true });
mkdirSync("data/backups", { recursive: true });
console.log("✔ dossier data/ prêt");
