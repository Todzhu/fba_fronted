import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const apiPath = resolve(dirname(fileURLToPath(import.meta.url)), 'my-data.ts');

describe('my data download timeout', () => {
  const source = readFileSync(apiPath, 'utf8');

  it('uses a long timeout for large file downloads', () => {
    expect(source).toContain('const LARGE_DOWNLOAD_TIMEOUT = 2 * 60 * 60 * 1000;');
    expect(source).toMatch(/downloadMyDataFile[\s\S]*requestClient\.download<Blob>/);
    expect(source).toMatch(/downloadMyDataFile[\s\S]*timeout: LARGE_DOWNLOAD_TIMEOUT/);
  });
});
