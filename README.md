# AdminOps Toolkit

Application web **locale** pour documenter vos laboratoires (Cisco Packet Tracer, Linux, Windows Server, Azure, sécurité, scripts), votre inventaire et vos procédures — avec export **PDF A4** professionnel.

Next.js 15 (App Router, TypeScript) · Tailwind CSS · SQLite + Prisma · PDF via PDFKit · aucun service cloud, aucune authentification (V1).

## Démarrage rapide

Prérequis : **Node.js 20+** (testé sur 22).

```bash
npm run setup     # installe l'environnement, crée la base SQLite, applique les migrations, charge les données de démo
npm run dev       # http://localhost:3000
```

Mode production local (plus rapide) :

```bash
npm run build && npm start     # http://localhost:3000
```

Si `npm install` n'a pas encore été exécuté : `npm install` d'abord, puis `npm run setup`.

| Commande | Rôle |
|---|---|
| `npm run setup` | `.env` + dossier `data/` + migrations + données de démo (ignorées si la base contient déjà des données) |
| `npm run dev` / `npm start` | Serveur sur le port 3000 |
| `npm test` | 39 tests d'intégration sur une base **temporaire** (CRUD, imports, PDF, sauvegarde/restauration) |
| `npm run db:reset` | Réinitialise la base (⚠ destructif) |
| `npm run typecheck` | Vérification TypeScript |

## Fonctionnalités V1

- **Tableau de bord** : compteurs, répartition par catégorie, dernières modifications, recherche globale (labos, procédures, commandes, équipements, documents).
- **Laboratoires** : créer, modifier, dupliquer (pièces jointes copiées), archiver, supprimer ; catégories Réseau / Linux / Windows Server / Azure / Sécurité / Scripts ; statut, date, équipements associés.
- **Fiche technique** : objectifs, prérequis, topologie + pièces jointes, plan d'adressage (collage depuis Excel), étapes, **commandes avec coloration syntaxique, bouton Copier et explication**, tests/résultats, problèmes, diagnostic, conclusion, **historique automatique**.
- **Éditeur Markdown** : barre d'outils, aperçu, **collage de captures d'écran (Ctrl+V)** et glisser-déposer d'images, `Ctrl+S`.
- **Inventaire** : type, fabricant, OS/firmware, IP, interfaces, VLAN, rôle, labos associés ; export CSV.
- **Procédures** : bibliothèque indépendante, modèles Cisco IOS / Bash / PowerShell / Azure CLI, réutilisation dans plusieurs labos (lien ou copie des commandes), recherche par catégorie, plateforme, équipement, commande, mot-clé.
- **Export PDF A4** : page de garde, sommaire paginé, tableaux, images, code, en-tête/pied de page, « Page X / N ». Boutons **Générer PDF** et **Aperçu / Imprimer**.
- **Documents / import** : `.txt` `.md` `.png` `.jpg` `.pdf` `.pkt` (les `.pkt` sont conservés **tels quels, sans analyse**). Les `.txt`/`.md` peuvent devenir des procédures.
- **Sauvegarde** : ZIP complet (données + fichiers), sauvegardes locales, restauration (avec sauvegarde de sécurité préalable), export JSON et Markdown.
- Thème clair / sombre / système, interface responsive.

## Architecture

```
src/
  app/            Interface (pages, API routes, server actions)
  components/     Composants UI (éditeurs, shell, blocs de code…)
  domain/         Types et constantes du métier (indépendants de la base)
  services/       Logique métier : validation (zod), révisions, duplication, import, backup, exports
  storage/        Couche de stockage : interface `Storage` + `FileStore`
    types.ts          contrats (labs, équipements, procédures, pièces jointes, réglages, recherche, dump/restore)
    prisma-storage.ts implémentation SQLite/Prisma
    file-store.ts     fichiers sur disque (data/uploads)
    index.ts          point unique de sélection de l'implémentation
  pdf/            Génération PDF (PDFKit) — aucune dépendance à l'UI ni à la base
prisma/           schema.prisma, migrations SQL, seed
scripts/          setup, tests
```

**Migrer vers une base cloud plus tard** : implémenter l'interface `Storage` (et `FileStore` pour S3/Blob) puis changer l'instanciation dans `src/storage/index.ts`. L'interface, la logique métier et le PDF ne changent pas.

## Données privées & Git

Exclus du dépôt via `.gitignore` : `data/` (base SQLite, pièces jointes, sauvegardes), `.env*` (sauf `.env.example`), `*.db`. Les exports sont générés à la demande. **Ne committez jamais** le dossier `data/`.

## Sécurité (usage local)

Pas d'authentification en V1 : le serveur est prévu pour `localhost`. Ne l'exposez pas sur un réseau. Les uploads sont limités par extension, taille (50 Mo) et signature binaire ; les noms stockés sont aléatoires ; les pièces jointes sont servies avec `nosniff` et une CSP restrictive.

## Limites connues (V1)

- Les polices PDF standard (Helvetica/Courier) couvrent le français et le latin-1 ; les caractères hors jeu (ex. flèches, emojis) sont remplacés (`→` devient `->`).
- Les images PDF supportent PNG et JPEG uniquement (JPEG CMJN non supporté).
- Pas de multi-utilisateur ni d'authentification (volontairement hors périmètre).
