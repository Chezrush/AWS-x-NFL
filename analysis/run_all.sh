#!/usr/bin/env bash
# Régénère toutes les données de l'app depuis les CSV (données : NFL_DATA_DIR, voir paths.py).
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"
"$PY" build_routes.py       # tracking -> out/routes.csv
"$PY" build_nflverse.py     # cible exacte + EPA/CPOE -> out/targets.csv
"$PY" build_exports.py      # SOE -> players_soe, overlooked, game_plan, replays, defense_tendencies
"$PY" validate_soe.py       # validation.json
"$PY" build_dashboard.py    # player_profiles.json, teams.json
"$PY" build_radar.py        # leaderboard.json, featured_plays.json (Mismatch Radar)
"$PY" make_figures.py       # PNG dans out/figures/{fr,en}
