import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const readSource = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const views = {
  cloudTools: readSource('./cloudTools/CloudTools.vue'),
  myData: readSource('./myData/index.vue'),
  myTasks: readSource('./task/MyTasks.vue'),
  pipeline: readSource('./pipeline/PipelineList.vue'),
};

describe('BioCloud page headers', () => {
  it('uses one compact banner height across primary workbench pages', () => {
    for (const source of Object.values(views)) {
      expect(source).toContain('rounded-2xl');
      expect(source).toContain('bg-white');
      expect(source).toContain('border border-slate-200/80');
      expect(source).toContain('px-6 py-4');
      expect(source).toContain('h-12 w-12');
      expect(source).toContain('text-lg font-bold tracking-tight text-slate-900');
      expect(source).toContain('mt-0.5 text-[13px] font-medium text-slate-500');
    }
  });

  it('shows public tutorial navigation immediately after my tasks', () => {
    const source = readSource('../../layouts/ClientLayout.vue');
    const myTasksIndex = source.indexOf(
      "{ name: '我的任务', href: '/tasks', icon: ClipboardList, requiresAuth: true }",
    );
    const tutorialsIndex = source.indexOf(
      "{ name: '教程', href: '/tutorials', icon: BookOpen, requiresAuth: false }",
    );

    expect(myTasksIndex).toBeGreaterThan(-1);
    expect(tutorialsIndex).toBeGreaterThan(myTasksIndex);
    expect(source).toMatch(
      /\{ name: '我的任务', href: '\/tasks', icon: ClipboardList, requiresAuth: true \},\s*\{ name: '教程', href: '\/tutorials', icon: BookOpen, requiresAuth: false \}/,
    );
  });
});
