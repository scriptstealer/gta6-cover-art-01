// Vice Cover Studio — a make.fun gta6-cover-art-01 entry (Node 22, stdlib only).
//
// The app itself is plain static files under app/: index.html plus its ES modules,
// vendored OFL fonts and three image-model sample photos, all loadable offline with
// no build step and no network request. This program is the hand-in: it copies
// app/ and screenshots/ from next to this file into the output directory and writes
// /output/dossier.json, the summary the judge reads, using the vendored make.fun
// library (vendor/makefun-app.ts).
//
// Try it locally first: `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps, from the kit's reference/gate.json: text_max_bytes is the only
// one that shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse anyway (over 4 screenshots, one over 256 KiB, app/ over 993 files or
// 48 MiB in all, or any app/ path over 1000 bytes — app/ shares /output's own
// 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
