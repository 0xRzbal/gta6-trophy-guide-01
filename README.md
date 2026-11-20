# Leonida Trophy Tracker — GTA VI

An offline guide and tracker for all 55 Grand Theft Auto VI PlayStation 5 trophies.
Browse the checklist, filter by grade or kind, flag missable trophies, hide spoilers,
and tick trophies off as you earn them — your progress saves to your browser and can be
exported and imported as JSON. A six-stage roadmap to the platinum and a cited source list
are included. The whole app runs from static files under `app/` with no build step, no
external fonts or scripts, and no network access at run time.

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xRzbal/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xRzbal/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Bounty: https://make.fun/bounty/gta6-trophy-guide-01

## Run it

Serve `app/` from any static HTTP server (e.g. `python3 -m http.server 8080 --directory app`)
and open http://localhost:8080. Everything works offline.

## Build

The entrypoint `main.ts` copies `app/` and `screenshots/` into the output directory and
writes `dossier.json`. Run it with Node 22+:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node --experimental-strip-types main.ts
```

## License

MIT — see [LICENSE](LICENSE).
