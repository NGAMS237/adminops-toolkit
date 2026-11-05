/* Données de démonstration réalistes. Idempotent : ne s'exécute que sur une base vide (ou avec --force). */
import { prisma } from "../src/lib/db";
import { storage } from "../src/storage";
import { createLab } from "../src/services/labs";
import type { CommandInput, EquipmentInput, ProcedureInput } from "../src/domain/types";

const c = (title: string, language: string, code: string, explanation = ""): CommandInput => ({ title, language, code: code.trim(), explanation });
const eq = (name: string, type: string, manufacturer: string, osVersion: string, ipAddress: string, role: string, interfaces = "", vlans = "", notes = ""): EquipmentInput =>
  ({ name, type, manufacturer, osVersion, ipAddress, role, interfaces, vlans, notes });

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.lab.count();
  if (existing > 0 && !force) {
    console.log("Base déjà peuplée — seed ignoré (utiliser --force pour ajouter quand même).");
    return;
  }

  /* ---------------- Équipements ---------------- */
  const E: Record<string, string> = {};
  const equipmentList: EquipmentInput[] = [
    eq("R1-EDGE", "routeur", "Cisco", "IOS 15.4(3)M2 (ISR 2911)", "192.168.0.1", "Routeur de bordure / routage inter-VLAN",
      "Gi0/0 — lien vers SW1 (trunk 802.1Q)\nGi0/1 — WAN 203.0.113.2/30", "10, 20, 30, 99"),
    eq("SW1-CORE", "switch", "Cisco", "IOS 15.0(2)SE11 (Catalyst 2960-24)", "192.168.99.2", "Commutateur de distribution",
      "Fa0/1 — trunk vers R1\nFa0/2 — trunk vers SW2\nFa0/10-14 — access VLAN 10\nFa0/15-19 — access VLAN 20", "10, 20, 30, 99"),
    eq("SW2-ACCESS", "switch", "Cisco", "IOS 15.0(2)SE11 (Catalyst 2960-24)", "192.168.99.3", "Commutateur d'accès",
      "Fa0/1 — trunk vers SW1\nFa0/5-10 — access VLAN 30", "10, 20, 30, 99"),
    eq("SRV-LINUX01", "serveur", "Canonical", "Ubuntu Server 24.04 LTS", "192.168.30.10", "Serveur SSH / services internes",
      "ens18 — 192.168.30.10/24 (VLAN 30)", "30"),
    eq("SRV-DC01", "serveur", "Microsoft", "Windows Server 2022 Standard", "192.168.30.5", "Contrôleur de domaine (AD DS, DNS, DHCP)",
      "Ethernet0 — 192.168.30.5/24 (VLAN 30)", "30", "Domaine : lab.local"),
    eq("PC-ADMIN", "poste", "Dell", "Windows 11 Pro 23H2", "DHCP (VLAN 10)", "Poste d'administration", "Ethernet — VLAN 10", "10"),
    eq("FW-PFSENSE", "pare-feu", "Netgate", "pfSense CE 2.7.2", "203.0.113.2", "Pare-feu périmétrique",
      "WAN — 203.0.113.2/30\nLAN — 192.168.0.254/24", ""),
    eq("AZ-VM-WEB01", "cloud", "Microsoft Azure", "Ubuntu 22.04 LTS (Standard_B2s)", "10.10.1.4", "Serveur web de test dans Azure",
      "nic-web01 — 10.10.1.4 (snet-web)", "", "Groupe de ressources : rg-lab-canadaeast"),
  ];
  for (const e of equipmentList) E[e.name] = (await storage.equipment.create(e)).id;

  /* ---------------- Procédures / modèles ---------------- */
  const P: Record<string, string> = {};
  const procs: (ProcedureInput & { key: string })[] = [
    {
      key: "base", title: "[Modèle] Configuration de base d'un équipement Cisco IOS", category: "reseau", platform: "cisco", isTemplate: true,
      tags: "cisco ios hostname ssh banner base sécurité", description: "Configuration initiale sécurisée d'un routeur ou d'un switch (nom, mots de passe, SSH, bannière).",
      content: "## Quand l'utiliser\nÀ appliquer sur **chaque** équipement avant toute autre configuration.\n\n## Vérifications\n- `show running-config | section line`\n- `show ip ssh`",
      commands: [
        c("Identité et accès privilégié", "cisco", `enable\nconfigure terminal\nhostname R1-EDGE\nip domain-name lab.local\nenable secret MotDePasseFort!2026\nservice password-encryption\nno ip domain-lookup`, "`enable secret` stocke le mot de passe haché (MD5/type 5 ou mieux). `service password-encryption` masque les autres mots de passe du fichier de configuration. `no ip domain-lookup` évite les attentes DNS lors d'une faute de frappe."),
        c("Activer SSH v2", "cisco", `crypto key generate rsa modulus 2048\nip ssh version 2\nusername admin privilege 15 secret MotDePasseAdmin!2026\nline vty 0 4\n transport input ssh\n login local\n exec-timeout 10 0\nexit`, "Génère une clé RSA 2048 bits, force SSH v2 et authentifie via la base locale. `transport input ssh` désactive Telnet."),
        c("Bannière légale et sauvegarde", "cisco", `banner motd # Accès réservé au personnel autorisé. Toute activité est journalisée. #\nend\ncopy running-config startup-config`, "La bannière fournit un avertissement légal. `copy running-config startup-config` rend la configuration persistante."),
      ],
    },
    {
      key: "vlan", title: "[Modèle] VLAN, trunk et routage inter-VLAN (router-on-a-stick)", category: "reseau", platform: "cisco", isTemplate: true,
      tags: "cisco vlan trunk 802.1q sous-interface inter-vlan", description: "Création de VLAN sur un switch, trunk 802.1Q et sous-interfaces sur le routeur.",
      content: "Adapter les numéros de VLAN et de ports au plan d'adressage du laboratoire.",
      commands: [
        c("Switch : VLAN et ports d'accès", "cisco", `vlan 10\n name ADMIN\nvlan 20\n name USERS\nvlan 30\n name SERVEURS\nvlan 99\n name GESTION\ninterface range fa0/10 - 14\n switchport mode access\n switchport access vlan 10\n spanning-tree portfast`, "Crée les VLAN nommés et affecte les ports d'accès. PortFast accélère l'activation des ports hôtes."),
        c("Switch : trunk vers le routeur", "cisco", `interface fa0/1\n switchport trunk encapsulation dot1q\n switchport mode trunk\n switchport trunk native vlan 99\n switchport trunk allowed vlan 10,20,30,99`, "Limite le trunk aux VLAN nécessaires et déplace le VLAN natif hors du VLAN 1."),
        c("Routeur : sous-interfaces", "cisco", `interface gi0/0\n no shutdown\ninterface gi0/0.10\n encapsulation dot1Q 10\n ip address 192.168.10.1 255.255.255.0\ninterface gi0/0.20\n encapsulation dot1Q 20\n ip address 192.168.20.1 255.255.255.0\ninterface gi0/0.99\n encapsulation dot1Q 99 native\n ip address 192.168.99.1 255.255.255.0`, "Chaque sous-interface porte la passerelle d'un VLAN. Le mot-clé `native` doit correspondre au VLAN natif du trunk."),
      ],
    },
    {
      key: "ospf", title: "[Modèle] OSPF zone unique", category: "reseau", platform: "cisco", isTemplate: true,
      tags: "cisco ospf routage dynamique area", description: "Activation d'OSPFv2 avec interfaces passives et ID de routeur fixe.",
      content: "",
      commands: [c("Processus OSPF", "cisco", `router ospf 1\n router-id 1.1.1.1\n network 192.168.10.0 0.0.0.255 area 0\n network 10.0.12.0 0.0.0.3 area 0\n passive-interface gi0/0.10\n passive-interface gi0/0.20\n default-information originate`, "`router-id` fixe l'identité OSPF. Les `network` utilisent un masque générique (wildcard). Les interfaces passives n'envoient pas de Hello vers les postes.")],
    },
    {
      key: "dhcp", title: "[Modèle] Serveur DHCP sur routeur Cisco", category: "reseau", platform: "cisco", isTemplate: true,
      tags: "cisco dhcp pool exclusion", description: "Pool DHCP avec exclusions et options DNS.", content: "",
      commands: [c("Pool DHCP VLAN 10", "cisco", `ip dhcp excluded-address 192.168.10.1 192.168.10.20\nip dhcp pool VLAN10\n network 192.168.10.0 255.255.255.0\n default-router 192.168.10.1\n dns-server 192.168.30.5\n domain-name lab.local\n lease 0 8`, "Réserve les 20 premières adresses aux équipements statiques. Le bail est de 8 heures.")],
    },
    {
      key: "acl", title: "[Modèle] ACL étendue nommée", category: "securite", platform: "cisco", isTemplate: true,
      tags: "cisco acl sécurité filtrage", description: "Filtrage du trafic entre VLAN avec une ACL étendue nommée.", content: "Appliquer l'ACL au plus près de la **source** pour les ACL étendues.",
      commands: [c("ACL USERS vers SERVEURS", "cisco", `ip access-list extended USERS-TO-SRV\n permit tcp 192.168.20.0 0.0.0.255 host 192.168.30.10 eq 22\n permit udp 192.168.20.0 0.0.0.255 host 192.168.30.5 eq 53\n deny   ip 192.168.20.0 0.0.0.255 192.168.30.0 0.0.0.255 log\n permit ip any any\ninterface gi0/0.20\n ip access-group USERS-TO-SRV in`, "Autorise SSH vers le serveur Linux et DNS vers le contrôleur de domaine, bloque le reste vers le VLAN serveurs avec journalisation, puis autorise le reste du trafic.")],
    },
    {
      key: "sshkey", title: "[Modèle] Utilisateur sudo et clé SSH (Linux)", category: "linux", platform: "bash", isTemplate: true,
      tags: "linux ssh sudo utilisateur clé ubuntu", description: "Créer un administrateur non-root avec authentification par clé.", content: "",
      commands: [
        c("Créer l'utilisateur", "bash", `sudo adduser admin01\nsudo usermod -aG sudo admin01`, "Crée un compte standard puis l'ajoute au groupe `sudo`."),
        c("Déployer la clé publique (depuis le poste client)", "bash", `ssh-keygen -t ed25519 -C "admin01@lab"\nssh-copy-id -i ~/.ssh/id_ed25519.pub admin01@192.168.30.10`, "Ed25519 est plus court et plus robuste que RSA. `ssh-copy-id` ajoute la clé dans `~/.ssh/authorized_keys` avec les bons droits."),
      ],
    },
    {
      key: "ufw", title: "[Modèle] Pare-feu UFW de base", category: "securite", platform: "bash", isTemplate: true,
      tags: "linux ufw pare-feu iptables sécurité", description: "Politique par défaut restrictive et ouverture des services nécessaires.", content: "",
      commands: [c("Règles UFW", "bash", `sudo ufw default deny incoming\nsudo ufw default allow outgoing\nsudo ufw allow from 192.168.10.0/24 to any port 22 proto tcp\nsudo ufw logging on\nsudo ufw enable\nsudo ufw status verbose`, "Refuse tout le trafic entrant sauf SSH depuis le VLAN d'administration. Toujours autoriser SSH **avant** `ufw enable` pour ne pas se verrouiller.")],
    },
    {
      key: "adds", title: "[Modèle] Installer AD DS et promouvoir un contrôleur de domaine", category: "windows", platform: "powershell", isTemplate: true,
      tags: "windows server active directory ad ds powershell dns", description: "Installation du rôle AD DS et création d'une nouvelle forêt.", content: "",
      commands: [
        c("Installer le rôle", "powershell", `Install-WindowsFeature -Name AD-Domain-Services,DNS -IncludeManagementTools`, "Installe AD DS, DNS et les outils d'administration."),
        c("Créer la forêt", "powershell", `Install-ADDSForest \`\n  -DomainName "lab.local" \`\n  -DomainNetbiosName "LAB" \`\n  -InstallDns \`\n  -SafeModeAdministratorPassword (Read-Host -AsSecureString "Mot de passe DSRM")`, "Promeut le serveur en contrôleur de domaine. Le mot de passe DSRM est saisi de façon sécurisée. Le serveur redémarre automatiquement."),
      ],
    },
    {
      key: "adcsv", title: "[Modèle] Création d'utilisateurs AD depuis un CSV", category: "scripts", platform: "powershell", isTemplate: true,
      tags: "powershell active directory csv utilisateurs automatisation", description: "Script d'import en masse d'utilisateurs.", content: "Colonnes attendues : `Prenom, Nom, Login, OU`.",
      commands: [c("Import CSV", "powershell", `Import-Csv .\\utilisateurs.csv | ForEach-Object {\n  New-ADUser -Name "$($_.Prenom) $($_.Nom)" \`\n    -SamAccountName $_.Login \`\n    -UserPrincipalName "$($_.Login)@lab.local" \`\n    -Path $_.OU \`\n    -AccountPassword (ConvertTo-SecureString "ChangeMe!2026" -AsPlainText -Force) \`\n    -ChangePasswordAtLogon $true -Enabled $true\n}`, "Pour chaque ligne du CSV, crée un compte activé dont le mot de passe doit être changé à la première ouverture de session.")],
    },
    {
      key: "azvnet", title: "[Modèle] Groupe de ressources, VNet et NSG (Azure CLI)", category: "azure", platform: "azure", isTemplate: true,
      tags: "azure cli vnet nsg groupe de ressources réseau", description: "Socle réseau Azure minimal.", content: "Prérequis : `az login` et un abonnement actif.",
      commands: [c("Socle réseau", "azure", `az group create -n rg-lab-canadaeast -l canadaeast\naz network vnet create -g rg-lab-canadaeast -n vnet-lab \\\n  --address-prefix 10.10.0.0/16 \\\n  --subnet-name snet-web --subnet-prefix 10.10.1.0/24\naz network nsg create -g rg-lab-canadaeast -n nsg-web\naz network nsg rule create -g rg-lab-canadaeast --nsg-name nsg-web -n allow-ssh-admin \\\n  --priority 100 --access Allow --protocol Tcp --direction Inbound \\\n  --source-address-prefixes 203.0.113.0/24 --destination-port-ranges 22`, "Crée le groupe de ressources, le réseau virtuel avec son sous-réseau puis un NSG qui n'autorise SSH que depuis la plage d'administration.")],
    },
    {
      key: "azvm", title: "[Modèle] Créer une VM Linux avec clé SSH (Azure CLI)", category: "azure", platform: "azure", isTemplate: true,
      tags: "azure cli vm ubuntu ssh", description: "Déploiement d'une VM Ubuntu sans mot de passe.", content: "",
      commands: [c("Création de la VM", "azure", `az vm create -g rg-lab-canadaeast -n vm-web01 \\\n  --image Ubuntu2204 --size Standard_B2s \\\n  --vnet-name vnet-lab --subnet snet-web --nsg nsg-web \\\n  --admin-username azureadmin --generate-ssh-keys\naz vm show -g rg-lab-canadaeast -n vm-web01 -d --query publicIps -o tsv`, "Déploie la VM dans le sous-réseau existant et génère une paire de clés. La seconde commande affiche l'adresse IP publique.")],
    },
  ];
  for (const { key, ...p } of procs) P[key] = (await storage.procedures.create(p)).id;

  /* ---------------- Laboratoires ---------------- */
  const day = (n: number) => new Date(Date.now() - n * 86400000);
  const baseLab = { status: "termine", date: day(3), description: "", objectives: "", prerequisites: "", topologyNotes: "", configSteps: "", tests: "", problems: "", diagnostics: "", conclusion: "", addressRows: [], commands: [], equipmentIds: [], procedureIds: [] };

  const lab1 = await createLab({
    ...baseLab, title: "VLAN, trunk 802.1Q et routage inter-VLAN (Packet Tracer)", category: "reseau", status: "termine", date: day(12),
    description: "Segmentation d'un réseau local en quatre VLAN avec routage inter-VLAN par sous-interfaces (router-on-a-stick) et DHCP centralisé.",
    objectives: "- Créer et nommer les VLAN 10 (ADMIN), 20 (USERS), 30 (SERVEURS) et 99 (GESTION)\n- Configurer un trunk 802.1Q entre SW1, SW2 et R1\n- Assurer le routage inter-VLAN avec des sous-interfaces\n- Distribuer les adresses par DHCP sur les VLAN 10 et 20",
    prerequisites: "- Cisco Packet Tracer 8.2 ou supérieur\n- Notions d'adressage IPv4 et de masques de sous-réseau\n- Modèle de configuration de base appliqué à tous les équipements",
    topologyNotes: "Topologie en étoile : R1-EDGE relié à SW1-CORE (trunk), SW1-CORE relié à SW2-ACCESS (trunk). Les postes sont répartis sur les VLAN 10, 20 et 30.\n\n> Joindre le fichier `.pkt` et une capture de la topologie dans la section *Pièces jointes*.",
    addressRows: [
      { device: "R1-EDGE", interface: "Gi0/0.10", ip: "192.168.10.1", mask: "255.255.255.0", gateway: "", vlan: "10", notes: "Passerelle ADMIN" },
      { device: "R1-EDGE", interface: "Gi0/0.20", ip: "192.168.20.1", mask: "255.255.255.0", gateway: "", vlan: "20", notes: "Passerelle USERS" },
      { device: "R1-EDGE", interface: "Gi0/0.30", ip: "192.168.30.1", mask: "255.255.255.0", gateway: "", vlan: "30", notes: "Passerelle SERVEURS" },
      { device: "R1-EDGE", interface: "Gi0/0.99", ip: "192.168.99.1", mask: "255.255.255.0", gateway: "", vlan: "99", notes: "VLAN natif / gestion" },
      { device: "SW1-CORE", interface: "Vlan99", ip: "192.168.99.2", mask: "255.255.255.0", gateway: "192.168.99.1", vlan: "99", notes: "Gestion" },
      { device: "SW2-ACCESS", interface: "Vlan99", ip: "192.168.99.3", mask: "255.255.255.0", gateway: "192.168.99.1", vlan: "99", notes: "Gestion" },
      { device: "PC-ADMIN", interface: "Fa0", ip: "DHCP (192.168.10.21+)", mask: "255.255.255.0", gateway: "192.168.10.1", vlan: "10", notes: "" },
    ],
    configSteps: "1. Appliquer la **configuration de base** sur R1, SW1 et SW2.\n2. Créer les VLAN sur SW1 et SW2, affecter les ports d'accès.\n3. Configurer les trunks (VLAN natif 99, VLAN autorisés 10, 20, 30, 99).\n4. Créer les sous-interfaces sur R1 avec `encapsulation dot1Q`.\n5. Activer le DHCP sur R1 et exclure les adresses statiques.\n6. Sauvegarder (`copy running-config startup-config`).",
    commands: procs.find((p) => p.key === "vlan")!.commands.concat(procs.find((p) => p.key === "dhcp")!.commands),
    tests: "| Test | Commande | Résultat attendu | Résultat |\n|---|---|---|---|\n| VLAN présents | `show vlan brief` | VLAN 10/20/30/99 actifs | OK |\n| Trunk actif | `show interfaces trunk` | Fa0/1 trunk, natif 99 | OK |\n| Ping inter-VLAN | `ping 192.168.20.1` depuis PC-ADMIN | 5/5 réponses | OK |\n| Bail DHCP | `ipconfig /all` | 192.168.10.21/24 | OK |\n\n```\nC:\\> ping 192.168.20.1\n\nReply from 192.168.20.1: bytes=32 time<1ms TTL=255\nPing statistics: Sent = 4, Received = 4, Lost = 0 (0% loss)\n```",
    problems: "- Le ping entre VLAN échouait au premier essai (`Request timed out`).\n- Message `%CDP-4-NATIVE_VLAN_MISMATCH` sur SW1 et SW2.",
    diagnostics: "**Cause 1** : la sous-interface `Gi0/0.99` n'avait pas le mot-clé `native`, donc le trafic non étiqueté n'était pas traité.\n\n**Cause 2** : VLAN natif différent sur SW2 (VLAN 1 par défaut).\n\n**Solution** : `encapsulation dot1Q 99 native` sur R1 et `switchport trunk native vlan 99` sur SW2. Vérifié avec `show interfaces trunk`.",
    conclusion: "Le routage inter-VLAN par sous-interfaces fonctionne et le DHCP distribue correctement les adresses. Le point critique est la **cohérence du VLAN natif** des deux côtés du trunk. Piste d'amélioration : migrer vers un switch de niveau 3 (SVI) pour éviter le goulot d'étranglement du lien unique.",
    equipmentIds: [E["R1-EDGE"], E["SW1-CORE"], E["SW2-ACCESS"], E["PC-ADMIN"]],
    procedureIds: [P["base"], P["vlan"], P["dhcp"]],
  });

  await createLab({
    ...baseLab, title: "OSPF multi-routeurs et route par défaut", category: "reseau", status: "en_cours", date: day(5),
    description: "Mise en place d'OSPFv2 entre trois routeurs avec propagation d'une route par défaut depuis le routeur de bordure.",
    objectives: "- Établir les adjacences OSPF\n- Annoncer une route par défaut\n- Vérifier les tables de routage",
    prerequisites: "- Laboratoire VLAN terminé\n- Notions de coûts OSPF et de zones",
    addressRows: [
      { device: "R1-EDGE", interface: "Gi0/1", ip: "10.0.12.1", mask: "255.255.255.252", gateway: "", vlan: "", notes: "Lien R1-R2" },
      { device: "R2", interface: "Gi0/0", ip: "10.0.12.2", mask: "255.255.255.252", gateway: "", vlan: "", notes: "Lien R1-R2" },
      { device: "R2", interface: "Gi0/1", ip: "10.0.23.1", mask: "255.255.255.252", gateway: "", vlan: "", notes: "Lien R2-R3" },
      { device: "R3", interface: "Gi0/0", ip: "10.0.23.2", mask: "255.255.255.252", gateway: "", vlan: "", notes: "Lien R2-R3" },
    ],
    configSteps: "1. Adresser les liens point à point en /30.\n2. Activer OSPF processus 1, zone 0.\n3. Passiver les interfaces LAN.\n4. Sur R1 : `default-information originate`.",
    commands: procs.find((p) => p.key === "ospf")!.commands.concat([c("Vérifications", "cisco", `show ip ospf neighbor\nshow ip route ospf\nshow ip protocols`, "Affiche les voisins OSPF, les routes apprises et les paramètres du protocole.")]),
    tests: "- [x] Voisins en état `FULL`\n- [ ] Route par défaut visible sur R3 (`O*E2`)",
    problems: "Adjacence bloquée en `EXSTART` entre R2 et R3.",
    diagnostics: "MTU différent sur les liens (1500 vs 1400). Aligner le MTU ou utiliser `ip ospf mtu-ignore`.",
    equipmentIds: [E["R1-EDGE"]], procedureIds: [P["ospf"]],
  });

  await createLab({
    ...baseLab, title: "Durcissement SSH et pare-feu UFW sur Ubuntu Server 24.04", category: "securite", status: "termine", date: day(20),
    description: "Sécurisation de l'accès d'administration d'un serveur Linux : authentification par clé, désactivation du root et pare-feu restrictif.",
    objectives: "- Interdire l'authentification par mot de passe et la connexion root\n- Restreindre SSH au VLAN d'administration\n- Limiter les tentatives de force brute (fail2ban)",
    prerequisites: "- Ubuntu Server 24.04 LTS à jour\n- Accès console de secours (hyperviseur) en cas d'erreur de configuration",
    addressRows: [{ device: "SRV-LINUX01", interface: "ens18", ip: "192.168.30.10", mask: "255.255.255.0", gateway: "192.168.30.1", vlan: "30", notes: "SSH port 22" }],
    configSteps: "1. Créer l'utilisateur d'administration et déployer la clé.\n2. Modifier `/etc/ssh/sshd_config`.\n3. Configurer UFW.\n4. Installer et activer fail2ban.",
    commands: [
      ...procs.find((p) => p.key === "sshkey")!.commands,
      c("Durcissement sshd", "bash", `sudo sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config\nsudo sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config\nsudo sshd -t && sudo systemctl reload ssh`, "`sshd -t` valide la syntaxe **avant** de recharger le service, ce qui évite de perdre l'accès."),
      ...procs.find((p) => p.key === "ufw")!.commands,
      c("fail2ban", "bash", `sudo apt update && sudo apt install -y fail2ban\nsudo systemctl enable --now fail2ban\nsudo fail2ban-client status sshd`, "Bannit temporairement les adresses ayant échoué plusieurs authentifications SSH."),
    ],
    tests: "```\n$ ssh root@192.168.30.10\nroot@192.168.30.10: Permission denied (publickey).\n\n$ sudo ufw status\nStatus: active\n22/tcp  ALLOW IN  192.168.10.0/24\n```\n\nLe test depuis le VLAN USERS (192.168.20.0/24) est refusé, comme attendu.",
    problems: "Verrouillage temporaire après activation d'UFW (règle SSH ajoutée trop tard).",
    diagnostics: "Accès rétabli via la console de l'hyperviseur : `sudo ufw allow 22/tcp`. Procédure corrigée : toujours autoriser SSH avant `ufw enable`.",
    conclusion: "Le serveur n'accepte plus que les connexions par clé depuis le VLAN d'administration. Prévoir une rotation périodique des clés.",
    equipmentIds: [E["SRV-LINUX01"], E["PC-ADMIN"]], procedureIds: [P["sshkey"], P["ufw"]],
  });

  await createLab({
    ...baseLab, title: "Active Directory : AD DS, DNS et DHCP sous Windows Server 2022", category: "windows", status: "en_cours", date: day(8),
    description: "Déploiement d'un contrôleur de domaine lab.local avec DNS intégré et service DHCP autorisé dans AD.",
    objectives: "- Installer AD DS et DNS\n- Créer la forêt lab.local\n- Configurer et autoriser le DHCP\n- Créer des unités d'organisation et des utilisateurs",
    prerequisites: "- VM Windows Server 2022, 4 Go de RAM, IP statique 192.168.30.5\n- Nom de machine : SRV-DC01",
    addressRows: [{ device: "SRV-DC01", interface: "Ethernet0", ip: "192.168.30.5", mask: "255.255.255.0", gateway: "192.168.30.1", vlan: "30", notes: "DNS : 127.0.0.1" }],
    configSteps: "1. Renommer le serveur et fixer l'IP.\n2. Installer les rôles.\n3. Promouvoir en contrôleur de domaine.\n4. Installer et autoriser DHCP.",
    commands: [
      c("Nom et adresse IP", "powershell", `Rename-Computer -NewName SRV-DC01 -Restart\nNew-NetIPAddress -InterfaceAlias "Ethernet0" -IPAddress 192.168.30.5 -PrefixLength 24 -DefaultGateway 192.168.30.1\nSet-DnsClientServerAddress -InterfaceAlias "Ethernet0" -ServerAddresses 127.0.0.1`, "Définit le nom, l'adresse statique et pointe le DNS sur lui-même, ce qui est requis pour un contrôleur de domaine."),
      ...procs.find((p) => p.key === "adds")!.commands,
      c("DHCP autorisé dans AD", "powershell", `Install-WindowsFeature DHCP -IncludeManagementTools\nAdd-DhcpServerInDC -DnsName SRV-DC01.lab.local -IPAddress 192.168.30.5\nAdd-DhcpServerv4Scope -Name "VLAN10" -StartRange 192.168.10.21 -EndRange 192.168.10.200 -SubnetMask 255.255.255.0`, "Un serveur DHCP doit être autorisé dans Active Directory pour répondre aux clients."),
    ],
    tests: "- `dcdiag /v` : tous les tests réussis\n- `nslookup lab.local` résout vers 192.168.30.5\n- Jonction d'un poste Windows 11 au domaine : à faire",
    equipmentIds: [E["SRV-DC01"]], procedureIds: [P["adds"], P["adcsv"]],
  });

  await createLab({
    ...baseLab, title: "Azure : réseau virtuel, NSG et machine virtuelle Linux", category: "azure", status: "termine", date: day(30),
    description: "Déploiement d'un socle réseau et d'une VM Ubuntu dans Azure (région Canada Est) avec accès SSH restreint.",
    objectives: "- Créer un groupe de ressources et un VNet\n- Restreindre SSH par un NSG\n- Déployer une VM par clé SSH",
    prerequisites: "- Abonnement Azure actif\n- Azure CLI 2.60+ (`az version`)\n- `az login` effectué",
    addressRows: [
      { device: "vnet-lab", interface: "—", ip: "10.10.0.0", mask: "/16", gateway: "", vlan: "", notes: "Espace d'adressage" },
      { device: "snet-web", interface: "—", ip: "10.10.1.0", mask: "/24", gateway: "", vlan: "", notes: "Sous-réseau web" },
      { device: "AZ-VM-WEB01", interface: "nic-web01", ip: "10.10.1.4", mask: "/24", gateway: "10.10.1.1", vlan: "", notes: "IP privée" },
    ],
    configSteps: "1. Créer le groupe de ressources.\n2. Créer le VNet et le sous-réseau.\n3. Créer le NSG et la règle SSH.\n4. Créer la VM.\n5. **Supprimer le groupe de ressources** à la fin pour éviter des frais.",
    commands: [...procs.find((p) => p.key === "azvnet")!.commands, ...procs.find((p) => p.key === "azvm")!.commands,
      c("Nettoyage", "azure", `az group delete -n rg-lab-canadaeast --yes --no-wait`, "Supprime toutes les ressources du laboratoire en une commande.")],
    tests: "```\n$ ssh azureadmin@<ip-publique>\nWelcome to Ubuntu 22.04.4 LTS\n```",
    conclusion: "Socle opérationnel. Penser à supprimer le groupe de ressources après chaque séance pour maîtriser les coûts.",
    equipmentIds: [E["AZ-VM-WEB01"]], procedureIds: [P["azvnet"], P["azvm"]],
  });

  await createLab({
    ...baseLab, title: "Script de sauvegarde rsync planifié avec cron", category: "scripts", status: "brouillon", date: day(1),
    description: "Script Bash de sauvegarde incrémentale avec rotation sur 7 jours.",
    objectives: "Automatiser la sauvegarde quotidienne de `/etc` et `/var/www`.",
    commands: [
      c("backup.sh", "bash", `#!/usr/bin/env bash\nset -euo pipefail\nSRC="/etc /var/www"\nDEST="/mnt/backup/$(date +%F)"\nLATEST="/mnt/backup/latest"\nmkdir -p "$DEST"\nrsync -a --delete --link-dest="$LATEST" $SRC "$DEST"\nln -sfn "$DEST" "$LATEST"\nfind /mnt/backup -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +`, "`--link-dest` crée des liens physiques vers les fichiers inchangés (sauvegarde incrémentale peu coûteuse en espace). `set -euo pipefail` arrête le script à la première erreur."),
      c("Planification", "bash", `echo "30 2 * * * root /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | sudo tee /etc/cron.d/backup`, "Exécution tous les jours à 2 h 30."),
    ],
    equipmentIds: [E["SRV-LINUX01"]],
  });

  await storage.settings.set("organization", "Mon laboratoire IT");
  await storage.settings.set("author", "Administrateur");
  await storage.settings.set("footerText", "Document technique — usage interne");
  console.log(`Seed terminé : 6 laboratoires, ${procs.length} procédures, ${equipmentList.length} équipements. (labo 1 = ${lab1.id})`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
