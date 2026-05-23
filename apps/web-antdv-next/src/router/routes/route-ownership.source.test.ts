import { describe, expect, it } from 'vitest';

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readRouteFile = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const routeTargetExists = (path: string) =>
  existsSync(fileURLToPath(new URL(path, import.meta.url)));

const expectRoutePath = (source: string, path: string) => {
  const escapedPath = path.replaceAll('/', String.raw`\/`);
  expect(source).toMatch(new RegExp(`path:\\s*['"]${escapedPath}['"]`));
};

describe('frontend route ownership', () => {
  it('keeps public BioCloud client routes in external landing routes', () => {
    const source = readRouteFile('./external/landing.ts');

    for (const path of [
      'tools',
      'data',
      'tasks',
      'tutorials',
      'tutorials/:slug',
      'pipeline',
    ]) {
      expectRoutePath(source, path);
    }
  });

  it('keeps tutorial cms routes in the system route module', () => {
    const source = readRouteFile('./modules/system.ts');

    expectRoutePath(source, '/system/tutorials');
  });

  it('keeps tutorial route component imports resolvable', () => {
    for (const path of [
      '../../views/biocloud/tutorials/TutorialList.vue',
      '../../views/biocloud/tutorials/TutorialDetail.vue',
      '../../views/system/tutorials/index.vue',
    ]) {
      expect(routeTargetExists(path)).toBe(true);
    }
  });

  it('keeps admin analysis routes in the analysis route module', () => {
    const source = readRouteFile('./modules/analysis.ts');

    for (const path of ['/analysis', '/analysis/tools', '/analysis/tasks']) {
      expectRoutePath(source, path);
    }
  });

  it('keeps analysis routes out of core routes', () => {
    const source = readRouteFile('./core.ts');

    expect(source).not.toContain("path: '/analysis'");
    expect(source).not.toContain("name: 'AnalysisTools'");
    expect(source).not.toContain("name: 'AnalysisToolDetail'");
  });
});
