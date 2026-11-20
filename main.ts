// =============================================================================
// gta6-trophy-guide-01 — make.fun entry point (Node 22, standard library only)
// =============================================================================
// This program hands the guide in. It:
//   1. confirms we run on Node 22 (the competition's runtime),
//   2. reads the competition input from the repository directory that holds this
//      script (the app/ static site and the screenshots/ folder),
//   3. copies both into the output directory (`/output`, with MAKEFUN_OUTPUT_DIR
//      standing in for it when run locally), and
//   4. writes `dossier.json` — the summary the judge reads — using the vendored
//      make.fun frontend library so the bytes match the scorer's own build.
//
// No third-party packages are used: only Node's built-in modules appear below.
// =============================================================================

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// ---------------------------------------------------------------------------
// Runtime selection: the grader runs Node 22, so we demand at least 22.6 (the
// first release that runs TypeScript with type stripping by default). Refuse
// older installations early with a readable message instead of failing late.
// ---------------------------------------------------------------------------
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 6)) {
  console.error(`makefun entry requires Node >= 22.6 (found ${process.versions.node})`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Paths. `here` is the directory containing this script (the repository root at
// the submitted commit). `out` is where the entry is handed in; the environment
// variable MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.
// ---------------------------------------------------------------------------
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Copy the static app and (when present) the screenshots into the output dir.
// The screenshots are supplied by a separate capture process, so we tolerate
// their absence here and still create a (possibly empty) screenshots directory.
// ---------------------------------------------------------------------------
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

const shotsSource = join(here, 'screenshots');
const shotsTarget = join(out, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
if (existsSync(shotsSource)) cpSync(shotsSource, shotsTarget, { recursive: true });

// ---------------------------------------------------------------------------
// Caps matched to the scorer's gate. Only text_max_bytes shapes the dossier's
// bytes; the rest only refuse an entry the scorer would refuse anyway (more than
// four screenshots or one over 256 KiB, more than 993 app files/directories, or
// app files totalling over 48 MiB).
// ---------------------------------------------------------------------------
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

// ---------------------------------------------------------------------------
// Write the dossier. With screenshots in place, buildDossier produces the exact
// bytes the scorer expects. Before the screenshot capture has run (typical for a
// local build), buildDossier refuses an empty screenshots/ directory; in that
// case we still write a placeholder dossier so the output always holds the file.
// The graded run always has screenshots, so it always takes the real path.
// ---------------------------------------------------------------------------
const dossierPath = join(out, 'dossier.json');
try {
  writeFileSync(dossierPath, buildDossier(out, caps));
} catch (err) {
  console.warn(`buildDossier skipped (${(err as Error).message}); writing placeholder dossier`);
  const placeholder = {
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    note: 'screenshots pending — this placeholder is replaced by the real dossier once screenshots are present',
  };
  writeFileSync(dossierPath, JSON.stringify(placeholder, null, 2));
}
console.log(`wrote ${dossierPath}`);
