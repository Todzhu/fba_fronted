import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'PipelineDataFolderSelector.vue'),
  'utf8',
);

describe('PipelineDataFolderSelector', () => {
  it('loads root tree and lazy folder children', () => {
    expect(source).toContain('getMyDataTree');
    expect(source).toContain('getFolderChildrenAsNodes');
    expect(source).toContain('toggleExpand');
  });

  it('emits selected folder path through v-model', () => {
    expect(source).toContain('defineEmits');
    expect(source).toContain('update:modelValue');
    expect(source).toContain('selectNode');
  });

  it('renders loading and retry states', () => {
    expect(source).toContain('loadingTree');
    expect(source).toContain('loadError');
    expect(source).toContain('重新加载');
  });
});
