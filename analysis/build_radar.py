"""Mismatch Radar -> leaderboard.json + featured_plays.json (web/public/data et web/data).

Pour chaque receveur (pff_role == "Pass Route", poste WR/TE/RB) a la frame du lancer :
  - def_nflId / def_pos : defenseur de couverture (pff_role == "Coverage") le plus proche ; sep_now = distance (yd)
  - sep_proj : distance a +1,0 s, positions extrapolees lineairement (pos + vitesse (s, dir)) pour receveur ET defenseur
  - is_mismatch : (RB/TE couvert par un LB) ou (WR couvert par un LB ou un safety FS/SS/S/DB)
  - past_sticks : x receveur au lancer >= LOS + yardsToGo
  - OTS (0-100) = clip( 100 * clip(sep_proj / P95, 0, 1) + (10 si past_sticks), 0, 100 ), arrondi a 0,1
    ou P95 = 95e percentile de sep_proj sur toutes les routes.
  - is_optimal_target : meilleur OTS du jeu ; is_targeted : nflId == target_nflId (analysis/out/targets.csv)
Coordonnees normalisees (attaque vers +x) : left -> x=120-x, y=53.3-y, dir=(dir+180)%360.
"""
import os, json
import numpy as np, pandas as pd
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.environ.get("NFL_DATA_DIR") or (os.path.join(ROOT, "data") if os.path.isdir(os.path.join(ROOT, "data"))
                                      else os.path.join(os.path.dirname(ROOT), "nfl-big-data-bowl-regional-event-data", "data"))
OUT_DIRS = [os.path.join(ROOT, "web", "public", "data"), os.path.join(ROOT, "web", "data")]
COLS = ["gameId","playId","nflId","frameId","playDirection","x","y","s","dir","event","jerseyNumber","team"]
HORIZON = 1.0
MIN_ROUTES = 30

def norm(df):
    left = df.playDirection.eq("left")
    df.loc[left, "x"] = 120 - df.loc[left, "x"]
    df.loc[left, "y"] = 53.3 - df.loc[left, "y"]
    df.loc[left, "dir"] = (df.loc[left, "dir"] + 180) % 360
    return df

def first_frame(ev, names):
    for n in names:
        f = ev.loc[ev.event == n, "frameId"]
        if len(f): return int(f.iloc[0])
    return None

def is_lb(p): return isinstance(p, str) and p.endswith("LB")

def mismatch(rpos, dpos):
    if rpos in ("RB", "TE"): return is_lb(dpos)
    if rpos == "WR": return is_lb(dpos) or dpos in ("FS", "SS", "S", "DB")
    return False

def read_game(gid, usecols=COLS):
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{gid}.csv"), usecols=usecols)
    return norm(t)

def process(args):
    gid, plays, roles, pos = args  # plays: dict playId -> (yardsToGo,); roles: {playId: DataFrame}
    t = read_game(gid)
    t = t[t.playId.isin(plays)]
    rows = []
    for pid, g in t.groupby("playId"):
        ev = g[g.event.notna()]
        fp = first_frame(ev, ["pass_forward", "autoevent_passforward"])
        sn = first_frame(ev, ["ball_snap", "autoevent_ballsnap"])
        if fp is None or sn is None: continue
        r = roles[pid]
        rec = r[r.pff_role == "Pass Route"]; dfn = r[r.pff_role == "Coverage"]
        if rec.empty or dfn.empty: continue
        bs = g[(g.frameId == sn) & g.nflId.isna()]
        if bs.empty: continue
        los = float(bs.x.iloc[0]); fd = los + plays[pid]
        h = g[g.frameId == fp].set_index("nflId")
        h = h[h.index.notna()]
        h = h[~h.index.duplicated()]
        R = h.reindex(rec.nflId.values); Dd = h.reindex(dfn.nflId.values).dropna(subset=["x"])
        if Dd.empty: continue
        def xy_v(df):
            a = np.deg2rad(df["dir"].values); s = df.s.values
            return df.x.values, df.y.values, s * np.sin(a), s * np.cos(a)
        rx, ry, rvx, rvy = xy_v(R); dx, dy, dvx, dvy = xy_v(Dd)
        dist = np.hypot(rx[:, None] - dx[None, :], ry[:, None] - dy[None, :])
        dist = np.where(np.isnan(dist), np.inf, dist)
        j = dist.argmin(1)
        for i, nid in enumerate(rec.nflId.values):
            if not np.isfinite(dist[i, j[i]]) or np.isnan(rvx[i]) or np.isnan(dvx[j[i]]): continue
            k = j[i]
            sp = np.hypot((rx[i] + rvx[i] * HORIZON) - (dx[k] + dvx[k] * HORIZON),
                          (ry[i] + rvy[i] * HORIZON) - (dy[k] + dvy[k] * HORIZON))
            did = int(Dd.index[k]); dp = pos.get(did, "")
            rows.append(dict(gameId=gid, playId=pid, nflId=int(nid), rpos=pos.get(int(nid), ""),
                             def_nflId=did, def_pos=dp, sep_now=float(dist[i, k]), sep_proj=float(sp),
                             depth=float(rx[i] - los), past_sticks=bool(rx[i] >= fd), is_mismatch=mismatch(pos.get(int(nid), ""), dp)))
    return rows

def jdump(obj, name):
    for d in OUT_DIRS:
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, separators=(",", ":"), ensure_ascii=False, allow_nan=False)

def nn(v, nd):
    return None if v is None or (isinstance(v, float) and not np.isfinite(v)) else round(float(v), nd)

def build_frames(args):
    """Rejoue un jeu retenu : frames snap -> derniere frame."""
    gid, pid, pl_info, offense = args
    t = read_game(gid, ["gameId","playId","nflId","frameId","playDirection","x","y","dir","event","jerseyNumber","team"])
    g = t[t.playId == pid]
    ev = g[g.event.notna()]
    fp = first_frame(ev, ["pass_forward", "autoevent_passforward"])
    sn = first_frame(ev, ["ball_snap", "autoevent_ballsnap"])
    g = g[g.frameId >= sn]
    ids = [i for i in g.nflId.dropna().unique()]
    ids = [int(i) for i in ids]
    ply = []
    for i in ids:
        gi = g[g.nflId == i].iloc[0]
        nm, pp, lu, role = pl_info.get(i, (str(i), "", "", "other"))
        ply.append(dict(nflId=i, name=nm, pos=pp, team=gi.team, side="offense" if gi.team == offense else "defense",
                        jersey=int(gi.jerseyNumber) if pd.notna(gi.jerseyNumber) else 0, lined_up=lu, role=role))
    frames_ids = sorted(g.frameId.unique())
    px = g.set_index(["frameId", "nflId"])[["x", "y"]]
    ball = g[g.nflId.isna()].set_index("frameId")[["x", "y"]]
    frames = []
    for f in frames_ids:
        row = []
        for i in ids:
            try: x, y = px.loc[(f, float(i))]
            except KeyError: x, y = (frames[-1][2 * ids.index(i)], frames[-1][2 * ids.index(i) + 1]) if frames else (0, 0)
            row += [round(float(x), 2), round(float(y), 2)]
        if f in ball.index: bx, by = ball.loc[f].iloc[0], ball.loc[f].iloc[1] if ball.loc[f].ndim == 1 else (ball.loc[f].x, ball.loc[f].y)
        else: bx, by = (frames[-1][-2], frames[-1][-1]) if frames else (0, 0)
        row += [round(float(bx), 2), round(float(by), 2)]
        frames.append(row)
    return dict(players=ply, frames=frames, snap_frame_index=0, pass_frame_index=int(frames_ids.index(fp)) if fp in frames_ids else 0,
                end_frame_index=len(frames) - 1)

def main():
    plays = pd.read_csv(os.path.join(D, "plays.csv"))
    ok = (plays.penaltyYards.fillna(0) == 0) & plays.foulName1.isna() & plays.passResult.isin(["C", "I", "IN"]) & (plays.down >= 1)
    plays = plays[ok]
    games = pd.read_csv(os.path.join(D, "games.csv"))
    pff = pd.read_csv(os.path.join(D, "pffScoutingData.csv"), usecols=["gameId","playId","nflId","pff_role","pff_positionLinedUp"])
    pl = pd.read_csv(os.path.join(D, "players.csv"), usecols=["nflId","officialPosition","displayName"])
    pos = dict(zip(pl.nflId, pl.officialPosition)); names = dict(zip(pl.nflId, pl.displayName))
    pff = pff.merge(plays[["gameId","playId"]], on=["gameId","playId"])
    pff["pos"] = pff.nflId.map(pos)
    keep = pff[(pff.pff_role == "Coverage") | ((pff.pff_role == "Pass Route") & pff.pos.isin(["WR","TE","RB"]))]
    jobs = []
    for gid, gp in plays.groupby("gameId"):
        kg = keep[keep.gameId == gid]
        roles = {k: v[["nflId","pff_role"]] for k, v in kg.groupby("playId")}
        jobs.append((gid, dict(zip(gp.playId, gp.yardsToGo)), roles, pos))
    with Pool(min(12, os.cpu_count())) as p:
        res = p.map(process, jobs, chunksize=1)
    r = pd.DataFrame([x for rr in res for x in rr])
    # OTS
    p95 = r.sep_proj.quantile(0.95)
    r["ots"] = (100 * (r.sep_proj / p95).clip(0, 1) + 10 * r.past_sticks).clip(upper=100).round(1)
    r.loc[r.depth < 1, "ots"] = 0.0  # derriere/sur la ligne : pas une option ouverte utile
    tg = pd.read_csv(os.path.join(ROOT, "analysis", "out", "targets.csv"), usecols=["gameId","playId","target_nflId"])
    r = r.merge(tg.drop_duplicates(["gameId","playId"]), on=["gameId","playId"], how="left")
    r["is_targeted"] = r.nflId == r.target_nflId
    r["opt_idx"] = r[r.depth >= 1].groupby(["gameId","playId"]).ots.idxmax().reindex(pd.MultiIndex.from_frame(r[["gameId","playId"]])).values
    r["is_opt"] = r.index == r.opt_idx  # seulement parmi depth >= 1
    pm = plays.set_index(["gameId","playId"])
    r["offense"] = [pm.possessionTeam.get(k) for k in zip(r.gameId, r.playId)]
    key = ["gameId","playId"]
    n_plays = len(r[key].drop_duplicates())
    # meta
    m = r[r.is_mismatch]; o = r[~r.is_mismatch]
    hit = r.groupby(key).is_targeted.transform("any") & r.groupby(key).is_opt.transform("any")
    pl_t = r[hit]
    ign = pl_t.groupby(key).apply(lambda g: not g.loc[g.is_opt, "is_targeted"].any())
    # référence : un QB qui choisirait au hasard parmi les options au-delà de la ligne
    n_opts = pl_t[pl_t.depth >= 1].groupby(key).size().reindex(ign.index).fillna(1)
    # valeur du choix : EPA de la passe selon que la cible était l'optimal ou non
    epa = pd.read_csv(os.path.join(ROOT, "analysis", "out", "targets.csv"), usecols=["gameId","playId","epa"]).drop_duplicates(key).set_index(key).epa
    e = pd.DataFrame({"ign": ign, "epa": epa.reindex(ign.index)}).dropna()
    meta = dict(plays=int(n_plays), routes=int(len(r)), mismatch_routes=int(len(m)),
                mismatch_sep_gain=nn(m.sep_now.mean() - o.sep_now.mean(), 2),
                qb_ignores_optimal_pct=nn(100 * ign.mean(), 1),
                qb_ignores_random_baseline_pct=nn(100 * (1 - 1 / n_opts.clip(lower=1)).mean(), 1),
                epa_when_optimal=nn(e[~e.ign].epa.mean(), 3), epa_when_not_optimal=nn(e[e.ign].epa.mean(), 3),
                ots_mismatch_avg=nn(m.ots.mean(), 1), ots_other_avg=nn(o.ots.mean(), 1))
    # players
    teams = r.groupby("nflId").offense.agg(lambda s: s.value_counts().index[0])
    rows = []
    for nid, g in r.groupby("nflId"):
        if len(g) < MIN_ROUTES: continue
        gm = g[g.is_mismatch]
        rows.append(dict(nflId=int(nid), displayName=names.get(nid, str(nid)), position=pos[nid], team=teams[nid],
                         routes_run=int(len(g)), avg_ots=nn(g.ots.mean(), 1),
                         optimal_target_rate=nn(g.is_opt.mean(), 3), actual_target_rate=nn(g.is_targeted.mean(), 3),
                         unexploited_rate=nn((g.is_opt & ~g.is_targeted).mean(), 3),
                         mismatch_win_rate=nn((gm.sep_now >= 3).mean(), 3) if len(gm) else None,
                         mismatch_routes=int(len(gm))))
    rows.sort(key=lambda d: -d["avg_ots"])
    print("optimaux par poste", r[r.is_opt].rpos.value_counts().to_dict(), "jeux sans optimal", int(n_plays - r.is_opt.sum()))
    jdump(dict(meta=meta, players=rows), "leaderboard.json")
    # featured
    # 8 erreurs (mismatch ouvert ignoré) + 8 bonnes lectures (mismatch exploité), en alternance
    miss, hit = [], []
    for k, g in r.groupby(key):
        if not g.is_opt.any(): continue
        opt = g[g.is_opt].iloc[0]
        if not opt.is_mismatch: continue
        tgt = g[g.is_targeted & (g.depth >= 1)]  # cible au-delà de la ligne : vrai choix entre deux options
        if not len(tgt): continue
        if not opt.is_targeted:
            miss.append((k, round(opt.ots - tgt.iloc[0].ots, 1), opt.offense))
        else:
            others = g[(g.depth >= 1) & ~g.is_opt]
            if len(others):  # écart avec la 2e meilleure option : lecture évidente
                hit.append((k, round(opt.ots - others.ots.max(), 1), opt.offense))
    def pick(cand, n=8):
        cand.sort(key=lambda c: -c[1]); out, seen = [], set()
        for k, gap, off in cand:
            if off in seen: continue
            seen.add(off); out.append((k, gap))
            if len(out) == n: break
        return out
    pm_, ph_ = pick(miss), [(k, 0.0) for k, _ in pick(hit)]  # qb_gap = 0 : la cible est l optimal
    sel = [x for pair in zip(pm_, ph_) for x in pair]
    wk = dict(zip(games.gameId, games.week))
    pffk = pff.set_index(["gameId","playId","nflId"])
    feats = []
    with Pool(min(8, len(sel))) as p:
        jobs = []
        for (gid, pid), gap in sel:
            pr = pm.loc[(gid, pid)]
            pg = pff[(pff.gameId == gid) & (pff.playId == pid)].set_index("nflId")
            info = {}
            for nid, rr in pg.iterrows():
                role = "receiver" if rr.pff_role == "Pass Route" and rr.pos in ("WR","TE","RB") else "coverage" if rr.pff_role == "Coverage" else "other"
                info[int(nid)] = (names.get(nid, str(nid)), pos.get(nid, ""), rr.pff_positionLinedUp, role)
            jobs.append((gid, pid, info, pr.possessionTeam))
        fr = p.map(build_frames, jobs)
    for ((gid, pid), gap), f in zip(sel, fr):
        pr = pm.loc[(gid, pid)]
        gg = r[(r.gameId == gid) & (r.playId == pid)]
        # los_x / first_down_x
        feats.append((gid, pid, gap, pr, f, gg))
    # los_x : relu depuis frames (balle a snap)
    out = []
    for gid, pid, gap, pr, f, gg in feats:
        for pp in f["players"]:
            if pp["pos"] == "" or pp["name"] == str(pp["nflId"]):
                pp["name"] = names.get(pp["nflId"], pp["name"]); pp["pos"] = pos.get(pp["nflId"], pp["pos"])
        los = f["frames"][0][-2]
        ct = str(pr.pff_passCoverageType).lower()
        out.append(dict(id=f"{gid}-{pid}", gameId=int(gid), playId=int(pid), week=int(wk[gid]), offense=pr.possessionTeam,
                        defense=pr.defensiveTeam, quarter=int(pr.quarter), down=int(pr.down), yardsToGo=int(pr.yardsToGo),
                        coverage=str(pr.pff_passCoverage), coverage_type=ct if ct in ("man","zone") else "other",
                        description=str(pr.playDescription), hz=10, pass_frame_index=f["pass_frame_index"],
                        snap_frame_index=0, end_frame_index=f["end_frame_index"], los_x=round(los, 2),
                        first_down_x=round(los + float(pr.yardsToGo), 2), players=f["players"], frames=f["frames"],
                        receivers=[dict(nflId=int(x.nflId), ots=nn(x.ots, 1), sep_now=nn(x.sep_now, 2), sep_proj=nn(x.sep_proj, 2),
                                        is_mismatch=bool(x.is_mismatch), past_sticks=bool(x.past_sticks), is_optimal_target=bool(x.is_opt),
                                        is_targeted=bool(x.is_targeted), def_nflId=int(x.def_nflId), def_pos=x.def_pos)
                                   for x in gg.itertuples()],
                        qb_gap=gap))
    jdump(out, "featured_plays.json")
    print(json.dumps(meta)); print("P95 sep_proj", round(p95, 2), "featured", len(out))

if __name__ == "__main__":
    main()
