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
const pageHeaderSource = listSource.slice(
  listSource.indexOf('<section class="mb-6'),
  listSource.indexOf('<section class="grid'),
);
const recommendedCardHeaderSource = listSource.slice(
  listSource.indexOf('<article'),
  listSource.indexOf('<div class="grid gap-0'),
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

  it('links the single-cell card to the dedicated create page', () => {
    expect(listSource).toContain("router.push('/pipeline/create?type=scrna')");
    expect(listSource).not.toContain('showCreateModal');
    expect(listSource).not.toContain('createPipeline({');
  });

  it('keeps the home page focused on flow capability and expected outputs', () => {
    expect(listSource).toContain('标准 6 步分析流程');
    expect(listSource).toContain('核心产出');
    expect(listSource).toContain('创建分析项目');
  });

  it('uses the requested platform and supported-data labels', () => {
    expect(constantsSource).toContain('DNBelab C4');
    expect(constantsSource).not.toContain('Smart-seq2');
    expect(listSource).toContain('multi samples');
    expect(listSource).not.toContain('h5 / h5ad');
    expect(listSource).not.toContain('多样本目录');
  });

  it('keeps a single create-project call to action on the page', () => {
    expect(listSource.match(/创建分析项目/g)).toHaveLength(1);
    expect(listSource.match(/@click="handleCreateProject"/g)).toHaveLength(1);
  });

  it('places the create-project action inside the recommended pipeline card header', () => {
    expect(pageHeaderSource).not.toContain('创建分析项目');
    expect(recommendedCardHeaderSource).toContain('创建分析项目');
    expect(recommendedCardHeaderSource).toContain('@click="handleCreateProject"');
  });
});
