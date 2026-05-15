import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const componentDir = dirname(fileURLToPath(import.meta.url));
const dynamicFormSource = readFileSync(
  resolve(componentDir, 'DynamicForm.vue'),
  'utf8',
);
const toolDetailSource = readFileSync(
  resolve(componentDir, '../detail.vue'),
  'utf8',
);

describe('CellChat compare pair selector', () => {
  it('maps compare_pairs metadata values to a single-pair selector', () => {
    expect(toolDetailSource).toContain("new Set(['compare_pairs'])");
    expect(toolDetailSource).toContain("prop.widget = 'metadata_pair_select'");
  });

  it('renders compare pair as two coordinated selects instead of a free multi-select', () => {
    expect(dynamicFormSource).toContain(
      "getWidgetType(prop) === 'metadata_pair_select'",
    );
    expect(dynamicFormSource).toContain('pair-select-control');
    expect(dynamicFormSource).toContain('splitPairValue');
    expect(dynamicFormSource).toContain('updatePairValue');
  });

  it('uses neutral A/B wording because compare pair order is not a control-case direction', () => {
    expect(dynamicFormSource).toContain('placeholder="选择分组 A"');
    expect(dynamicFormSource).toContain('placeholder="选择分组 B"');
    expect(dynamicFormSource).not.toContain('placeholder="比较组 1"');
    expect(dynamicFormSource).not.toContain('placeholder="比较组 2"');
  });
});
