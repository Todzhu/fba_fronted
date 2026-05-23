import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readRouteFile = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const expectRoutePath = (source: string, path: string) => {
  const escapedPath = path.replaceAll('/', String.raw`\/`);
  expect(source).toMatch(new RegExp(`path:\\s*['"]${escapedPath}['"]`));
};

describe('frontend route ownership', () => {
  it('keeps public BioCloud client routes in external landing routes', () => {
    const source = readRouteFile('./external/landing.ts');

    for (const path of ['tools', 'data', 'tasks', 'pipeline']) {
      expectRoutePath(source, path);
    }
  });

  it('keeps admin analysis routes in the analysis route module', () => {
    const source = readRouteFile('./modules/analysis.ts');

    for (const path of ['/analysis', '/analysis/tools', '/analysis/tasks']) {
      expectRoutePath(source, path);
    }
  });
});
