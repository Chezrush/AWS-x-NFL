# Who to Attack 🏈

**Find the receivers creating space, and prepare the matchups that matter.** A game-planning tool for NFL offensive coordinators, built on Next Gen Stats tracking data. · [Français](README.fr.md)

![Who to Attack: overview with the animated play radar and the leaderboard of unexploited receivers](docs/img/who-to-attack-overview-en.png)

## The idea

At the moment the ball is thrown, we score each eligible receiver (WR/TE/RB) with the **Optimal Target Score (OTS, 0–99)**: separation from the nearest defender now and 0.5 s ahead, boosted for mismatches (a RB/TE covered by a linebacker, a speed edge) and for being past the first-down line. Across **6,867 passes and 31,446 routes**, a mismatch is worth **+0.9 yd** of projected separation, and passes where the QB finds the most open option average **+0.63 EPA vs +0.07** otherwise. The coordinator sees who is open but forgotten, and which defense to attack.

## Features

- **Overview**: headline numbers, an animated play radar you can scrub, and a leaderboard of *unexploited opportunities* (best option often, targeted rarely).
- **Game plan**: pick an opponent and get the matchups to attack.
- **Players**: searchable, filterable table of receivers with OTS, EPA, route counts and a detailed profile drawer.
- **Defenses**: how each defense plays man vs zone by down and distance.
- **Replays**: the plays with the biggest gap between the best option and the actual target.
- **Method & data**: metric definitions and limits. `⌘K` search across players and pages, FR/EN, light/dark, installable PWA.

## Run it

```bash
docker compose -f web/docker-compose.yml up --build   # http://localhost:3000 (FR/EN)
python3 scripts/build_metrics.py                      # optional: recompute the JSON from data/ (~10 s)
```

## Honest limits

- OTS is a model: it ignores coverage reads, pressure and route concept. With about 5 receivers, not throwing to the top OTS is common by chance, so a gap is a lead to review, not proof of a QB error.
- Running backs often look open because they are alone in space: compare within a position and mind the route counts shown.
- Targeted receiver comes from nflverse play-by-play (tracking stops ~0.5 s after the throw). 2021 season, weeks 1–8 only. Correlation, not causation.

*Data: NFL Big Data Bowl tracking + PFF scouting + nflverse. Built at the AWS × NFL hackathon, Paris, 21 Oct 2026.*
