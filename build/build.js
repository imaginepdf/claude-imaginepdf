#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'scripts');

const entries = ['design', 'generate'];

async function build() {
  console.log('Building ImaginePDF plugin scripts...\n');

  fs.mkdirSync(OUT, { recursive: true });

  for (const name of entries) {
    const entry = path.join(SRC, `${name}.ts`);
    const out = path.join(OUT, `${name}.cjs`);

    try {
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        outfile: out,
        minify: true,
        banner: { js: '#!/usr/bin/env node' },
      });

      fs.chmodSync(out, 0o755);
      const stats = fs.statSync(out);
      console.log(`  ${name}.cjs (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`Failed to build ${name}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\nBuild complete!');
}

build();
