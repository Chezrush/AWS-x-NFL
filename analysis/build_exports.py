"""Étape 2 : SOE + exports JSON dans web/data/ (aucune phrase rédigée dans les JSON)."""
import os, json
import numpy as np, pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from paths import D, WEB_DIRS
OUT = os.path.join(ROOT, "analysis", "out")
WEB = os.path.join(ROOT, "web", "data"); os.makedirs(WEB, exist_ok=True)
K, MINN = 20, 30

def dump(name, obj):
    for w in WEB_DIRS:
        p = os.path.join(w, name)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(name, os.path.getsize(p) // 1024, "KB")

r = pd.read_csv(os.path.join(OUT, "routes.csv"))
nplays0 = r[["gameId", "playId"]].drop_duplicates().shape[0]
games = pd.read_csv(os.path.join(D, "games.csv"))
r["ctype"] = r.pff_passCoverageType.str.lower()
mz = r[r.ctype.isin(["man", "zone"])].copy()
exp = mz.groupby(["pos", "align", "ctype"]).sep.median().rename("exp")
mz = mz.join(exp, on=["pos", "align", "ctype"])
mz["soe"] = mz.sep - mz.exp
r = r.merge(mz[["gameId", "playId", "nflId", "exp", "soe"]], on=["gameId", "playId", "nflId"], how="left")

import re, unicodedata
SUF = {"jr", "sr", "ii", "iii", "iv", "v"}
def _n(s): return re.sub(r"[^a-z]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower())
def target_key(desc):
    m = re.search(r"\bto ([A-Za-z]{1,2})\.([A-Za-z'\-\. ]+?)(?= for | to |\.$|\.\s|,| \(| \[|$)", str(desc))
    return (m.group(1)[0].lower(), _n(m.group(2))) if m else None
def name_key(dn):
    t = [w for w in re.split(r"\s+", dn.strip()) if _n(w) not in SUF]
    return (_n(t[0])[:1], _n(" ".join(t[1:]))) if len(t) > 1 else (None, None)
r["nk"] = r.displayName.map(name_key)
r["tk"] = r.playDescription.map(target_key)
r["is_target"] = False
for _, g in r.groupby(["gameId", "playId"]):
    k = g.tk.iloc[0]
    if k is None: continue
    hit = g.index[g.nk == k]
    if len(hit) == 1: r.loc[hit[0], "is_target"] = True
r["is_target_txt"] = r.is_target
tg = pd.read_csv(os.path.join(OUT, "targets.csv"))
r = r.merge(tg, on=["gameId", "playId"], how="left")
r["is_target"] = r.nflId == r.target_nflId
# accord ancienne méthode (texte) vs nflverse, sur les jeux où les deux ont une cible
both = r.groupby(["gameId", "playId"]).agg(t=("is_target", "any"), x=("is_target_txt", "any"))
agree = r[r.is_target & r.is_target_txt].shape[0]
print("cibles texte:", int(r.is_target_txt.sum()), "| cibles nflverse:", int(r.is_target.sum()), "| accord:", agree,
      "(%.1f%% des cibles texte)" % (100 * agree / max(r.is_target_txt.sum(), 1)))
print("jeux avec cible nflverse parmi les routes:", int(r.is_target.sum()), "/", nplays0)

def shr(m, n): return m * n / (n + K)

# ---------- players_soe.json
rows = []
for nid, g in r.groupby("nflId"):
    d = dict(nflId=int(nid), name=g.displayName.iloc[0], position=g.pos.iloc[0],
             team=g.possessionTeam.mode().iloc[0], routes=int(len(g)))
    for t in ("man", "zone"):
        s = g[g.ctype == t]; n = len(s)
        d[f"n_{t}"] = n
        d[f"soe_{t}"] = round(float(shr(s.soe.mean(), n)), 3) if n >= MINN else None
        d[f"sep_{t}_raw"] = round(float(s.sep.mean()), 2) if n else None
    s = g[g.ctype.isin(["man", "zone"])]; n = len(s)
    d["n_all"] = n
    d["soe_all"] = round(float(shr(s.soe.mean(), n)), 3) if n >= MINN else None
    rows.append(d)
P = pd.DataFrame(rows)
q = P.soe_all.dropna()
p90, p60, p25 = q.quantile([.9, .6, .25])
def tier(v):
    if v is None or pd.isna(v): return "insufficient"
    return "elite" if v >= p90 else "good" if v >= p60 else "avg" if v >= p25 else "low"
P["tier"] = P.soe_all.map(tier)
P = P.sort_values("routes", ascending=False)
nplays = r[["gameId", "playId"]].drop_duplicates().shape[0]
meta = dict(version=1, season=2021, week_from=1, week_to=8, n_plays=nplays, n_routes=int(len(r)),
            n_players=int(len(P)), shrinkage_k=K, min_routes=MINN,
            tier_cutoffs=dict(elite=round(float(p90), 3), good=round(float(p60), 3), avg=round(float(p25), 3)))
P2 = P.astype(object).where(P.notna(), None)
dump("players_soe.json", dict(meta=meta, players=P2.to_dict("records")))

# ---------- defense_tendencies.json
pl = r.drop_duplicates(["gameId", "playId"]).copy()
pl["ctype"] = pl.pff_passCoverageType.str.lower().fillna("other")
pl.loc[~pl.ctype.isin(["man", "zone"]), "ctype"] = "other"
pl["dist"] = np.where(pl.yardsToGo <= 3, "short", np.where(pl.yardsToGo <= 7, "medium", "long"))
pl["sit"] = pl.down.astype(int).astype(str) + "_" + pl.dist
def summ(g, detail=True):
    n = len(g); vc = g.pff_passCoverage.value_counts()
    d = dict(n=n, pct_man=round(100 * (g.ctype == "man").mean(), 1))
    if detail: d.update(pct_zone=round(100 * (g.ctype == "zone").mean(), 1), pct_other=round(100 * (g.ctype == "other").mean(), 1))
    d["top_coverage"] = vc.index[0] if n else None
    d["n_top"] = int(vc.iloc[0]) if n else 0
    return d
def block(g):
    b = summ(g); b["situations"] = {s: summ(x, False) for s, x in g.groupby("sit")}
    return b
tend = dict(LEAGUE=block(pl), teams={t: block(g) for t, g in pl.groupby("defensiveTeam")})
dump("defense_tendencies.json", tend)

# ---------- game_plan.json  (top receveurs par équipe offensive + type dominant par défense/situation)
Pi = P.set_index("nflId")
top = {}
for team, g in r.groupby("possessionTeam"):
    top[team] = {}
    for t in ("man", "zone"):
        s = g[g.ctype == t].groupby("nflId").agg(n=("soe", "size"), m=("soe", "mean"))
        s = s[s.n >= 15].copy(); s["shr"] = shr(s.m, s.n)
        s = s[[Pi.team.get(i) == team for i in s.index]]
        s = s.sort_values("shr", ascending=False).head(3)
        top[team][t] = [dict(nflId=int(i), name=Pi.name[i], position=Pi.position[i], soe=round(float(x.shr), 3),
                             n=int(x.n), low_n=bool(x.n < MINN)) for i, x in s.iterrows()]
lg = tend["LEAGUE"]
def dom(b):  # man vs zone parmi les jeux Man/Zone
    return b
dominant = {}
for team, g in pl.groupby("defensiveTeam"):
    dominant[team] = {}
    allsits = list(lg["situations"].keys()) + ["all"]
    for s in allsits:
        gs = g if s == "all" else g[g.sit == s]
        basis, src = "situation", gs
        if (gs.ctype != "other").sum() < 8:
            basis, src = "team", g
        if (src.ctype != "other").sum() < 8: basis, src = "league", pl
        nm, nz = (src.ctype == "man").sum(), (src.ctype == "zone").sum()
        dominant[team][s] = dict(type="man" if nm > nz else "zone", pct_man=round(100 * nm / max(nm + nz, 1), 1),
                                 n=int(nm + nz), basis=basis)
dump("game_plan.json", dict(top_receivers=top, dominant=dominant))

# ---------- overlooked.json ("ouvert mais oublié")
r["bin"] = "other"
for (po, ct), g in r[r.soe.notna()].groupby(["pos", "ctype"]):
    r.loc[g.index, "bin"] = pd.qcut(g.soe, 10, labels=False, duplicates="drop").astype(str)
r["cell"] = r.pos + "|" + r.ctype.fillna("other") + "|" + r.bin
r["exp_t"] = r.groupby("cell").is_target.transform("mean")
rr = r[r.pff_passCoverageType.notna() | True]
agg = r.groupby("nflId").agg(routes=("exp_t", "size"), targets=("is_target", "sum"), expected=("exp_t", "sum"))
agg = agg[agg.routes >= 50].join(Pi[["name", "position", "team", "soe_all", "n_all"]])
agg["target_rate"] = agg.targets / agg.routes; agg["toe"] = agg.targets - agg.expected
agg["soe_mean_raw"] = r[r.soe.notna()].groupby("nflId").soe.mean()
def rec(i, x): return dict(nflId=int(i), name=x["name"], position=x.position, team=x.team, routes=int(x.routes), targets=int(x.targets),
                          target_rate=round(float(x.target_rate), 3), expected_targets=round(float(x.expected), 1), toe=round(float(x.toe), 1),
                          soe_all=None if pd.isna(x.soe_all) else float(x.soe_all), soe_mean_raw=None if pd.isna(x.soe_mean_raw) else round(float(x.soe_mean_raw), 3),
                          n=None if pd.isna(x.n_all) else int(x.n_all))
agg = agg.dropna(subset=["soe_all"])
agg["flag"] = np.where((agg.soe_all > 0) & (agg.toe < 0), "overlooked", np.where((agg.toe > 0) & (agg.soe_all <= 0), "overused", "none"))
over = agg[agg.flag == "overlooked"].sort_values("toe"); used = agg[agg.flag == "overused"].sort_values("toe", ascending=False)
tp = r[r.is_target].copy(); tp["grp"] = tp.nflId.isin(over.index)
epa_g = {("overlooked" if k else "rest"): dict(n=int(len(g)), epa_per_target=round(float(g.epa.mean()), 3), cpoe=round(float(g.cpoe.mean()), 2))
         for k, g in tp.groupby("grp")}
rt = r[r.soe.notna()]
valid = dict(corr_soe_target_route=round(float(rt.soe.corr(rt.is_target.astype(float))), 4), n_routes=int(len(rt)),
             target_rate_by_soe_tercile={str(k): round(float(v), 4) for k, v in rt.groupby(pd.qcut(rt.soe, 3, labels=["low", "mid", "high"]), observed=True).is_target.mean().items()},
             epa_overlooked_vs_rest=epa_g)
dump("overlooked.json", dict(meta=dict(min_routes=50, n_players=int(len(agg)), n_overlooked=int(len(over)), n_overused=int(len(used)), model="pos_x_coverage_x_soe_decile", validation=valid),
     players=[rec(i, x) for i, x in agg.sort_values("toe").iterrows()],
     top_overlooked=[rec(i, x) for i, x in over.head(10).iterrows()], top_overused=[rec(i, x) for i, x in used.head(10).iterrows()]))
print("OVERLOOKED", [(x["name"], x["routes"], x["targets"], x["expected_targets"], x["toe"], x["soe_all"]) for x in [rec(i, x) for i, x in over.head(10).iterrows()]])
print("OVERUSED", [(x["name"], x["routes"], x["targets"], x["expected_targets"], x["toe"], x["soe_all"]) for x in [rec(i, x) for i, x in used.head(5).iterrows()]])
print("VALID", valid)

# ---------- replays.json
cand = r[r.is_target & (r.passResult == "C") & (r.ctype == "man") & r.soe.notna() & (r.sep <= 12) & (r.depth >= 5)].sort_values("soe", ascending=False)
cand = cand.drop_duplicates("gameId").head(8)
wk = games.set_index("gameId")
names = pd.read_csv(os.path.join(D, "players.csv"), usecols=["nflId", "officialPosition", "displayName"]).set_index("nflId")
pff = pd.read_csv(os.path.join(D, "pffScoutingData.csv"), usecols=["gameId", "playId", "nflId", "pff_role", "pff_positionLinedUp"])
reps = []
for _, c in cand.iterrows():
    g = wk.loc[c.gameId]
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{c.gameId}.csv"))
    t = t[t.playId == c.playId].copy()
    if t.playDirection.iloc[0] == "left":
        t["x"] = 120 - t.x; t["y"] = 53.3 - t.y
    t = t[(t.frameId >= c.frame_snap)]
    home_off = c.possessionTeam == g.homeTeamAbbr
    ids = [i for i in t.nflId.dropna().unique()]
    pf = pff[(pff.gameId == c.gameId) & (pff.playId == c.playId)].set_index("nflId")
    first = t[t.frameId == t.frameId.min()].set_index("nflId")
    plist = []
    for i in ids:
        side = first.team.get(i)
        off = side == c.possessionTeam
        role = "target" if i == c.nflId else "closest_defender" if i == c.def_nflId else "offense" if off else "defense"
        plist.append(dict(nflId=int(i), name=names.displayName.get(i), pos=names.officialPosition.get(i),
                          team=c.possessionTeam if off else c.defensiveTeam, side="offense" if off else "defense",
                          role=role, jersey=int(first.jerseyNumber.get(i)) if pd.notna(first.jerseyNumber.get(i)) else None,
                          lined_up=pf.pff_positionLinedUp.get(i) if i in pf.index else None))
    frames = []
    for f, h in t.groupby("frameId"):
        h = h.set_index("nflId"); row = []
        for i in ids:
            row += [round(float(h.x.get(i, np.nan)), 2), round(float(h.y.get(i, np.nan)), 2)] if i in h.index else [None, None]
        b = h[h.index.isna()]
        row += [round(float(b.x.iloc[0]), 2), round(float(b.y.iloc[0]), 2)] if len(b) else [None, None]
        frames.append(row)
    ball0 = t[(t.frameId == c.frame_snap) & t.nflId.isna()]
    reps.append(dict(gameId=int(c.gameId), playId=int(c.playId), week=int(g.week), offense=c.possessionTeam, defense=c.defensiveTeam,
                     quarter=int(c.quarter), down=int(c.down), yardsToGo=int(c.yardsToGo), coverage=c.pff_passCoverage,
                     coverage_type="man", target=dict(nflId=int(c.nflId), name=c.displayName, pos=c.pos),
                     sep=round(float(c.sep), 2), expected_sep=round(float(c.exp), 2), soe=round(float(c.soe), 2),
                     playDescription=c.playDescription, epa=round(float(c.epa), 2) if pd.notna(c.epa) else None, los_x=round(float(ball0.x.iloc[0]), 2),
                     first_down_x=round(float(ball0.x.iloc[0]) + int(c.yardsToGo), 2),
                     pass_frame_index=int(c.frame_pass - c.frame_snap), hz=10,
                     frame_layout="per frame: x,y for each player in order, then ball x,y",
                     players=plist, frames=frames))
dump("replays.json", reps)

# ---------- replays de tous les jeux : index + un fichier de frames par match (web/public/replays)
RDIR = os.path.join(ROOT, "web", "public", "replays"); os.makedirs(RDIR, exist_ok=True)
POST = 5   # le tracking s'arrête ~0,5 s après le lancer
allp = r[r.is_target & r.passResult.isin(["C", "I", "IN"])].drop_duplicates(["gameId", "playId"])
index = []
for gid, gp in allp.groupby("gameId"):
    g = wk.loc[gid]
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{gid}.csv"))
    left = t.playDirection.eq("left")
    t.loc[left, "x"] = 120 - t.x; t.loc[left, "y"] = 53.3 - t.y
    pl_out = {}
    for _, c in gp.iterrows():
        tp = t[(t.playId == c.playId) & (t.frameId >= c.frame_snap) & (t.frameId <= c.frame_pass + POST)]
        if tp.empty: continue
        pf = pff[(pff.gameId == gid) & (pff.playId == c.playId)].set_index("nflId")
        first = tp[tp.frameId == tp.frameId.min()].set_index("nflId")
        ids = [i for i in tp.nflId.dropna().unique()]
        plist = []
        for i in ids:
            off = first.team.get(i) == c.possessionTeam
            role = "target" if i == c.nflId else "closest_defender" if i == c.def_nflId else "offense" if off else "defense"
            plist.append(dict(nflId=int(i), name=names.displayName.get(i), pos=names.officialPosition.get(i),
                              team=c.possessionTeam if off else c.defensiveTeam, side="offense" if off else "defense", role=role,
                              jersey=int(first.jerseyNumber.get(i)) if pd.notna(first.jerseyNumber.get(i)) else None,
                              lined_up=pf.pff_positionLinedUp.get(i) if i in pf.index else None))
        X = tp[tp.nflId.notna()].pivot(index="frameId", columns="nflId", values="x").ffill().bfill()
        Y = tp[tp.nflId.notna()].pivot(index="frameId", columns="nflId", values="y").ffill().bfill()
        B = tp[tp.nflId.isna()].set_index("frameId")[["x", "y"]].reindex(X.index).ffill().bfill()
        cols = [float(i) for i in ids]
        arr = np.zeros((len(X), 2 * len(ids) + 2))
        arr[:, 0:2 * len(ids):2] = X[cols].values; arr[:, 1:2 * len(ids):2] = Y[cols].values
        arr[:, -2:] = B.values
        los = float(B.x.iloc[0])
        meta = dict(gameId=int(gid), playId=int(c.playId), week=int(g.week), offense=c.possessionTeam, defense=c.defensiveTeam,
                    quarter=int(c.quarter), down=int(c.down), yardsToGo=int(c.yardsToGo), coverage=c.pff_passCoverage,
                    coverage_type=c.ctype if c.ctype in ("man", "zone") else "other",
                    target=dict(nflId=int(c.nflId), name=c.displayName, pos=c.pos),
                    sep=round(float(c.sep), 2), expected_sep=round(float(c.exp), 2) if pd.notna(c.exp) else None,
                    soe=round(float(c.soe), 2) if pd.notna(c.soe) else None, epa=round(float(c.epa), 2) if pd.notna(c.epa) else None,
                    result=c.passResult, playDescription=c.playDescription)
        index.append(meta)
        pl_out[int(c.playId)] = dict(los_x=round(los, 2), first_down_x=round(los + int(c.yardsToGo), 2),
                                     pass_frame_index=int(c.frame_pass - c.frame_snap), hz=10, players=plist,
                                     frames=np.round(arr, 1).tolist())
    with open(os.path.join(RDIR, f"{int(gid)}.json"), "w", encoding="utf-8") as f:
        json.dump(pl_out, f, ensure_ascii=False, separators=(",", ":"))
index.sort(key=lambda m: (m["week"], m["gameId"], m["playId"]))
with open(os.path.join(RDIR, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
print("replays: ", len(index), "jeux,", len(set(m["gameId"] for m in index)), "matchs")

# ---------- validation
for p in reps: print("REPLAY", p["gameId"], "|", p["playDescription"], "| CIBLE:", p["target"]["name"], "| sep", p["sep"], "soe", p["soe"])
print("jeux", nplays, "routes", len(r))
for t in ("man", "zone"):
    c = P[(P["n_" + t] >= MINN)].sort_values("soe_" + t, ascending=False).head(5)
    print("TOP5", t, [(a, b, round(x, 2), n) for a, b, x, n in zip(c.name, c.position, c["soe_" + t], c["n_" + t])])
x = r[r.passResult.isin(["C", "I", "IN"])].copy()
x["terc"] = pd.qcut(x.sep, 3, labels=["bas", "moyen", "haut"])
print(x.groupby("terc", observed=True).agg(sep_moy=("sep", "mean"), compl=("passResult", lambda s: (s == "C").mean()), n=("sep", "size")))
x["tercsoe"] = pd.qcut(x.soe.rank(method="first"), 3, labels=["bas", "moyen", "haut"]) if x.soe.notna().all() else pd.qcut(x.soe.dropna().rank(method="first"), 3, labels=["bas", "moyen", "haut"]).reindex(x.index)
print(x.groupby("tercsoe", observed=True).passResult.apply(lambda s: (s == "C").mean()))
print("tiers", P.tier.value_counts().to_dict())
