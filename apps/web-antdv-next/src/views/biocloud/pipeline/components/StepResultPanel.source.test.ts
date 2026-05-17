import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'StepResultPanel.vue'),
  'utf8',
);

describe('StepResultPanel', () => {
  it('renders pending, running, completed, and error states', () => {
    expect(source).toContain("step.status === 'pending'");
    expect(source).toContain("step.status === 'running'");
    expect(source).toContain("step.status === 'completed'");
    expect(source).toContain("step.status === 'error'");
  });

  it('prioritizes metrics, charts, tables, and log access', () => {
    expect(source).toContain('getSortedStats');
    expect(source).toContain('charts');
    expect(source).toContain('tables');
    expect(source).toContain("emit('openLogs')");
  });
});
