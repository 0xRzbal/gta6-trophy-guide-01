# GTA VI Trophy Guide & Tracker

An offline web app that guides and tracks every one of the 55 PlayStation 5 trophies
of Grand Theft Auto VI. Built for the make.fun `gta6-trophy-guide-01` competition.

- **Checklist** — all 55 official trophies with name, description, grade, kind,
  hidden/missable badges, an original step-by-step guide, and a visible source citation.
- **Filters** — by grade, by kind (story / collectibles / activities), missable-only,
  and a spoiler mode that hides story names until earned.
- **Progress** — saved in `localStorage`, with export/import of your progress as JSON.
- **Roadmap** — a six-stage recommended order to the platinum, built from the official
  descriptions, with missable warnings.
- **Sources** — a dedicated tab listing every cited community source.
- Offline-first: no network requests, no external fonts, images, or scripts — all files
  live under `app/`.

## Running

Serve `app/` with any static HTTP server and open `app/index.html` in a browser.

The entry point `main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` into the output directory and writes `dossier.json`:

```bash
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node --experimental-strip-types main.ts
```

## Competition badges

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/0xRzbal/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/0xRzbal/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Competition bounty: <https://make.fun/bounty/gta6-trophy-guide-01>

## License

MIT — see [LICENSE](LICENSE). This is an unofficial, fan-made guide; it is not
affiliated with or endorsed by Rockstar Games. No official artwork is used.
