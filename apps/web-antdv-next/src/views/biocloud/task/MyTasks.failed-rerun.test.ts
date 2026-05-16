import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'MyTasks.vue'),
  'utf8',
);

describe('failed task rerun action', () => {
  it('shows an explicit adjust-and-rerun action only for failed normal tool tasks', () => {
    expect(source).toContain('canRerunFailedTask');
    expect(source).toContain("task.status === 'failed'");
    expect(source).toContain("task.tool_name !== '单细胞分析流程'");
    expect(source).toContain('调整参数并重跑');
  });

  it('opens the tool page in rerun mode with the original task id', () => {
    expect(source).toContain('handleRerunFailedTask');
    expect(source).toContain('rerun_task_id');
    expect(source).toContain('task.tool_id');
  });
});
