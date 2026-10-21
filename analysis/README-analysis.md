# Analyse (FR)
Relancer : `python3 analysis/build_routes.py`, puis `python3 analysis/build_nflverse.py` (cible exacte, EPA/CPOE ; télécharge nflverse dans data/external/ si absent) (~10 s, tracking -> out/routes.csv), puis `python3 analysis/build_exports.py` (SOE + JSON dans web/data/), puis `python3 analysis/make_figures.py` (PNG fr/ et en/ dans out/figures/).
SOE (écart de séparation) = distance au défenseur de couverture le plus proche au lancer, moins la valeur médiane attendue pour le même poste, le même alignement et le même type de couverture (Man/Zone). Les moyennes par joueur sont ramenées vers 0 (poids n/(n+20)) ; classement seulement à partir de 30 routes. Jeux exclus : fautes, sacks, scrambles, sans lancer.

# Analysis (EN)
Rerun: `python3 analysis/build_routes.py`, then `python3 analysis/build_nflverse.py` (exact target, EPA/CPOE; downloads nflverse into data/external/ if missing) (~10 s, tracking -> out/routes.csv), then `python3 analysis/build_exports.py` (SOE + JSON in web/data/), then `python3 analysis/make_figures.py` (PNGs in out/figures/fr and en).
SOE (Separation Over Expected) = distance to the nearest coverage defender at the throw, minus the median expected for the same position, alignment group and coverage type (Man/Zone). Player means are shrunk toward 0 (weight n/(n+20)); ranked only with 30+ routes. Excluded: penalties, sacks, scrambles, no-throw plays.

Validation: `python3 analysis/validate_soe.py` (completion rate of the targeted receiver by SOE tercile -> web/data/validation.json).

Ajouts (FR) : `python3 analysis/validate_soe.py` écrit validation.json (complétion, EPA, succès, CPOE par tercile de SOE). `overlooked.json` (écrit par build_exports.py) : cibles réelles vs attendues (modèle : taux de ciblage par poste x couverture x décile de SOE), TOE = réelles - attendues ; « oublié » = SOE > 0 et TOE < 0 (>= 50 routes).
Additions (EN): `python3 analysis/validate_soe.py` writes validation.json (completion, EPA, success, CPOE by SOE tercile). `overlooked.json` (written by build_exports.py): actual vs expected targets (model: target rate by position x coverage x SOE decile), TOE = actual - expected; "overlooked" = SOE > 0 and TOE < 0 (>= 50 routes).
Source nflverse (public): https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2021.csv.gz and .../players/players.csv

Tableau de bord (FR) : `python3 analysis/build_dashboard.py` (après build_exports.py) écrit web/data/player_profiles.json (fiches WR/TE/RB, >= 10 routes, `low_n` si < 50) et teams.json (attaque/défense par équipe + ligue). Âge au 2021-09-09 ; nombres, codes et noms seulement.
Dashboard (EN): `python3 analysis/build_dashboard.py` (after build_exports.py) writes web/data/player_profiles.json (WR/TE/RB profiles, >= 10 routes, `low_n` if < 50) and teams.json (offense/defense per team + league). Age on 2021-09-09; numbers, codes and names only.
