import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readApiFile = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('api compatibility modules', () => {
  it('keeps myData as a compatibility re-export', () => {
    const source = readApiFile('./myData.ts');
    expect(source).toBe("export * from './my-data';\n");
  });

  it('keeps cloudTools myData as a compatibility re-export', () => {
    const source = readApiFile('./cloudTools/myData.ts');
    expect(source).toBe("export * from '../my-data';\n");
  });

  it('keeps analysisTool as a compatibility re-export', () => {
    const source = readApiFile('./analysisTool.ts');
    expect(source).toBe("export * from './analysis-tools';\n");
  });
});
