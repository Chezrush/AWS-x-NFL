"""Données publiques nflverse (play-by-play 2021 + table joueurs) -> analysis/out/targets.csv
Cible exacte de chaque passe (receiver_player_id -> gsis_id -> nflId) + EPA/CPOE.
Télécharge les fichiers dans data/external/ s'ils manquent."""
import os, urllib.request
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "data", "external"); OUT = os.path.join(ROOT, "analysis", "out")
URLS = {"pbp_2021.csv.gz": "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2021.csv.gz",
        "players.csv": "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv"}
os.makedirs(EXT, exist_ok=True); os.makedirs(OUT, exist_ok=True)
for f, u in URLS.items():
    p = os.path.join(EXT, f)
    if not os.path.exists(p):
        print("téléchargement", u); urllib.request.urlretrieve(u, p)

cols = ["old_game_id", "play_id", "receiver_player_id", "epa", "success", "cp", "cpoe", "complete_pass",
        "air_yards", "yards_after_catch", "yards_gained", "pass_location", "pass_length"]
pbp = pd.read_csv(os.path.join(EXT, "pbp_2021.csv.gz"), usecols=cols, low_memory=False)
pl = pd.read_csv(os.path.join(EXT, "players.csv"), usecols=["gsis_id", "nfl_id"]).dropna()
pl["nfl_id"] = pl.nfl_id.astype(int)
pbp["gameId"] = pd.to_numeric(pbp.old_game_id, errors="coerce")
pbp = pbp.dropna(subset=["gameId"]).astype({"gameId": "int64"}).rename(columns={"play_id": "playId"})
pbp["playId"] = pbp.playId.astype(int)
pbp = pbp.merge(pl.rename(columns={"gsis_id": "receiver_player_id", "nfl_id": "target_nflId"}),
                on="receiver_player_id", how="left")
pbp = pbp.drop(columns=["old_game_id", "receiver_player_id"]).drop_duplicates(["gameId", "playId"])
pbp.to_csv(os.path.join(OUT, "targets.csv"), index=False)
print("targets.csv:", len(pbp), "jeux, cible identifiée:", int(pbp.target_nflId.notna().sum()))
