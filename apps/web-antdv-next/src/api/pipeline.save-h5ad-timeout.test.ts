import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const apiPath = resolve(dirname(fileURLToPath(import.meta.url)), 'pipeline.ts');

describe('pipeline h5ad save timeout', () => {
  const source = readFileSync(apiPath, 'utf8');

  it('uses a long timeout for copying annotated h5ad files into my data', () => {
    expect(source).toContain('const SAVE_H5AD_TIMEOUT = 10 * 60 * 1000;');
    expect(source).toMatch(/saveH5adToMyData[\s\S]*requestClient\.post<\{ name: string; size: number \}>/);
    expect(source).toMatch(/saveH5adToMyData[\s\S]*timeout: SAVE_H5AD_TIMEOUT/);
  });
});
