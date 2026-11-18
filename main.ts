// Ember Bay — make.fun gta6-01 entry program (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ from beside this file into
// the output directory and writes /output/dossier.json with the vendored
// make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Refuse early, with a plain message, when the entry would fail the
// scorer's caps: more than 4 screenshots, one over 256 KiB, or a game/
// tree the scorer would refuse. buildDossier throws the same way, but
// this names the offending file before anything is written.
const shotDir = join(here, 'screenshots');
if (existsSync(shotDir)) {
  const shots = readdirSync(shotDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);
  for (const f of shots) {
    const size = statSync(join(shotDir, f)).size;
    if (size > 262144) throw new Error(`screenshot too big: ${f} is ${size} bytes (max 262144)`);
  }
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
