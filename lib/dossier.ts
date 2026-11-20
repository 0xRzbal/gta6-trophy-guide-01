// lib/dossier.ts
// A small, self-contained builder for the make.fun dossier artifact. It is written for
// this entry and reads only files; it makes no network calls. It mirrors the JSON shape
// that parseDossier accepts (contracts/dossier.ts) without importing the kit's library:
//
//   {
//     schema:  "makefun/dossier/v1",
//     cover:   0,
//     text:    "a markdown outline of the app's source files",
//     images:  [{ name, media_type, sha256, base64 }, ...]
//   }
//
// The text is capped so the dossier stays small, and each screenshot is checked against
// the entry's caps (a PNG or JPEG, no larger than 256 KiB, at most 4 images total).

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The schema tag a dossier must carry. */
export const DOSSIER_SCHEMA = 'makefun/dossier/v1';

/** Largest text we allow in the dossier (the competition's text_max_bytes cap). */
const TEXT_MAX_BYTES = 163840;

/** Most screenshots a dossier holds and the biggest single image, in bytes. */
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 262144;

/** The leading bytes that identify a PNG and a JPEG file. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** SHA-256 of a byte buffer as lowercase hex. */
function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Whether `bytes` starts with the byte sequence `magic`. */
function opensWith(bytes: Uint8Array, magic: number[]): boolean {
  return bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b);
}

/** The media type of a screenshot from its magic bytes, or null when neither PNG nor JPEG. */
function mediaTypeOf(bytes: Uint8Array): string | null {
  if (opensWith(bytes, PNG_MAGIC)) return 'image/png';
  if (opensWith(bytes, JPEG_MAGIC)) return 'image/jpeg';
  return null;
}

/** Is this file a "source" file under the rules (text a browser/guide author cares about)? */
function isSource(path: string): boolean {
  const base = path.split(sep).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const ext = dot === -1 ? '' : base.slice(dot);
  const sourceExt = ['.html', '.js', '.mjs', '.css', '.json'];
  if (!sourceExt.includes(ext)) return false;
  // Anything under a vendor/ directory is vendored, not source.
  const parts = path.split(sep);
  if (parts.includes('vendor')) return false;
  // Minified builds are treated as vendored, never shown as our own source.
  if (base.endsWith('.min.js') || base.endsWith('.min.mjs') || base.endsWith('.min.css')) return false;
  return true;
}

/** Recursively list every file under `root`, as paths relative to `root`. */
function walkFiles(root: string, dir: string = root): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(root, abs));
    else out.push(relative(root, abs));
  }
  return out.sort();
}

/**
 * Build the dossier's text: a short outline of the app, its load list and its source
 * files, each with its byte size. Kept comfortably under TEXT_MAX_BYTES.
 */
function buildText(appDir: string): string {
  const lines: string[] = ['# gta6-trophy-guide-01', '', 'An offline guide and tracker for the 55 GTA VI trophies.', '', '## Load', ''];
  const files = walkFiles(appDir);
  let totalBytes = 0;
  let sourceCount = 0;
  for (const f of files) {
    const size = statSync(join(appDir, f)).size;
    totalBytes += size;
    if (isSource(f)) sourceCount += 1;
    lines.push(`- app/${f} (${size} bytes)`);
  }
  lines.push('', `Totals: ${files.length} files, ${totalBytes} bytes across app/.`, '');
  lines.push('## Source', '');
  for (const f of files) {
    if (!isSource(f)) continue;
    const size = statSync(join(appDir, f)).size;
    lines.push(`### app/${f} (${size} bytes)`);
  }
  lines.push('', 'Sources for the guide content are listed in app/data/sources.md and cited in every trophy row.', '');
  const text = lines.join('\n');
  return text.length > TEXT_MAX_BYTES ? text.slice(0, TEXT_MAX_BYTES) : text;
}

/**
 * Build the full dossier document bytes for an output directory that already holds
 * app/ and screenshots/. Returns a Uint8Array of the canonical JSON.
 */
export function buildDossier(outDir: string): Uint8Array {
  const shotsDir = join(outDir, 'screenshots');
  const names = readdirSync(shotsDir)
    .filter((n) => /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(n))
    .sort();
  if (names.length === 0) throw new Error('no screenshots found');
  if (names.length > MAX_IMAGES) throw new Error(`too many screenshots: ${names.length}`);
  const images = names.map((name) => {
    const bytes = new Uint8Array(readFileSync(join(shotsDir, name)));
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`${name} is too large (${bytes.length} bytes)`);
    const type = mediaTypeOf(bytes);
    if (type === null) throw new Error(`${name} is neither PNG nor JPEG`);
    return { name, media_type: type, sha256: sha256Hex(bytes), base64: Buffer.from(bytes).toString('base64') };
  });
  const doc = { schema: DOSSIER_SCHEMA, cover: 0, text: buildText(join(outDir, 'app')), images };
  return new Uint8Array(Buffer.from(JSON.stringify(doc), 'utf8'));
}
