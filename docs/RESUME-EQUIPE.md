# Résumé équipe – NFL Big Data Bowl Paris (AWS x NFL)

Écrit le 21/10/2026 vers 13h55. **Soumission fermée à 16h00 précises.** Ce document résume tout ce qu'il faut savoir pour rejoindre le projet. Le détail technique est dans `CLAUDE.md`.

## 1. L'événement et le défi
- Epitech Kremlin-Bicêtre, challenge de 13h00 à 16h00, équipes de 1 à 3.
- **Défi** : construire un **outil ou une visualisation** qu'un **coach, un recruteur ou un commentateur NFL** utiliserait, **ou** inventer une **métrique / un score** inexploré.
- Sujet : les joueurs offensifs **WR (receveurs), TE (ailiers rapprochés), RB (porteurs de balle)**.
- Notation de 1 à 5 : compréhension football, exécution technique, communication, originalité. 3 tours : triage, notation par grille, délibération.

## 2. À rendre avant 16h
1. **Dépôt GitHub public** avec le code Python/TS fonctionnel.
2. Le **résultat** : visualisation, capture d'écran de l'outil ou démo de la métrique.
3. **README de 3 à 5 phrases** : ce qu'on a construit, ce que ça révèle, qui l'utiliserait.
4. **Soumission via le formulaire : https://tinyurl.com/awsnfl2026** (à ne pas oublier, en plus du repo).

## 3. Règles
- Tout le code, les analyses et les visualisations sont écrits **sur place** pendant la compétition.
- Données externes autorisées si publiques et gratuites (nflverse, Pro Football Reference).
- Interdit : créer une librairie dédiée à l'événement.

## 4. Conseils reçus d'un membre de l'événement (prioritaires)
Répondre clairement, en une phrase chacune :
1. **Pour qui ?**
2. **Quelle situation de jeu résout-on ?**
3. **Quelle métrique ?**
4. **Quel résultat obtenu ?** (chiffres + exemples)

Priorités du jury, par ordre : **insight football pour un pro** > technique > lisibilité (app + README) > originalité. Test final : un coach peut-il vraiment utiliser l'outil ?

## 5. Les données
- Dans `data/` (826 Mo, **ignoré par git**). Source : https://github.com/ThompsonJamesBliss/nfl-big-data-bowl-regional-event-data
- **Saison 2021, semaines 1 à 8, 122 matchs, 8 557 jeux.** Le slide de l'événement parle de 2023 avec des données « pré-lancer / post-lancer » : le repo contient du tracking classique 2021. **Écart non confirmé auprès des organisateurs.**

| Fichier | Contenu | Clés |
|---|---|---|
| `games.csv` | matchs | gameId |
| `plays.csv` | down, distance, formation, personnel, couverture PFF, résultat | gameId, playId |
| `players.csv` | poste, taille, poids, nom (210 WR, 126 RB, 121 TE) | nflId |
| `pffScoutingData.csv` | rôle sur le jeu (route, blocage…), alignement | gameId, playId, nflId |
| `tracking/tracking_[gameId].csv` | position x/y, vitesse, accélération, orientation, `event`, à 10 images/s | gameId, playId, nflId, frameId |

Pièges : terrain de 120 × 53,3 yards ; normaliser le sens de jeu avec `playDirection` ; `playId` n'est pas unique entre matchs ; **il n'y a pas de colonne « receveur ciblé »** (à inférer, par ex. joueur le plus proche du ballon à `pass_arrived`).

## 6. Stack et décisions validées
- **PWA Next.js (TypeScript) + Hono + Better Auth.** Analyse en **Python** (pandas) hors ligne ; elle exporte des **JSON agrégés** que l'API Hono sert. L'app web ne lit jamais les CSV de tracking.
- **SQLite** (pas de Prisma). Auth simple + **accès démo en un clic** pour le jury.
- **Tout est dockerisé** (Dockerfile + `docker-compose.yml`), hébergé sur le VPS d'un membre de l'équipe.
- Utilisateur cible retenu pour l'instant : **le coach** (préparation de match).

## 7. Pistes d'outil (axe pas encore tranché)
| | Idée | Situation |
|---|---|---|
| **A – Get-Open Score** | Qui se démarque le plus vite, comparé à l'attendu selon la couverture adverse | Passe, selon le type de couverture |
| **B – Mismatch Radar** | Détecter les duels favorables (ex. RB ou TE couvert par un linebacker) en couverture « homme à homme » | Plan de match contre une défense |
| **C – Space Score** | Espace libre autour du receveur à la réception, YAC attendu vs réel | Après la réception |

Choix en attente des chiffres de l'exploration de données : **B si l'appariement receveur/défenseur est assez stable, sinon A.** Le pitch (section 4) sera rédigé une fois l'axe choisi.

## 8. Organisation du travail avec Claude Code
- Skill `hackathon-orchestrator` (modèle Opus) : cadre et délègue. Sous-agents (modèle Sonnet) : `data-explorer`, `builder`, `doc-writer`, `deployer`. Dans `.claude/`.
- Skills Better Auth et règle Hono importés depuis https://github.com/Valtyyy/ClaudeCode-Hono (seulement ce qui sert en 3h).
- Pas de commit/push sans demande explicite.

## 9. État au moment de l'écriture
- Fait : mémoire projet, `CLAUDE.md`, skills/agents, données dans `data/`.
- En cours : exploration des données (faisabilité des axes) et squelette web (`web/` : Next + Hono + Better Auth + PWA + Docker).
- À faire : choisir l'axe, calculer la métrique en Python, exporter les JSON, écran principal, README de 3 à 5 phrases, repo public, formulaire.

## 10. Planning cible
| Heure | Objectif |
|---|---|
| 14h00 | Axe choisi, pitch en 4 phrases |
| 14h00–15h00 | Calcul de la métrique + export JSON |
| 15h00–15h30 | Écran principal + visuel animé |
| 15h30–15h45 | README + repo public propre |
| 15h45–15h55 | Vérif depuis un clone propre + **formulaire** |
