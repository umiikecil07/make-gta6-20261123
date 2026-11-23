// main.ts — hands Sunset Bay in: copies game/ and screenshots/ from this
// repository into the output directory and writes dossier.json there with
// buildDossier from vendor/makefun-game.ts. Run it as:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameSource = join(repoRoot, 'game');
const shotsSource = join(repoRoot, 'screenshots');

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

if (!existsSync(gameSource) || !statSync(gameSource).isDirectory()) {
  fail(`game/ is missing from the repository root (${gameSource}).`);
}
if (!existsSync(join(gameSource, 'index.html'))) {
  fail('game/index.html is missing: the game must open from game/index.html.');
}
const gameEntries = readdirSync(gameSource);
if (gameEntries.length === 0) fail('game/ is empty: nothing to hand in.');
if (!existsSync(shotsSource) || !statSync(shotsSource).isDirectory()) {
  fail(`screenshots/ is missing from the repository root (${shotsSource}).`);
}
const shotFiles = readdirSync(shotsSource).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  fail(`screenshots/ must hold 3 or 4 renders, found ${shotFiles.length}.`);
}
for (const shot of shotFiles) {
  const size = statSync(join(shotsSource, shot)).size;
  if (size === 0) fail(`screenshots/${shot} is empty.`);
  if (size > 262144) fail(`screenshots/${shot} is ${size} bytes, over the 256 KiB cap.`);
  if (!/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(shot)) {
    fail(`screenshots/${shot} has a name the gate refuses (letters, digits, . _ - only).`);
  }
  if (!/\.(png|jpe?g)$/i.test(shot)) {
    fail(`screenshots/${shot} is not a PNG or JPEG render.`);
  }
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameSource, join(outputDir, 'game'), { recursive: true });
cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`Wrote ${outputDir}/dossier.json (${dossier.length} bytes).`);
console.log('Game and screenshots copied to the output directory.');
