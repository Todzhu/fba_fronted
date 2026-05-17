import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const listSource = readFileSync(resolve(sourceDir, 'PipelineList.vue'), 'utf8');
const constantsSource = readFileSync(
  resolve(sourceDir, 'constants.ts'),
  'utf8',
);

describe('pipeline list constants extraction', () => {
  it('uses shared pipeline type metadata from constants.ts', () => {
    expect(constantsSource).toContain('export const PIPELINE_TYPES');
    expect(constantsSource).toContain('单细胞转录组分析流程');
    expect(constantsSource).toContain('空间转录组分析流程');
    expect(listSource).toContain("from './constants'");
    expect(listSource).toContain('PIPELINE_TYPES');
  });

  it('uses shared species options for create flow reuse', () => {
    expect(constantsSource).toContain('export const SPECIES_OPTIONS');
    expect(constantsSource).toContain('Homo sapiens');
  });
});
