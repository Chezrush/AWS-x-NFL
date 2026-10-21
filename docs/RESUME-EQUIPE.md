# Résumé équipe – NFL Big Data Bowl Paris (AWS x NFL)

Écrit le 21/10/2026 vers 13h55. **Soumission fermée à 16h00 précises.** Ce document résume tout ce qu'il faut savoir pour rejoindre le projet.

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

## 6. Stack (simplifiée : c'est un PoC)
- **PWA Next.js (TypeScript) + i18n FR/EN (next-intl)** + **Docker** (`docker compose -f web/docker-compose.yml up --build`, port 3000).
- Analyse **Python** (pandas) dans `analysis/` qui exporte des JSON dans `web/data/`, lus en statique par le front.
- **Abandonnés** : Hono, Better Auth, SQLite, auth (inutiles pour un PoC).
- Pas de démo orale : le **README.md racine (anglais, court, impactant)** et les captures dans `docs/img/` sont le livrable principal. `README.fr.md` en version française.

## 7. Axe retenu : « Qui attaquer » (décidé à 13h58)
- **Pour qui** : le coordinateur offensif. **Situation** : passe contre une défense qui choisit homme/zone. **Métrique** : SOE (séparation au lancer moins l'attendu pour ce poste, alignement et type de couverture). **Résultat** : outil « plan de match » (équipe, défense, down, distance -> receveurs à viser) + classement + replay animé.
- Preuve : sur 6 056 passes ciblées, complétion 50 % -> 69 % -> 80 % selon le SOE (bas/moyen/haut).
- Abandonné : le duel receveur/défenseur individuel (appariement stable sur 29 % des jeux homme seulement).

## 8. État (14h10)
- Fait : analyse Python et 5 JSON, validation, application complète (hero, preuve, plan de match, classement, replay animé, méthode), FR/EN, Docker testé, README EN + FR, captures dans `docs/img/`.
- Reste : relecture du README, vérif depuis un clone propre, repo public, **soumission via https://tinyurl.com/awsnfl2026**.

## 9. Planning cible
| Heure | Objectif |
|---|---|
| 14h00 | Axe choisi, pitch en 4 phrases |
| 14h00–15h00 | Calcul de la métrique + export JSON |
| 15h00–15h30 | Écran principal + visuel animé |
| 15h30–15h45 | README + repo public propre |
| 15h45–15h55 | Vérif depuis un clone propre + **formulaire** |
