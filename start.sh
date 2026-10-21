#!/usr/bin/env bash
# Lance tout le projet.
#   ./start.sh            app en local (pnpm dev) avec les JSON déjà commités
#   ./start.sh --data     recalcule d'abord les données (analysis/run_all.sh), puis lance l'app
#   ./start.sh --docker   app en Docker (docker compose up --build)
# Données brutes : NFL_DATA_DIR, sinon data/ du repo, sinon ../nfl-big-data-bowl-regional-event-data/data
set -euo pipefail
cd "$(dirname "$0")"

DATA=0; DOCKER=0
for arg in "$@"; do
  case "$arg" in
    --data) DATA=1 ;;
    --docker) DOCKER=1 ;;
    -h|--help) sed -n 2,6p "$0"; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)"; exit 1 ;;
  esac
done

# Sans JSON, l'app n'a rien à afficher : on force le calcul
if ! ls web/data/*.json >/dev/null 2>&1; then DATA=1; fi

if [ "$DATA" = 1 ]; then
  echo "==> Calcul des données"
  if [ ! -x .venv/bin/python ]; then
    python3 -m venv .venv
    .venv/bin/pip install -q -r analysis/requirements.txt
  fi
  PYTHON="$PWD/.venv/bin/python" analysis/run_all.sh
fi

cd web
if [ "$DOCKER" = 1 ]; then
  echo "==> Docker : http://localhost:3000"
  docker compose up --build
else
  # Next refuse un 2e serveur de dev dans le même dossier : on réutilise celui qui tourne
  if curl -s -o /dev/null --max-time 2 http://localhost:3000; then
    echo "==> Un serveur tourne déjà : http://localhost:3000 (les nouvelles données y sont servies)"
    exit 0
  fi
  echo "==> App : http://localhost:3000"
  [ -d node_modules ] || pnpm install
  pnpm dev
fi
