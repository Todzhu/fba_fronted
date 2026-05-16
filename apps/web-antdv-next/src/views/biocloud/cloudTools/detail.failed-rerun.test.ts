import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'detail.vue'),
  'utf8',
);
const apiSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../api/analysis-tools.ts'),
  'utf8',
);
const selectorSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'components/DataFileSelector.vue'),
  'utf8',
);

describe('tool detail failed-task rerun mode', () => {
  it('uses a rerun API wrapper instead of creating a new task in rerun mode', () => {
    expect(apiSource).toContain('rerunAnalysisTask');
    expect(apiSource).toContain('/rerun');
    expect(source).toContain('rerunTaskId');
    expect(source).toContain('rerunAnalysisTask');
  });

  it('loads failed task inputs for editing instead of showing the failed result panel', () => {
    expect(source).toContain('loadTaskForRerun');
    expect(source).toContain('route.query.rerun_task_id');
    expect(source).toContain('setFileContents');
    expect(source).toContain('setFileUrls');
    expect(source).toContain('setFileIds');
  });

  it('can restore table contents, example URLs, and platform file ids into the file selector', () => {
    expect(selectorSource).toContain('const setFileUrls');
    expect(selectorSource).toContain('const setFileIds');
    expect(selectorSource).toContain('fileData.fileUrl = fileUrl');
    expect(selectorSource).toContain('fileData.fileId = Number(fileId)');
  });
});
