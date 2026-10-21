# Who to Attack 🏈

**Trouvez les receveurs qui créent de l'espace, préparez les duels qui comptent.** Un outil de préparation de match pour coordinateurs offensifs NFL, basé sur le tracking Next Gen Stats. · [English](README.md)

![Who to Attack : vue d'ensemble avec le radar animé et le classement des receveurs sous-exploités](docs/img/who-to-attack-overview-en.png)

Au moment du lancer, chaque receveur éligible (WR/TE/RB) reçoit un **Optimal Target Score (OTS, 0–99)** : séparation avec le défenseur le plus proche maintenant et à +0,5 s, avec bonus en cas de mismatch (RB/TE couvert par un linebacker, avantage de vitesse) et s'il a dépassé la ligne du 1er essai. Sur **6 867 passes et 31 446 routes**, un mismatch vaut **+0,9 yd** de séparation projetée, et les passes où le QB trouve l'option la plus ouverte donnent **+0,63 EPA contre +0,07** sinon. Le coordinateur voit qui est ouvert mais oublié, et quelle défense attaquer.

**Fonctions :** vue d'ensemble (radar animé + receveurs sous-exploités), plan de match par adversaire, tableau des joueurs avec fiche détaillée, tendances des défenses (homme/zone par down et distance), replays des plus gros écarts, méthode & données. Recherche `⌘K`, FR/EN, mode sombre, PWA installable.

**Lancer :** `docker compose -f web/docker-compose.yml up --build` (http://localhost:3000) ; `python3 scripts/build_metrics.py` recalcule les JSON (~10 s).

**Limites :** l'OTS est un modèle (ni lecture de couverture, ni pression) ; un écart avec le meilleur OTS est une piste à revoir, pas une erreur prouvée. Les RB paraissent ouverts car souvent seuls dans l'espace. Cible réelle issue de nflverse ; saison 2021, semaines 1–8 ; corrélation, pas causalité.
