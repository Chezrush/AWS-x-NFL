"""Optimal Target Score (OTS) -> web/public/data/leaderboard.json + featured_plays.json

Pour chaque passe, à pass_forward : les receveurs éligibles (WR/TE/RB en route) reçoivent un OTS 0-99 qui
combine séparation actuelle et projetée à +0,5 s, mismatch de poste/vitesse et dépassement du 1er essai.
La cible réelle vient de nflverse (analysis/out/targets.csv, `python analysis/build_nflverse.py`) car le tracking
s'arrête ~0,5 s après le lancer (pass_arrived quasi absent).

Usage : python scripts/build_metrics.py [--games N]"""
import os, sys, json, argparse
import numpy as np, pandas as pd
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "web", "public", "data")
LB = {"ILB", "OLB", "MLB", "LB"}
HORIZON = 0.5          # secondes
POST = 5               # frames gardées après pass_forward (le tracking s'arrête ~0,5 s après)

def norm(t):
    left = t.playDirection.eq("left")
    t.loc[left, "x"] = 120 - t.loc[left, "x"]
    t.loc[left, "y"] = 53.3 - t.loc[left, "y"]
    t.loc[left, "dir"] = (t.loc[left, "dir"] + 180) % 360
    return t

def project(x, y, s, d):
    r = np.radians(d)
    return x + HORIZON * s * np.sin(r), y + HORIZON * s * np.cos(r)

def nearest(rx, ry, dx, dy):
    dist = np.hypot(rx[:, None] - dx[None, :], ry[:, None] - dy[None, :])
    j = dist.argmin(1)
    return dist[np.arange(len(rx)), j], j

def ev_frame(g, names):
    for n in names:
        f = g.loc[g.event == n, "frameId"]
        if len(f): return int(f.iloc[0])
    return None

def process(args):
    gid, plays, roles, pos = args
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{gid}.csv"),
                    usecols=["playId", "nflId", "frameId", "team", "playDirection", "x", "y", "s", "dir", "jerseyNumber", "event"])
    t = norm(t[t.playId.isin(plays.playId)].copy())
    rec_rows, play_rows = [], []
    for pid, g in t.groupby("playId"):
        p = plays[plays.playId == pid].iloc[0]
        fp = ev_frame(g, ["pass_forward", "autoevent_passforward"]); sn = ev_frame(g, ["ball_snap", "autoevent_ballsnap"])
        if fp is None or sn is None: continue
        r = roles[roles.playId == pid]
        rec_ids = r[(r.pff_role == "Pass Route") & r.nflId.map(pos).isin(["WR", "TE", "RB"])].nflId.values
        def_ids = r[r.pff_role == "Coverage"].nflId.values
        h = g[g.frameId == fp].set_index("nflId")
        R = h.reindex(rec_ids).dropna(subset=["x", "s", "dir"]); Dd = h.reindex(def_ids).dropna(subset=["x", "s", "dir"])
        if len(R) < 2 or Dd.empty: continue
        bs = g[(g.frameId == sn) & g.nflId.isna()]
        if bs.empty: continue
        los = float(bs.x.iloc[0]); fd = los + float(p.yardsToGo)
        rpx, rpy = project(R.x.values, R.y.values, R.s.values, R["dir"].values)
        dpx, dpy = project(Dd.x.values, Dd.y.values, Dd.s.values, Dd["dir"].values)
        sep_now, j = nearest(R.x.values, R.y.values, Dd.x.values, Dd.y.values)
        sep_proj, _ = nearest(rpx, rpy, dpx, dpy)
        dpos = Dd.index.map(pos).values[j]
        rpos = R.index.map(pos).values
        mism = (np.isin(rpos, ["RB", "TE"]) & np.isin(dpos, list(LB))) | ((R.s.values - Dd.s.values[j]) > 1.5)
        sticks = R.x.values > fd
        raw = (0.4 * sep_now + 0.6 * sep_proj) * np.where(mism, 1.25, 1.0) * np.where(sticks, 1.20, 1.0)
        ots = np.minimum(99, np.round(raw * 12)).astype(int)
        best = int(np.argmax(ots))
        for i, nid in enumerate(R.index):
            rec_rows.append(dict(gameId=gid, playId=pid, nflId=int(nid), pos=rpos[i], team=p.possessionTeam,
                                 sep_now=sep_now[i], sep_proj=sep_proj[i], is_mismatch=bool(mism[i]),
                                 lb_mismatch=bool(rpos[i] in ("RB", "TE") and dpos[i] in LB), past_sticks=bool(sticks[i]),
                                 ots=int(ots[i]), is_optimal_target=i == best, def_nflId=int(Dd.index[j[i]]), def_pos=dpos[i]))
        play_rows.append(dict(gameId=gid, playId=pid, frame_snap=sn, frame_pass=fp, los_x=los, first_down_x=fd))
        # frames pour le replay (calculées seulement pour les jeux candidats, voir main)
    return rec_rows, play_rows

def build_frames(gid, pid, fp, sn):
    t = pd.read_csv(os.path.join(D, "tracking", f"tracking_{gid}.csv"))
    t = norm(t[t.playId == pid].copy())
    end = min(int(t.frameId.max()), fp + POST)
    t = t[(t.frameId >= sn) & (t.frameId <= end)]
    fr = list(range(sn, end + 1))
    pl = t[t.nflId.notna()].drop_duplicates("nflId")
    ids = pl.nflId.astype(int).tolist()
    X = t[t.nflId.notna()].pivot(index="frameId", columns="nflId", values="x").reindex(fr).ffill().bfill()
    Y = t[t.nflId.notna()].pivot(index="frameId", columns="nflId", values="y").reindex(fr).ffill().bfill()
    b = t[t.nflId.isna()].set_index("frameId").reindex(fr).ffill().bfill()
    arr = np.zeros((len(fr), 2 * len(ids) + 2))
    for k, i in enumerate(ids):
        arr[:, 2 * k] = X[float(i)].values; arr[:, 2 * k + 1] = Y[float(i)].values
    arr[:, -2] = b.x.values; arr[:, -1] = b.y.values
    jersey = pl.set_index(pl.nflId.astype(int)).jerseyNumber.to_dict()
    return ids, np.round(arr, 2).tolist(), fr.index(fp), end - sn, jersey

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--games", type=int, default=0); a = ap.parse_args()
    plays = pd.read_csv(os.path.join(D, "plays.csv"))
    plays = plays[plays.passResult.isin(["C", "I", "IN"]) & plays.foulName1.isna() & (plays.penaltyYards.fillna(0) == 0)]
    players = pd.read_csv(os.path.join(D, "players.csv")); pos = players.set_index("nflId").officialPosition.to_dict()
    names = players.set_index("nflId").displayName.to_dict()
    pff = pd.read_csv(os.path.join(D, "pffScoutingData.csv"), usecols=["gameId", "playId", "nflId", "pff_role", "pff_positionLinedUp"])
    gids = sorted(plays.gameId.unique())
    if a.games: gids = gids[:a.games]
    jobs = [(g, plays[plays.gameId == g], pff[pff.gameId == g], pos) for g in gids]
    with Pool(min(8, os.cpu_count() or 2)) as pool: res = pool.map(process, jobs)
    R = pd.DataFrame([r for rr, _ in res for r in rr]); P = pd.DataFrame([r for _, pp in res for r in pp])
    tg = pd.read_csv(os.path.join(ROOT, "analysis", "out", "targets.csv"), usecols=["gameId", "playId", "target_nflId", "epa"])
    R = R.merge(tg, on=["gameId", "playId"], how="left")
    R["is_targeted"] = R.nflId == R.target_nflId
    known = R.groupby(["gameId", "playId"]).is_targeted.transform("max")   # cible identifiée ET parmi les éligibles
    K = R[known].copy()
    print(f"{P.shape[0]} jeux, {len(R)} routes, {K.groupby(['gameId','playId']).ngroups} jeux avec cible éligible identifiée")

    # --- KPIs
    opt = K[K.is_optimal_target]; ignores = float((~opt.is_targeted).mean() * 100)
    gain = float(R[R.lb_mismatch].sep_proj.mean() - R[~R.lb_mismatch].sep_proj.mean())
    meta = dict(plays=int(P.shape[0]), routes=int(len(R)), mismatch_routes=int(R.lb_mismatch.sum()),
                mismatch_sep_gain=round(gain, 2), qb_ignores_optimal_pct=round(ignores, 1),
                ots_mismatch_avg=round(float(R[R.lb_mismatch].ots.mean()), 1), ots_other_avg=round(float(R[~R.lb_mismatch].ots.mean()), 1))

    # --- leaderboard (taux calculés sur les jeux à cible identifiée)
    rows = []
    for nid, g in R.groupby("nflId"):
        k = K[K.nflId == nid]; m = g[g.lb_mismatch]
        n = len(k)
        if n == 0: continue
        o, t_ = k.is_optimal_target.mean() * 100, k.is_targeted.mean() * 100
        rows.append(dict(nflId=int(nid), displayName=names.get(nid, str(nid)), position=g.pos.iloc[0], team=g.team.mode().iloc[0],
                         routes_run=int(n), avg_ots=round(float(k.ots.mean()), 1), optimal_target_rate=round(o, 1),
                         actual_target_rate=round(t_, 1), unexploited_rate=round(o - t_, 1),
                         mismatch_win_rate=round(float((m.sep_proj >= 3).mean() * 100), 1) if len(m) else 0.0,
                         mismatch_routes=int(len(m))))
    os.makedirs(OUT, exist_ok=True)
    json.dump(dict(meta=meta, players=rows), open(os.path.join(OUT, "leaderboard.json"), "w"), ensure_ascii=False)
    print("leaderboard:", len(rows), "joueurs", meta)

    # --- jeux phares : le QB ne cible pas le receveur optimal, qui est en mismatch
    best = opt[~opt.is_targeted & opt.is_mismatch].merge(
        K[K.is_targeted][["gameId", "playId", "ots"]].rename(columns={"ots": "ots_t"}), on=["gameId", "playId"])
    best["gap"] = best.ots - best.ots_t
    best = best.merge(plays, on=["gameId", "playId"]).merge(P, on=["gameId", "playId"])
    best = best[best.gap >= 25].sort_values("gap", ascending=False)
    best = best.groupby("gameId").head(2).head(15)
    feats = []
    for _, b in best.iterrows():
        ids, frames, pf_idx, end_idx, jersey = build_frames(int(b.gameId), int(b.playId), int(b.frame_pass), int(b.frame_snap))
        rl = pff[(pff.gameId == b.gameId) & (pff.playId == b.playId)].set_index("nflId")
        rr = R[(R.gameId == b.gameId) & (R.playId == b.playId)]
        rec_ids, cov_ids = set(rr.nflId), set(rr.def_nflId)
        cov_ids |= set(rl[rl.pff_role == "Coverage"].index)
        off_team = b.possessionTeam
        t0 = pd.read_csv(os.path.join(D, "tracking", f"tracking_{int(b.gameId)}.csv"), usecols=["playId", "nflId", "team"])
        team = t0[t0.playId == b.playId].drop_duplicates("nflId").set_index("nflId").team.to_dict()
        players_out = []
        for i in ids:
            side = "offense" if team.get(i) == off_team or team.get(float(i)) == off_team else "defense"
            players_out.append(dict(nflId=i, name=names.get(i, str(i)), pos=pos.get(i, "?"), team=str(team.get(i, team.get(float(i), "?"))),
                                    side=side, jersey=int(jersey.get(i, 0) or 0),
                                    lined_up=str(rl.pff_positionLinedUp.get(i, "")),
                                    role="receiver" if i in rec_ids else ("coverage" if i in cov_ids else "other")))
        feats.append(dict(id=f"{int(b.gameId)}-{int(b.playId)}", gameId=int(b.gameId), playId=int(b.playId),
                          week=0, offense=off_team, defense=b.defensiveTeam, quarter=int(b.quarter), down=int(b.down),
                          yardsToGo=int(b.yardsToGo), coverage=str(b.pff_passCoverage), coverage_type=str(b.pff_passCoverageType).lower()
                          if str(b.pff_passCoverageType).lower() in ("man", "zone") else "other",
                          description=str(b.playDescription), hz=10, pass_frame_index=pf_idx, snap_frame_index=0, end_frame_index=end_idx,
                          los_x=round(float(b.los_x), 2), first_down_x=round(float(b.first_down_x), 2),
                          players=players_out, frames=frames,
                          receivers=[dict(nflId=int(r.nflId), ots=int(r.ots), sep_now=round(r.sep_now, 2), sep_proj=round(r.sep_proj, 2),
                                          is_mismatch=bool(r.is_mismatch), past_sticks=bool(r.past_sticks),
                                          is_optimal_target=bool(r.is_optimal_target), is_targeted=bool(r.is_targeted),
                                          def_nflId=int(r.def_nflId), def_pos=str(r.def_pos)) for r in rr.itertuples()],
                          qb_gap=int(b.gap)))
    gm = pd.read_csv(os.path.join(D, "games.csv")).set_index("gameId").week.to_dict()
    for f in feats: f["week"] = int(gm.get(f["gameId"], 0))
    json.dump(feats, open(os.path.join(OUT, "featured_plays.json"), "w"), ensure_ascii=False)
    print("featured_plays:", len(feats))

if __name__ == "__main__":
    main()
