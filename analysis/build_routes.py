"""Étape 1 : séparation de chaque receveur au lancer -> analysis/out/routes.csv"""
import os, glob
import numpy as np, pandas as pd
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from paths import D
OUT = os.path.join(ROOT, "analysis", "out")
os.makedirs(OUT, exist_ok=True)

def load_meta():
    plays = pd.read_csv(os.path.join(D, "plays.csv"))
    ok = (plays.penaltyYards.fillna(0) == 0) & plays.foulName1.isna() & plays.passResult.isin(["C", "I", "IN"]) & (plays.down >= 1)
    return plays[ok]

def align_group(pos, lined):
    s = str(lined)
    if pos == "RB": return "back"
    if pos == "TE": return "te_inline" if s in ("TE-L", "TE-R") else "te_flex"
    if s in ("LWR", "RWR"): return "wide"
    return "slot"

def norm(df):
    left = df.playDirection.eq("left")
    df.loc[left, "x"] = 120 - df.loc[left, "x"]
    df.loc[left, "y"] = 53.3 - df.loc[left, "y"]
    return df

def first_frame(g, names):
    for n in names:
        f = g.loc[g.event == n, "frameId"]
        if len(f): return int(f.iloc[0])
    return None

def process(args):
    gid, pl_ids, roles = args
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{gid}.csv"),
                    usecols=["gameId","playId","nflId","frameId","team","playDirection","x","y","event"])
    t = t[t.playId.isin(pl_ids)]
    t = norm(t.copy())
    rows = []
    for pid, g in t.groupby("playId"):
        ev = g[g.event.notna()]
        fp = first_frame(ev, ["pass_forward"]) or first_frame(ev, ["autoevent_passforward"])
        sn = first_frame(ev, ["ball_snap"]) or first_frame(ev, ["autoevent_ballsnap"])
        if fp is None or sn is None: continue
        r = roles[(gid, pid)]  # DataFrame nflId, pff_role, pos
        rec = r[r.pff_role == "Pass Route"]
        dfn = r[r.pff_role == "Coverage"]
        if rec.empty or dfn.empty: continue
        bs = g[(g.frameId == sn) & g.nflId.isna()]
        bx = bs.x.iloc[0] if len(bs) else np.nan
        def at(f):
            h = g[g.frameId == f].set_index("nflId")
            return h
        for label, f in (("fp", fp), ("s15", sn + 15)):
            if f > g.frameId.max(): 
                if label == "fp": break
                continue
            h = at(f)
            R = h.reindex(rec.nflId); Dd = h.reindex(dfn.nflId).dropna(subset=["x"])
            if Dd.empty: continue
            dx = R.x.values[:, None] - Dd.x.values[None, :]
            dy = R.y.values[:, None] - Dd.y.values[None, :]
            dist = np.sqrt(dx**2 + dy**2)
            dist = np.where(np.isnan(dist), np.inf, dist)
            j = dist.argmin(1); m = dist.min(1)
            for i, (nid) in enumerate(rec.nflId.values):
                if not np.isfinite(m[i]): continue
                if label == "fp":
                    rows.append(dict(gameId=gid, playId=pid, nflId=nid, sep=m[i], def_nflId=Dd.index[j[i]],
                                     rec_x=R.x.values[i], rec_y=R.y.values[i], depth=R.x.values[i] - bx,
                                     width=R.y.values[i] - 26.65, frame_snap=sn, frame_pass=fp))
                else:
                    for d in rows[::-1]:
                        if d["gameId"] == gid and d["playId"] == pid and d["nflId"] == nid:
                            d["sep_s15"] = m[i]; break
    return rows

def main():
    plays = load_meta()
    pff = pd.read_csv(os.path.join(D, "pffScoutingData.csv"), usecols=["gameId","playId","nflId","pff_role","pff_positionLinedUp"])
    pl = pd.read_csv(os.path.join(D, "players.csv"), usecols=["nflId","officialPosition","displayName"])
    pff = pff.merge(pl, on="nflId", how="left").rename(columns={"officialPosition": "pos"})
    pff = pff.merge(plays[["gameId","playId"]], on=["gameId","playId"])
    keep = pff[(pff.pff_role == "Coverage") | ((pff.pff_role == "Pass Route") & pff.pos.isin(["WR","TE","RB"]))]
    roles = {k: g[["nflId","pff_role"]] for k, g in keep.groupby(["gameId","playId"])}
    jobs = [(gid, set(g.playId), roles) for gid, g in plays.groupby("gameId")]
    # alléger : ne passer à chaque job que ses rôles
    jobs = [(gid, ids, {k: v for k, v in roles.items() if k[0] == gid}) for gid, ids, _ in jobs]
    with Pool(min(12, os.cpu_count())) as p:
        res = p.map(process, jobs, chunksize=2)
    r = pd.DataFrame([x for rr in res for x in rr])
    r = r.merge(keep[keep.pff_role == "Pass Route"][["gameId","playId","nflId","pos","displayName","pff_positionLinedUp"]],
                on=["gameId","playId","nflId"], how="left")
    r["align"] = [align_group(a, b) for a, b in zip(r.pos, r.pff_positionLinedUp)]
    cols = ["gameId","playId","down","yardsToGo","quarter","possessionTeam","defensiveTeam","passResult",
            "pff_passCoverage","pff_passCoverageType","pff_playAction","playDescription"]
    r = r.merge(plays[cols], on=["gameId","playId"], how="left")
    r.to_csv(os.path.join(OUT, "routes.csv"), index=False)
    print("jeux:", r[["gameId","playId"]].drop_duplicates().shape[0], "routes:", len(r))

if __name__ == "__main__":
    main()
