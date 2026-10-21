"""Chemins partagés : données brutes (NFL_DATA_DIR, sinon data/ du repo, sinon le dossier voisin) et dossiers d'export du web."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _data_dir():
    if os.environ.get("NFL_DATA_DIR"): return os.environ["NFL_DATA_DIR"]
    local = os.path.join(ROOT, "data")
    return local if os.path.isdir(local) else os.path.join(os.path.dirname(ROOT), "nfl-big-data-bowl-regional-event-data", "data")

D = _data_dir()
# web/data est lu côté serveur (lib/data.ts), web/public/data côté client (fetch /data/...) : on écrit dans les deux.
WEB_DIRS = [os.path.join(ROOT, "web", "data"), os.path.join(ROOT, "web", "public", "data")]
for _w in WEB_DIRS: os.makedirs(_w, exist_ok=True)
