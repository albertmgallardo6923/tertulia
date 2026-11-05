// Empaqueta worker/index.ts en dist/_worker.js (ESM) para Cloudflare Pages.
import { build } from 'esbuild';

await build({
  entryPoints: ['worker/index.ts'],
  outfile: 'dist/_worker.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'warning',
});
