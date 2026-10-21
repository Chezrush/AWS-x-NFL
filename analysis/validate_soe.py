"""Does SOE mean anything? Completion rate of the *targeted* receiver by SOE tercile.

Reads analysis/out/routes.csv (from build_routes.py), writes web/data/validation.json
(numbers only, no sentences: the front translates the labels).
"""
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SUFFIXES = {"jr", "sr", "ii", "iii", "iv"}


def norm(s):
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()


def is_target(row):
    """The receiver named after 'to' in the play description (surname match)."""
    parts = norm(row.displayName).split()
    last = parts[-2] if parts[-1] in SUFFIXES and len(parts) > 1 else parts[-1]
    m = re.search(r"\bto ([a-z]\.?[a-z]?\.?[a-z'\-]+)", norm(row.playDescription))
    return bool(m) and last in m.group(1).replace(".", "").replace("'", "")


def terciles(df, col, extra=False):
    q = pd.qcut(df[col], 3, labels=["low", "mid", "high"])
    g = df.groupby(q, observed=True).agg(n=("comp", "size"), completion=("comp", "mean"), mean_value=(col, "mean"),
                                         epa=("epa", "mean"), success=("success", "mean"), cpoe=("cpoe", "mean"))
    out = {}
    for k, v in g.iterrows():
        d = {"n": int(v.n), "completion": round(float(v.completion), 3), "mean": round(float(v.mean_value), 2)}
        if extra: d.update(epa=round(float(v.epa), 3), success=round(float(v.success), 3), cpoe=round(float(v.cpoe), 2))
        out[k] = d
    return out


def main():
    r = pd.read_csv(ROOT / "analysis/out/routes.csv")
    r = r[r.pff_passCoverageType.isin(["Man", "Zone"])].copy()
    r["soe"] = r.sep - r.groupby(["pos", "align", "pff_passCoverageType"]).sep.transform("median")
    t = r[r.passResult.isin(["C", "I", "IN"])].copy()
    tg = pd.read_csv(ROOT / "analysis/out/targets.csv")
    t = t.merge(tg, on=["gameId", "playId"], how="left")
    n_txt = int(t.apply(is_target, axis=1).sum())
    t = t[t.nflId == t.target_nflId].copy()
    print("cibles nflverse:", len(t), "| cibles texte:", n_txt)
    t["comp"] = (t.passResult == "C").astype(int)

    out = {
        "n_targeted_routes": int(len(t)),
        "completion_overall": round(float(t.comp.mean()), 3),
        "soe_terciles": terciles(t, "soe"),
        "sep_terciles": terciles(t, "sep"),
        "epa_terciles": terciles(t, "soe", True),
        "epa_by_coverage": {ty.lower(): terciles(t[t.pff_passCoverageType == ty], "soe", True) for ty in ("Man", "Zone")},
        "cpoe_terciles": {k: v["cpoe"] for k, v in terciles(t, "soe", True).items()},
        "by_coverage": {ty.lower(): terciles(t[t.pff_passCoverageType == ty], "soe") for ty in ("Man", "Zone")},
    }
    path = ROOT / "web/data/validation.json"
    path.write_text(json.dumps(out, indent=1))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
