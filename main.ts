// main.ts
// The entrypoint of the gta6-trophy-guide-01 entry. It targets Node 22 (run with
// `node --experimental-strip-types main.ts`) and uses only the Node standard library.
//
// What it does:
//   1. reads the competition input from the current repository (app/ and screenshots/),
//   2. copies both trees into the output directory (MAKEFUN_OUTPUT_DIR, or /output),
//   3. writes dossier.json next to them describing the entry, using our own lib/dossier.ts.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node --experimental-strip-types main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './lib/dossier.ts';

/** The directory this script lives in (the repository root). */
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/** Where the finished entry goes: an env override, else the grader's /output. */
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a source directory trees into the output directory, preserving names. */
function stageDirectory(source: string, dest: string): void {
  if (!existsSync(source)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
}

// Build the output layout.
mkdirSync(outputDir, { recursive: true });

// Hand in the frontend and the screenshots.
stageDirectory(join(repoRoot, 'app'), join(outputDir, 'app'));
stageDirectory(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// Describe the entry in dossier.json.
const dossierBytes = buildDossier(outputDir);
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

console.log(`entry staged in ${outputDir}: app/, screenshots/ and dossier.json`);
