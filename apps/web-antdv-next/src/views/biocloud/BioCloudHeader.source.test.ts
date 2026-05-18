import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname);

const readView = (path: string) => readFileSync(resolve(root, path), 'utf8');

const views = {
  cloudTools: readView('cloudTools/CloudTools.vue'),
  myData: readView('myData/index.vue'),
  myTasks: readView('task/MyTasks.vue'),
  pipeline: readView('pipeline/PipelineList.vue'),
};

describe('BioCloud page headers', () => {
  it('uses one compact banner height across primary workbench pages', () => {
    for (const source of Object.values(views)) {
      expect(source).toContain('rounded-2xl bg-white border border-slate-200/80');
      expect(source).toContain('px-6 py-4');
      expect(source).toContain('h-12 w-12');
      expect(source).toContain('text-lg font-bold tracking-tight text-slate-900');
      expect(source).toContain('mt-0.5 text-[13px] font-medium text-slate-500');
    }
  });
});
