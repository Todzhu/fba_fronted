import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const createSource = readFileSync(resolve(sourceDir, 'PipelineCreate.vue'), 'utf8');
const routeSource = readFileSync(
  resolve(sourceDir, '../../../router/routes/external/landing.ts'),
  'utf8',
);

describe('pipeline create page', () => {
  it('is registered as a dedicated route before pipeline/:id', () => {
    expect(routeSource.indexOf("path: 'pipeline/create'")).toBeGreaterThan(-1);
    expect(routeSource.indexOf("path: 'pipeline/create'")).toBeLessThan(
      routeSource.indexOf("path: 'pipeline/:id'"),
    );
    expect(routeSource).toContain("name: 'PipelineCreate'");
  });

  it('uses the shared folder selector and createPipeline API', () => {
    expect(createSource).toContain('PipelineDataFolderSelector');
    expect(createSource).toContain('createPipeline');
    expect(createSource).toContain('SPECIES_OPTIONS');
  });
});
