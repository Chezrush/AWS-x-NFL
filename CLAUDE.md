# NFL Big Data Bowl – Paris (AWS x NFL)

Hackathon du 21/10/2026 (Epitech Kremlin-Bicêtre). Challenge 13h–16h, **soumission fermée à 16h00 précises**. Data storytelling sur les joueurs offensifs **WR / TE / RB** à partir des données Next Gen Stats (tracking) et PFF. Python.

## Livrable (dépôt GitHub public)
1. Code fonctionnel
2. `README.md` de **3 à 5 phrases** décrivant l'insight/travail
3. La visualisation ou le résultat de l'outil métrique/score

Pas de déploiement en ligne exigé. Critères de jugement : Pertinence sportive, Exécution technique, Communication, Originalité.

## Règles à respecter
- Tout code/analyse/viz est écrit **pendant** la compétition ; rien de préparé avant.
- Données externes autorisées si publiques et gratuites (nflverse, Pro Football Reference). `gameId`/`playId` ↔ `old_game_id`/`play_id` de nflverse.
- Interdit : créer une librairie dédiée à l'événement.
- Énoncé exact et grille complète : distribués à 13h → à reporter ici (section « Énoncé »).

## Cadre du pitch (conseil d'un membre de l'événement, prioritaire)
Tout le projet (README, accueil de l'app, démo) répond à 4 questions, une phrase chacune :
1. **Pour qui ?** (ex. coach)
2. **Quelle situation de jeu résout-on ?**
3. **Quelle métrique ?**
4. **Quel résultat obtenu ?** (chiffres + exemples)

Toute fonctionnalité qui ne sert pas l'une des 4 est écartée.
**Axe retenu (13h58) : « Qui attaquer »** (A + tendances défensives ; le Mismatch Radar duel-à-duel est écarté : appariement stable sur seulement 29 % des jeux Man).
- Pour qui : le **coordinateur offensif** (coach) qui prépare un match.
- Situation de jeu : **la passe, face à une défense qui choisit entre couverture homme (Man) et zone (Zone)** selon le down et la distance.
- Métrique : **SOE (Separation Over Expected)** = distance au défenseur le plus proche au moment du lancer, moins la valeur typique pour ce poste, cet alignement et ce type de couverture. Positif = le receveur se démarque plus que prévu.
- Résultat : à remplir avec les chiffres (receveurs en tête en Man et en Zone, tendances d'une défense par situation, replays animés des meilleurs cas).

**Résultats validés (`analysis/validate_soe.py` → `web/data/validation.json`)** : sur 6 056 passes où le receveur ciblé est identifié, le taux de complétion monte avec le SOE : **50 % (bas) → 69 % (moyen) → 80 % (haut)** ; en couverture homme **37 % → 59 % → 77 %**. Honnêteté : la séparation brute prédit à peu près aussi bien (46 % → 81 %) ; l'intérêt du SOE est la comparaison équitable entre postes (un RB paraît ouvert parce qu'un linebacker le couvre). Corrélation, pas causalité. Top SOE (≥30 routes) : Man = Mark Andrews TE +1,03, Marquise Brown WR +0,92, Hunter Henry TE +0,89 ; Zone = Rondale Moore WR +2,80, Jeremy McNichols RB +1,85, Anthony Firkser TE +1,68.

Contraintes mesurées sur les données (rapport data-explorer) : `plays.csv` = **uniquement des jeux de passe** ; le tracking s'arrête ~0,5 s après `pass_forward` (pas de réception) ; `pff_role` vaut `Pass Route` avec majuscules ; normaliser x/y selon `playDirection` ; exclure fautes, sacks, scrambles et jeux sans `pass_forward` (~6 700 jeux restent) ; séparation médiane à pass_forward : WR Man 1,53 / Zone 3,14 ; TE Man 1,56 / Zone 3,24 ; RB Man 3,64 / Zone 7,14 ; 256 joueurs ont ≥ 50 routes ; peu de routes Man par joueur → toujours afficher l'effectif `n`.

## README racine = livrable n°1 (pas de démo en direct)
Il n'y aura **pas de démo orale** : le jury ouvre le dépôt. Le `README.md` à la racine est donc ce qui fait la note. Il doit être **court et percutant** (règlement : 3 à 5 phrases d'insight).
- **En anglais** (jury anglophone). Une version française courte dans `README.fr.md`, liée en haut du README.
- Structure : titre accrocheur + 1 phrase de promesse → **image héros** (figure du replay ou capture de l'app) → **4 réponses du pitch** (pour qui / situation / métrique / résultat) en 3 à 5 phrases au total → **2–3 chiffres clés** → **lancer en 3 commandes** (`docker compose up`) → lien vers les captures de l'app.
- Les captures d'écran de l'app (FR et EN) et les figures finales sont **commitées** dans le repo (`docs/img/`), car personne ne verra l'app tourner.
- Limites honnêtes en 1–2 lignes (saison 2021 sem. 1–8, petits effectifs, SOE ≠ qualité de route).
- Pas de jargon sans explication d'une ligne.

## Priorités de notation (par ordre d'importance)
1. **Insight football / pertinence pour un pro du domaine** (le plus important).
2. **Technique** : qualité du code et réponse au sujet.
3. **Lisibilité** de l'app, README compris.
4. **Originalité** : quelque chose de bien, pas déjà fait.

Test final : un coach, recruteur ou commentateur peut-il réellement utiliser l'outil ? À départager d'abord sur la valeur pour un pro, ensuite sur la qualité du code.

## Données
Source : https://github.com/ThompsonJamesBliss/nfl-big-data-bowl-regional-event-data (`data/`), à télécharger dans `data/` (ignoré par git, ~850 Mo).

| Fichier | Contenu | Clés |
|---|---|---|
| `games.csv` | matchs (saison 2021, semaines 1–8, 122 matchs) | gameId |
| `plays.csv` | contexte du jeu : down, distance, formation, personnel, couverture PFF, résultat | gameId, playId |
| `players.csv` | taille, poids, poste officiel, nom | nflId |
| `pffScoutingData.csv` | rôle PFF (route, blocage, rush…), alignement, hits/hurries/sacks | gameId, playId, nflId |
| `tracking/tracking_[gameId].csv` | positions x/y (yards), s, a, dis, o, dir, event, par frame ; ballon = nflId NA / team `football` | gameId, playId, nflId, frameId |

Pièges : le terrain fait 120 × 53.3 yards ; utiliser `playDirection` pour normaliser le sens de l'attaque ; `event` marque snap, pass release, pass catch, tackle ; `playId` n'est pas unique entre matchs.

## Stack technique (choix de l'utilisateur, simplifiée : c'est un PoC)
**PWA Next.js (App Router, TypeScript strict) + i18n FR/EN**, avec une couche d'analyse en **Python** (pandas) en amont.

- **Python (offline)** : lit `data/` (826 Mo), calcule SOE et exporte des JSON agrégés dans `web/data/`. Le web ne lit jamais les CSV de tracking.
- **Next.js** : UI, PWA (manifest, service worker, installable). Les JSON sont **importés/servis en statique** : pas d'API, pas de base, pas d'authentification.
- **Abandonnés (décision du 21/10, PoC)** : Hono, Better Auth, SQLite, accès démo. Les skills Better Auth et la règle `hono.md` importés dans `.claude/` ne servent plus ; ne pas les appliquer.
- **i18n OBLIGATOIRE (FR/EN)** : l'app sera présentée à des anglophones. **next-intl** (routes `/fr` et `/en`, `messages/fr.json` + `messages/en.json`), sélecteur de langue visible, **aucun texte en dur**. Les JSON de données ne contiennent pas de phrases : libellés et définitions traduits côté front. Les deux langues restent complètes.
- **Déploiement** : **dockerisé** (Dockerfile + `docker-compose.yml`, Next `output: "standalone"`), l'utilisateur l'héberge sur son VPS. Aucun secret requis.
- **Utilisateur cible** : **coach** (coordinateur offensif).
- Avant d'écrire du code de setup, consulter la doc à jour via Context7.

## Données externes : nflverse (autorisé par le règlement, demandé par l'utilisateur)
- Téléchargées dans `data/external/` (gitignoré) : `pbp_2021.csv.gz` (play-by-play, https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2021.csv.gz) et `players.csv` (https://github.com/nflverse/nflverse-data/releases/download/players/players.csv).
- Jointure : `old_game_id` = `gameId`, `play_id` = `playId` (6 867/6 867 jeux). Joueurs : nflverse `nfl_id` = notre `nflId` (1 679/1 679), `gsis_id` = `receiver_player_id` du pbp. Receveur ciblé exact sur 97 % des jeux (au lieu de 80 % avec le texte).
- Apports : receveur ciblé exact, EPA, success, CPOE ; nouvelle métrique **« ouvert mais oublié »** (SOE élevé mais moins ciblé que prévu).

## Énoncé du challenge (slide « La quête du jour »)
- **Défi** : construire un **outil ou une visualisation** qu'un **coach, un recruteur ou un commentateur NFL** utiliserait.
- **Format au choix** : (1) visualisation / outil de comparaison (graphique, dashboard, animation, outil interactif) ou (2) **métrique / score** : inventer une nouvelle statistique qui mesure quelque chose d'encore inexploré.
- **À rendre avant 16h** : code Python fonctionnel (notebook ou `.py`) + résultat (viz, capture d'écran de l'outil ou démo de la métrique) + README de 3 à 5 phrases : ce qu'on a construit, ce que ça révèle, **qui l'utiliserait**.
- **Soumission** : via le formulaire https://tinyurl.com/awsnfl2026 (en plus du repo public).
- **Évaluation** : 3 tours (triage, notation par grille, délibération). Note de 1 à 5 sur : compréhension football, exécution technique, communication, originalité.

⚠️ Écart à vérifier : le slide parle de données **saison 2023**, « inputs pré-lancer et outputs post-lancer », sur plusieurs semaines. Le dépôt GitHub public contient à ce jour du tracking classique 2021 (semaines 1–8, `tracking_[gameId].csv`) sans découpage input/output. Vérifier auprès des organisateurs quel jeu est le bon avant de construire.

## Organisation (Claude Code)
- Skill `hackathon-orchestrator` (`.claude/skills/`, modèle **Opus**) : cadre les axes, découpe, délègue.
- Sous-agents (`.claude/agents/`, modèle **Sonnet**) : `data-explorer`, `builder`, `doc-writer`, `deployer` (optionnel).
- Mémoire persistante hors repo : `~/.claude/projects/-home-rush-delivery-tek03-AWS-x-NFL/memory/`.
- Ne jamais commit/push sans demande explicite de l'utilisateur.

## Conventions
- Python, code simple et lisible ; un script/notebook par étape (chargement → métrique → viz).
- Figures exportées en PNG dans `outputs/` et référencées dans le README.
- Dépendances listées dans `requirements.txt` ; le projet doit se lancer depuis un clone propre.
