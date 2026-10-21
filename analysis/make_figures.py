"""Étape 3 : figures PNG bilingues -> analysis/out/figures/{fr,en}/"""
import os, json
import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web", "data")
T = {
 "fr": dict(snap="Au snap", throw="Au lancer", yardline="Yards (ligne de but = 0)", top="Meilleurs receveurs : séparation gagnée vs attendu", man="Contre couverture homme (Man)", zone="Contre couverture zone (Zone)",
            xl="Yards de séparation gagnés vs un receveur moyen (SOE)", routes="routes", heat="Part de couvertures homme (Man) selon le down et la distance",
            down="Down", short="Courte (≤3 yds)", med="Moyenne (4-7)", long="Longue (≥8)", pct="% Man",
            replay="Au moment du lancer : ", sep="séparation", sepunit="yds", target="Receveur", defn="Défenseur le plus proche", los="Ligne de mêlée",
            off="Attaque", de="Défense", ball="Ballon", fn="1_top10_soe.png,2_heatmap_man.png,3_replay.png".split(",")),
 "en": dict(snap="At the snap", throw="At the throw", yardline="Yards (goal line = 0)", top="Best receivers: separation gained vs expected", man="Against man coverage", zone="Against zone coverage",
            xl="Yards of separation gained vs an average receiver (SOE)", routes="routes", heat="Share of man coverage by down and distance",
            down="Down", short="Short (≤3 yds)", med="Medium (4-7)", long="Long (≥8)", pct="% Man",
            replay="At the throw: ", sep="separation", sepunit="yds", target="Receiver", defn="Closest defender", los="Line of scrimmage",
            off="Offense", de="Defense", ball="Ball", fn="1_top10_soe.png,2_heatmap_man.png,3_replay.png".split(",")),
}
plt.rcParams.update({"font.size": 15, "axes.titlesize": 19, "axes.spines.top": False, "axes.spines.right": False})
P = json.load(open(os.path.join(WEB, "players_soe.json")))["players"]
Tn = json.load(open(os.path.join(WEB, "defense_tendencies.json")))
R = json.load(open(os.path.join(WEB, "replays.json")))

for lang, L in T.items():
    od = os.path.join(ROOT, "analysis", "out", "figures", lang); os.makedirs(od, exist_ok=True)
    # a) top 10
    fig, axs = plt.subplots(1, 2, figsize=(16, 7.5), sharex=True)
    for ax, t, col in zip(axs, ("man", "zone"), ("#d95f02", "#1b7f9e")):
        c = sorted([p for p in P if p[f"soe_{t}"] is not None], key=lambda p: -p[f"soe_{t}"])[:10][::-1]
        ax.barh([f'{p["name"]} ({p["position"]}, n={p[f"n_{t}"]})' for p in c], [p[f"soe_{t}"] for p in c], color=col)
        ax.set_title(L[t], fontsize=17); ax.set_xlabel(L["xl"], fontsize=12)
    fig.suptitle(L["top"], fontsize=21, fontweight="bold"); fig.tight_layout()
    fig.savefig(os.path.join(od, L["fn"][0]), dpi=140); plt.close(fig)
    # b) heatmap
    sit = Tn["LEAGUE"]["situations"]; dists = ["short", "medium", "long"]
    M = np.array([[sit.get(f"{d}_{k}", {}).get("pct_man", np.nan) for k in dists] for d in range(1, 5)])
    N = [[sit.get(f"{d}_{k}", {}).get("n", 0) for k in dists] for d in range(1, 5)]
    fig, ax = plt.subplots(figsize=(10, 6.5)); im = ax.imshow(M, cmap="YlOrRd", vmin=0, vmax=max(50, np.nanmax(M)))
    ax.set_xticks(range(3), [L["short"], L["med"], L["long"]]); ax.set_yticks(range(4), [f'{L["down"]} {d}' for d in range(1, 5)])
    for i in range(4):
        for j in range(3):
            ax.text(j, i, f"{M[i, j]:.0f}%\nn={N[i][j]}", ha="center", va="center", fontsize=15, color="black")
    ax.set_title(L["heat"], fontsize=17); fig.colorbar(im, label=L["pct"]); fig.tight_layout()
    fig.savefig(os.path.join(od, L["fn"][1]), dpi=140); plt.close(fig)
    # c) replay : 2 instantanés (snap, lancer)
    rp = R[0]; i = rp["pass_frame_index"]
    COL = {"offense": "#1f78b4", "defense": "#e66101"}
    tgt_x = rp["frames"][i][[k for k, p in enumerate(rp["players"]) if p["role"] == "target"][0] * 2]
    x0, x1 = min(rp["los_x"], tgt_x) - 12, min(120, max(rp["los_x"], tgt_x) + 12)
    tgt_y = rp["frames"][i][[k for k, p in enumerate(rp["players"]) if p["role"] == "target"][0] * 2 + 1]
    y0, y1 = max(0, tgt_y - 17), min(53.3, max(0, tgt_y - 17) + 34)
    fig, axs = plt.subplots(1, 2, figsize=(20, 8.5))
    for ax, fi, ttl in ((axs[0], 0, L["snap"]), (axs[1], i, L["throw"])):
        fr = rp["frames"][fi]; ax.set_facecolor("#3a7d44")
        for x in range(int(x0) - int(x0) % 5 + 5, int(x1) + 1, 5): ax.axvline(x, color="white", lw=1, alpha=.45)
        ax.axvline(rp["los_x"], color="#ffd400", lw=4)
        pos = {}
        for k, p in enumerate(rp["players"]):
            x, y = fr[2 * k], fr[2 * k + 1]
            if x is None: continue
            pos[p["role"]] = (x, y)
            big = p["role"] in ("target", "closest_defender")
            ax.scatter(x, y, s=700 if big else 330, color=COL[p["side"]], zorder=3,
                       edgecolor="gold" if p["role"] == "target" else "red" if big else "white", linewidth=4 if big else 1.5)
        bx, by = fr[-2], fr[-1]
        if bx is not None: ax.scatter(bx, by, s=380, color="saddlebrown", marker="D", edgecolor="white", linewidth=2, zorder=5)
        a, b = pos["target"], pos["closest_defender"]
        if fi == i:
            ax.plot([a[0], b[0]], [a[1], b[1]], "--", color="white", lw=4, zorder=4)
            ax.annotate(f'{rp["sep"]:.1f} {L["sepunit"]}', ((a[0] + b[0]) / 2, max(a[1], b[1]) + 2.5), color="white", fontsize=26, fontweight="bold", ha="center",
                        bbox=dict(boxstyle="round", fc="black", alpha=.6))
        ax.set_xlim(x0, x1); ax.set_ylim(y0, y1); ax.set_aspect("equal")
        ticks = [x for x in range(10, 111, 5) if x0 <= x <= x1]
        ax.set_xticks(ticks, [str(min(x - 10, 110 - x)) for x in ticks], fontsize=16); ax.set_yticks([])
        ax.set_xlabel(L["yardline"], fontsize=15); ax.set_title(ttl, fontsize=22, fontweight="bold")
    from matplotlib.lines import Line2D
    H = [Line2D([], [], marker="o", ls="", ms=16, color=COL["offense"], label=L["off"]), Line2D([], [], marker="o", ls="", ms=16, color=COL["defense"], label=L["de"]),
         Line2D([], [], marker="o", ls="", ms=18, mfc=COL["offense"], mec="gold", mew=4, label=L["target"]),
         Line2D([], [], marker="o", ls="", ms=18, mfc=COL["defense"], mec="red", mew=4, label=L["defn"]),
         Line2D([], [], marker="D", ls="", ms=14, color="saddlebrown", label=L["ball"]), Line2D([], [], color="#ffd400", lw=4, label=L["los"])]
    fig.suptitle(f'{rp["target"]["name"]} ({rp["offense"]} vs {rp["defense"]}, {rp["coverage"]}) - {L["sep"]} {rp["sep"]:.1f} {L["sepunit"]}', fontsize=24, fontweight="bold")
    fig.legend(handles=H, loc="lower center", ncol=6, fontsize=17, frameon=False)
    fig.tight_layout(rect=(0, 0.07, 1, 0.95))
    fig.savefig(os.path.join(od, L["fn"][2]), dpi=120); plt.close(fig)
print("ok")
