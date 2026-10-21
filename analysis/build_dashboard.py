"""Fiches joueurs + scouting équipes -> web/data/player_profiles.json et teams.json (nombres/codes/noms seulement)."""
import os, json, math
import numpy as np, pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data"); OUT = os.path.join(ROOT, "analysis", "out"); WEB = os.path.join(ROOT, "web", "data")

def clean(o):
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [clean(v) for v in o]
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (float, np.floating)): return None if (math.isnan(o) or math.isinf(o)) else float(o)
    if isinstance(o, np.bool_): return bool(o)
    return o
def dump(name, obj):
    p = os.path.join(WEB, name)
    with open(p, "w", encoding="utf-8") as f: json.dump(clean(obj), f, ensure_ascii=False, separators=(",", ":"))
    print(name, os.path.getsize(p) // 1024, "KB")
def rnd(x, n=2): return None if x is None or pd.isna(x) else round(float(x), n)

# ---------- données
r = pd.read_csv(os.path.join(OUT, "routes.csv"))
tg = pd.read_csv(os.path.join(OUT, "targets.csv"))
plays = pd.read_csv(os.path.join(D, "plays.csv"), usecols=["gameId", "playId", "offenseFormation"])
games = pd.read_csv(os.path.join(D, "games.csv"), usecols=["gameId", "week"])
bio = pd.read_csv(os.path.join(D, "players.csv")).set_index("nflId")
PS = json.load(open(os.path.join(WEB, "players_soe.json")))["players"]
PSd = {p["nflId"]: p for p in PS}
OL = {p["nflId"]: p for p in json.load(open(os.path.join(WEB, "overlooked.json")))["players"]}
TEND = json.load(open(os.path.join(WEB, "defense_tendencies.json")))
REP = {(x["gameId"], x["playId"]): i for i, x in enumerate(json.load(open(os.path.join(WEB, "replays.json"))))}

r = r.merge(tg, on=["gameId", "playId"], how="left").merge(plays, on=["gameId", "playId"], how="left").merge(games, on="gameId", how="left")
r["ctype"] = r.pff_passCoverageType.str.lower().where(r.pff_passCoverageType.isin(["Man", "Zone"]), "other")
r["ctype"] = r.ctype.where(r.ctype.isin(["man", "zone"]), "other")
exp = r[r.ctype != "other"].groupby(["pos", "align", "ctype"]).sep.median().rename("exp")
r = r.join(exp, on=["pos", "align", "ctype"]); r["soe"] = r.sep - r.exp
r["is_target"] = r.nflId == r.target_nflId
r["tdflag"] = r.is_target & (r.complete_pass == 1) & r.playDescription.str.contains("TOUCHDOWN", na=False)
r["rec"] = r.is_target & (r.complete_pass == 1)
N = r[["gameId", "playId"]].drop_duplicates().shape[0]

# ---------- player_profiles.json
def inches(h):
    try:
        a, b = str(h).split("-"); return int(a) * 12 + int(b)
    except Exception: return None
rows = []
for nid, g in r.groupby("nflId"):
    if len(g) < 10: continue
    ps = PSd.get(int(nid), {}); ol = OL.get(int(nid), {}); b = bio.loc[nid] if nid in bio.index else None
    t = g[g.is_target]
    teams = g.possessionTeam.value_counts().index.tolist()
    age = None
    if b is not None:
        bd = pd.to_datetime(b.birthDate, format="%m/%d/%Y", errors="coerce") if "/" in str(b.birthDate) else pd.to_datetime(b.birthDate, errors="coerce")
        if pd.notna(bd): age = round((pd.Timestamp("2021-09-09") - bd).days / 365.25, 1)
    d = dict(id=int(nid), name=g.displayName.iloc[0], position=g.pos.iloc[0], team=teams[0], teams=sorted(teams),
             height_in=inches(b.height) if b is not None else None, weight=None if b is None else rnd(b.weight, 0),
             age=age, college=None if b is None else b.collegeName, routes=int(len(g)), low_n=bool(len(g) < 50),
             targets=int(len(t)), receptions=int(t.rec.sum()), rec_yards=rnd(t[t.rec].yards_gained.sum(), 0), tds=int(t.tdflag.sum()),
             catch_rate=rnd(t.rec.sum() / len(t), 3) if len(t) else None, target_rate=rnd(len(t) / len(g), 3),
             air_yards_avg=rnd(t.air_yards.mean()), yac_avg=rnd(t[t.rec].yards_after_catch.mean()),
             epa_per_target=rnd(t.epa.mean(), 3), success_rate=rnd(t.success.mean(), 3), cpoe_avg=rnd(t.cpoe.mean()),
             soe_all=ps.get("soe_all"), soe_man=ps.get("soe_man"), soe_zone=ps.get("soe_zone"), n_man=ps.get("n_man"), n_zone=ps.get("n_zone"),
             sep_raw_man=ps.get("sep_man_raw"), sep_raw_zone=ps.get("sep_zone_raw"), tier=ps.get("tier", "insufficient"),
             expected_targets=ol.get("expected_targets"), toe=ol.get("toe"))
    al = []
    for a, x in g.groupby("align"):
        s = x.soe.dropna()
        al.append(dict(align=a, routes=int(len(x)), soe=rnd(s.mean()) if len(s) >= 3 else None, targets=int(x.is_target.sum())))
    d["by_alignment"] = sorted(al, key=lambda z: -z["routes"])
    cv = []
    for c, x in g.groupby("pff_passCoverage"):
        if len(x) < 8: continue
        s = x.soe.dropna(); tt = x[x.is_target]
        cv.append(dict(coverage=c, type=x.ctype.iloc[0], routes=int(len(x)), soe=rnd(s.mean()) if len(s) >= 3 else None,
                       targets=int(len(tt)), epa_per_target=rnd(tt.epa.mean(), 3)))
    d["by_coverage"] = sorted(cv, key=lambda z: -z["routes"])
    d["by_week"] = [dict(week=w, routes=int(len(x)), soe=rnd(x.soe.dropna().mean()) if x.soe.notna().sum() >= 3 else None,
                         targets=int(x.is_target.sum())) for w in range(1, 9) for x in [g[g.week == w]]]
    bp = []
    for _, x in t[t.soe.notna()].sort_values("soe", ascending=False).head(3).iterrows():
        bp.append(dict(gameId=int(x.gameId), playId=int(x.playId), week=int(x.week), opponent=x.defensiveTeam, down=int(x.down),
                       yards_to_go=int(x.yardsToGo), coverage=x.pff_passCoverage, sep=rnd(x.sep), soe=rnd(x.soe), epa=rnd(x.epa, 2),
                       result=x.passResult, description=x.playDescription, replay_index=REP.get((int(x.gameId), int(x.playId)))))
    d["best_plays"] = bp
    rows.append(d)
P = pd.DataFrame(rows)
def pct(col, mask):
    P["pct_" + col] = np.nan
    for pos, g in P[mask].groupby("position"):
        P.loc[g.index, "pct_" + col] = (g[col].rank(pct=True) * 100).round(0)
pct_cols = {}
for key, col, mask in [("soe_all", "soe_all", P.soe_all.notna()), ("soe_man", "soe_man", P.soe_man.notna()), ("soe_zone", "soe_zone", P.soe_zone.notna()),
                       ("target_rate", "target_rate", P.routes >= 50), ("epa", "epa_per_target", P.targets >= 15)]:
    P["pct_" + key] = np.nan
    for pos, g in P[mask].groupby("position"):
        P.loc[g.index, "pct_" + key] = (g[col].rank(pct=True) * 100).round(0)
P["rank_soe_all"] = P.groupby("position").soe_all.rank(ascending=False, method="min")
P["n_rank"] = P.groupby("position").soe_all.transform("count")
P.loc[P.soe_all.isna(), ["rank_soe_all", "n_rank"]] = np.nan
P = P.sort_values("routes", ascending=False)
recs = [clean({k: v for k, v in x.items()}) for x in P.to_dict("records")]
for x in recs:
    for k in ("rank_soe_all", "n_rank", "pct_soe_all", "pct_soe_man", "pct_soe_zone", "pct_target_rate", "pct_epa"):
        if x[k] is not None: x[k] = int(x[k])
dump("player_profiles.json", dict(meta=dict(version=1, season=2021, week_from=1, week_to=8, n_players=len(recs), min_routes=10, low_n_below=50,
                                           age_on="2021-09-09", n_plays=N), players=recs))

# ---------- teams.json
pl = r.drop_duplicates(["gameId", "playId"]).copy()
pl["shotgun"] = pl.offenseFormation == "SHOTGUN"
def mix(g):
    vc = g.pff_passCoverage.value_counts()
    return [dict(coverage=k, pct=rnd(100 * v / len(g), 1), n=int(v)) for k, v in vc.items()]
def forms(g):
    return [dict(formation=f, n=int(len(x)), pct_man=rnd(100 * (x.ctype == "man").mean(), 1)) for f, x in g.groupby("offenseFormation") if len(x) >= 5]
def dfn(g_pl, g_r):
    n = len(g_pl)
    return dict(pass_plays_faced=int(n), pct_man=rnd(100 * (g_pl.ctype == "man").mean(), 1), pct_zone=rnd(100 * (g_pl.ctype == "zone").mean(), 1),
                pct_other=rnd(100 * (g_pl.ctype == "other").mean(), 1), soe_allowed=rnd(g_r.soe.mean(), 3),
                soe_allowed_man=rnd(g_r[g_r.ctype == "man"].soe.mean(), 3), soe_allowed_zone=rnd(g_r[g_r.ctype == "zone"].soe.mean(), 3),
                epa_allowed_per_pass=rnd(g_pl.epa.mean(), 3), sep_allowed_man=rnd(g_r[g_r.ctype == "man"].sep.mean()),
                sep_allowed_zone=rnd(g_r[g_r.ctype == "zone"].sep.mean()), coverage_mix=mix(g_pl), by_formation=forms(g_pl),
                vulnerable_positions={p: rnd(g_r[g_r.pos == p].soe.mean(), 3) for p in ("WR", "TE", "RB")})
teams = {}
for T in sorted(r.defensiveTeam.unique()):
    go, gd = r[r.possessionTeam == T], r[r.defensiveTeam == T]
    po, pd_ = pl[pl.possessionTeam == T], pl[pl.defensiveTeam == T]
    top = sorted([p for p in PS if p["team"] == T and p["soe_all"] is not None], key=lambda p: -p["soe_all"])[:3]
    off = dict(routes=int(len(go)), soe_generated=rnd(go.soe.mean(), 3), epa_per_pass=rnd(po.epa.mean(), 3), pass_plays=int(len(po)),
               pct_shotgun=rnd(100 * po.shotgun.mean(), 1),
               top3_receivers=[dict(nflId=p["nflId"], name=p["name"], soe_all=p["soe_all"]) for p in top])
    de = dfn(pd_, gd)
    de["by_down_distance"] = TEND["teams"][T]["situations"]
    wm = gd[gd.soe.notna()].groupby("nflId").agg(soe=("soe", "mean"), routes=("soe", "size"), name=("displayName", "first"), team=("possessionTeam", "first"))
    wm = wm[wm.routes >= 8].sort_values("soe", ascending=False).head(5)
    de["worst_matchups"] = [dict(nflId=int(i), name=x["name"], team=x.team, soe=rnd(x.soe, 2), routes=int(x.routes)) for i, x in wm.iterrows()]
    teams[T] = dict(offense=off, defense=de)
order = sorted(teams, key=lambda t: teams[t]["defense"]["soe_allowed"])
for i, t in enumerate(order): teams[t]["defense"]["rank_soe_allowed"] = i + 1
lg = dfn(pl, r)
lg["by_down_distance"] = TEND["LEAGUE"]["situations"]
lg.update(routes=int(len(r)), epa_per_pass=rnd(pl.epa.mean(), 3), pct_shotgun=rnd(100 * pl.shotgun.mean(), 1))
dump("teams.json", dict(meta=dict(version=1, n_teams=len(teams), n_plays=N, min_routes_matchup=8), teams=teams, league=lg))
