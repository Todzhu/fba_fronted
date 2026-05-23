import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

describe('api compatibility modules', () => {
  it('keeps myData as a compatibility re-export', () => {
    const source = readFileSync('src/api/myData.ts', 'utf8').trim();
    expect(source).toBe("export * from './my-data';");
  });

  it('keeps cloudTools myData as a compatibility re-export', () => {
    const source = readFileSync('src/api/cloudTools/myData.ts', 'utf8').trim();
    expect(source).toBe("export * from '../my-data';");
  });

  it('keeps analysisTool as a compatibility re-export', () => {
    const source = readFileSync('src/api/analysisTool.ts', 'utf8').trim();
    expect(source).toBe("export * from './analysis-tools';");
  });
});
