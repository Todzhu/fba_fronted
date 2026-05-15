import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const config = readFileSync(resolve('scripts/deploy/nginx.conf'), 'utf8');

assert.match(
  config,
  /location\s+=\s+\/index\.html\s*\{[\s\S]*?add_header\s+Cache-Control\s+"no-store/s,
  'index.html must be served with no-store so browser tabs revalidate the SPA entry after redeploys',
);

assert.match(
  config,
  /location\s+=\s+\/_app\.config\.js\s*\{[\s\S]*?add_header\s+Cache-Control\s+"no-store/s,
  '_app.config.js must be served with no-store because it controls runtime API config',
);
