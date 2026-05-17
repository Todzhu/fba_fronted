# scRNA Cloud Pipeline UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-cell cloud pipeline main path into a professional workflow: pipeline home -> create project page -> horizontal-stepper detail workspace -> clearer results/errors/logs.

**Architecture:** Keep the existing API and execution model. Split the current monolithic pipeline views into focused Vue components, add a dedicated create page route, and reshape the detail page around a top stepper plus left-parameter/right-result workspace. Backend work is limited to prerequisite checks, status synchronization, and shared log path resolution.

**Tech Stack:** Vue 3, TypeScript, Vite, Vue Router, Tailwind utility classes, Ant Design Vue, lucide-vue-next, Vitest, FastAPI, SQLAlchemy, Celery.

---

## File Structure

Frontend files to create:

- `apps/web-antdv-next/src/views/biocloud/pipeline/constants.ts`  
  Shared pipeline type definitions, species options, visual status metadata, and card copy currently embedded in `PipelineList.vue`.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.vue`  
  Reusable folder tree selector for the create page.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineStepper.vue`  
  Horizontal six-step status navigation.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.vue`  
  Shared result panel states: pending, running, completed, error.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/SampleGroupTable.vue`  
  Step 1 sample table extracted from `PipelineDetail.vue`.
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.vue`  
  Dedicated project creation page.
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts`  
  Source-level test for route/form/data-selector integration.
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts`  
  Source-level test for horizontal stepper and workspace integration.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts`  
  Source-level test for selector behavior.
- `apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts`  
  Source-level test for result states.

Frontend files to modify:

- `apps/web-antdv-next/src/router/routes/external/landing.ts`  
  Add `/pipeline/create`.
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue`  
  Convert to professional pipeline home and remove modal creation code.
- `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`  
  Replace left nav with `PipelineStepper`, move sample table to `SampleGroupTable`, and use `StepResultPanel` for main result state.
- `apps/web-antdv-next/src/api/pipeline.ts`  
  Keep existing API; only add small helpers if component boundaries need clearer types.

Backend files to modify:

- `backend/app/pipeline/service/pipeline_service.py`  
  Add prerequisite checks, pipeline status sync, and shared task output lookup helpers.
- `backend/app/pipeline/api/v1/pipeline.py`  
  Use shared log path helper instead of duplicating step directory mapping.
- `backend/app/task/tasks/run_pipeline.py`  
  Update pipeline and AnalysisTask status consistently when steps start, complete, or fail.

---

### Task 1: Extract Shared Pipeline Constants

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/constants.ts`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue`

- [ ] **Step 1: Write the source test**

Create `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const listSource = readFileSync(resolve(dir, 'PipelineList.vue'), 'utf8');
const constantsSource = readFileSync(resolve(dir, 'constants.ts'), 'utf8');

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
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts --dom
```

Expected: FAIL because `constants.ts` does not exist.

- [ ] **Step 3: Create `constants.ts`**

Move the current `pipelineTypes` and `speciesOptions` data into:

```ts
import { MapPin, Microscope } from 'lucide-vue-next';

export const PIPELINE_TYPES = [
  {
    id: 'scrna',
    title: '单细胞转录组分析流程',
    subtitle: 'Single-cell RNA-seq Analysis',
    description:
      '一站式单细胞分析的云端流程，覆盖数据读取、质控过滤、降维聚类、Marker 基因、细胞注释与亚群分析。',
    fullDescription:
      '单细胞RNA测序（Single-cell RNA-sequencing, scRNA-seq）用于在单细胞水平解析基因表达异质性。该云流程将常用分析步骤组织为可追踪、可调参、可复用的标准流程。',
    features: [
      '支持 10x Genomics、Smart-seq2 等主流平台数据',
      '标准化 6 步 scRNA-seq 分析路径',
      'QC、UMAP、Marker、注释结果集中展示',
      '支持 h5ad 保存到我的数据并复用',
    ],
    outputs: ['QC 图', 'UMAP/t-SNE', 'Marker 表', '细胞注释 h5ad'],
    tags: ['scRNA-seq', '10x Genomics', 'h5ad'],
    icon: Microscope,
    accent: '#0f766e',
    available: true,
  },
  {
    id: 'spatial',
    title: '空间转录组分析流程',
    subtitle: 'Spatial Transcriptomics Analysis',
    description:
      '空间转录组流程正在规划中，将支持空间表达可视化、空间聚类与细胞互作分析。',
    fullDescription:
      '空间转录组学流程将把基因表达与组织空间位置信息结合。第一版云流程优化不实现该流程，仅保留入口占位。',
    features: ['空间表达可视化', '空间聚类', '细胞互作分析'],
    outputs: ['空间表达图', '空间聚类图'],
    tags: ['Visium', 'Spatial'],
    icon: MapPin,
    accent: '#0891b2',
    available: false,
  },
] as const;

export const SPECIES_OPTIONS = [
  { value: 'human', label: '人类 (Homo sapiens)' },
  { value: 'mouse', label: '小鼠 (Mus musculus)' },
  { value: 'rat', label: '大鼠 (Rattus norvegicus)' },
  { value: 'zebrafish', label: '斑马鱼 (Danio rerio)' },
  { value: 'drosophila', label: '果蝇 (Drosophila melanogaster)' },
  { value: 'other', label: '其他' },
] as const;

export const STATUS_STYLES = {
  pending: { label: '待运行', dot: 'bg-slate-300', text: 'text-slate-500' },
  running: { label: '运行中', dot: 'bg-blue-500', text: 'text-blue-600' },
  completed: { label: '已完成', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  error: { label: '失败', dot: 'bg-red-500', text: 'text-red-600' },
} as const;
```

- [ ] **Step 4: Update `PipelineList.vue` imports**

Remove local `pipelineTypes` and `speciesOptions` declarations. Add:

```ts
import { PIPELINE_TYPES } from './constants';

const pipelineTypes = PIPELINE_TYPES;
```

Do not keep unused imports such as `MapPin` and `Microscope` in `PipelineList.vue`.

- [ ] **Step 5: Run the test and typecheck**

Run:

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/constants.ts apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts
git commit -m "refactor: extract pipeline metadata constants"
```

---

### Task 2: Build Reusable Data Folder Selector

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.vue`
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue`

- [ ] **Step 1: Write the source test**

Create `PipelineDataFolderSelector.source.test.ts`:

```ts
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
    expect(source).toContain("defineEmits");
    expect(source).toContain("update:modelValue");
    expect(source).toContain('selectNode');
  });

  it('renders loading and retry states', () => {
    expect(source).toContain('loadingTree');
    expect(source).toContain('loadError');
    expect(source).toContain('重新加载');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts --dom
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Create the component**

Create a component with this public interface:

```ts
const props = defineProps<{
  error?: string;
  modelValue?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'selected': [node: FileNode];
}>();
```

Implementation requirements:

- Use `getMyDataTree()` on mount.
- Use `getFolderChildrenAsNodes(node.path)` when expanding unloaded folders.
- Only allow folder selection, not file selection.
- Render the selected path and folder label.
- Render loading state.
- Render `loadError` with a `重新加载` button that calls `loadDataTree`.
- Close dropdown on outside click and clean the listener on unmount.

- [ ] **Step 4: Keep existing behavior in `PipelineList.vue` for now**

Do not switch the current modal to the component yet. Only delete duplicated code from `PipelineList.vue` after the create page is added in Task 4. This keeps each commit easier to review.

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.vue apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts
git commit -m "feat: add pipeline data folder selector"
```

---

### Task 3: Add Create Project Route Skeleton

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.vue`
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts`
- Modify: `apps/web-antdv-next/src/router/routes/external/landing.ts`

- [ ] **Step 1: Write route/source test**

Create `PipelineCreate.source.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const createSource = readFileSync(resolve(dir, 'PipelineCreate.vue'), 'utf8');
const routeSource = readFileSync(
  resolve(dir, '../../../router/routes/external/landing.ts'),
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
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts --dom
```

Expected: FAIL because route and page do not exist.

- [ ] **Step 3: Add the route**

In `landing.ts`, insert this route before `pipeline/:id`:

```ts
{
  path: 'pipeline/create',
  name: 'PipelineCreate',
  component: () => import('#/views/biocloud/pipeline/PipelineCreate.vue'),
  meta: {
    title: '创建云流程 - BioCloud',
    ignoreAccess: true,
  },
},
```

- [ ] **Step 4: Create `PipelineCreate.vue`**

Implement:

- Uses `useAccessStore` like `PipelineList.vue`.
- If not logged in, opens `AuthModal` with `redirectPath="/pipeline/create?type=scrna"`.
- Form state: `formName`, `formDataPath`, `formSpecies`, `formDescription`, `formErrors`, `apiError`, `creating`.
- Validation matches current rules: name required, 2-50 chars; data path required; species required.
- Submit calls:

```ts
const pipeline = await createPipeline({
  name: formName.value.trim(),
  description: formDescription.value.trim() || undefined,
  dataPath: formDataPath.value,
  species: formSpecies.value,
  pipelineType: 'scrna',
});
router.push(`/pipeline/${pipeline.id}`);
```

Layout:

- Page shell: `min-h-screen bg-slate-50 pb-20`.
- Max width container.
- Left white bordered form panel.
- Right sticky summary panel.
- Use `PipelineDataFolderSelector v-model="formDataPath"`.

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web-antdv-next/src/router/routes/external/landing.ts apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts
git commit -m "feat: add pipeline create page"
```

---

### Task 4: Rework Pipeline Home and Remove Create Modal

**Files:**
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts`

- [ ] **Step 1: Write/update source test**

Extend `PipelineList.constants.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts --dom
```

Expected: FAIL because modal code still exists.

- [ ] **Step 3: Remove modal-specific logic**

Delete from `PipelineList.vue`:

- `FileNode` import.
- Folder tree state and functions.
- `createPipeline`, `getMyDataTree`, `getFolderChildrenAsNodes` imports.
- `showCreateModal`, `creating`, form fields, validation.
- `handleCreate`.
- Modal template.
- Tree dropdown styles no longer used by the page.

- [ ] **Step 4: Add home page actions**

Use:

```ts
const handleCreateProject = () => {
  if (!isLoggedIn.value) {
    showAuthModal.value = true;
    return;
  }
  router.push('/pipeline/create?type=scrna');
};
```

The primary scRNA card button calls `handleCreateProject`.

- [ ] **Step 5: Rebuild template as professional home**

Keep a compact, restrained layout:

- Header band with title and short subtitle.
- Primary wide scRNA card.
- Mini 6-step row using `STEP_ORDER` and `STEP_LABELS`.
- "核心产出" chips.
- "创建分析项目" primary button.
- Coming-soon spatial card below or beside with lower contrast.

- [ ] **Step 6: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts
git commit -m "feat: redesign pipeline home entry"
```

---

### Task 5: Add Horizontal Pipeline Stepper

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineStepper.vue`
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`

- [ ] **Step 1: Write layout test**

Create `PipelineDetail.layout.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const detailSource = readFileSync(resolve(dir, 'PipelineDetail.vue'), 'utf8');
const stepperSource = readFileSync(resolve(dir, 'components/PipelineStepper.vue'), 'utf8');

describe('pipeline detail workspace layout', () => {
  it('uses a top horizontal stepper instead of the left step nav', () => {
    expect(detailSource).toContain('PipelineStepper');
    expect(stepperSource).toContain('defineProps');
    expect(stepperSource).toContain('activeStepIndex');
    expect(stepperSource).toContain('update:activeStepIndex');
  });

  it('keeps step status labels visible in the stepper', () => {
    expect(stepperSource).toContain('STATUS_STYLES');
    expect(stepperSource).toContain('completedCount');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
```

Expected: FAIL because `PipelineStepper.vue` does not exist.

- [ ] **Step 3: Create `PipelineStepper.vue`**

Public interface:

```ts
const props = defineProps<{
  activeStepIndex: number;
  currentStep: number;
  steps: StepConfig[];
}>();

const emit = defineEmits<{
  'update:activeStepIndex': [value: number];
}>();
```

Behavior:

- Computes `completedCount`.
- Uses `STEP_LABELS`.
- Uses `STATUS_STYLES`.
- Only emits when a step is clickable.
- Step is clickable when `idx <= currentStep` or previous step is completed.

- [ ] **Step 4: Integrate in `PipelineDetail.vue`**

Import:

```ts
import PipelineStepper from './components/PipelineStepper.vue';
```

Replace the left sidebar step list with:

```vue
<PipelineStepper
  v-model:active-step-index="activeStepIndex"
  :current-step="pipeline.currentStep"
  :steps="pipeline.steps"
/>
```

Keep `isStepClickable` if other local logic still uses it, but do not render the old left navigation.

- [ ] **Step 5: Adjust main layout shell**

Change the main content wrapper from `flex gap-6` with fixed left nav to:

```vue
<div class="space-y-5">
  <PipelineStepper ... />
  <div class="min-w-0 space-y-4">
    <!-- active step content -->
  </div>
</div>
```

- [ ] **Step 6: Run test and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineStepper.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts
git commit -m "feat: add horizontal pipeline stepper"
```

---

### Task 6: Extract Sample Group Table

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/SampleGroupTable.vue`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts`

- [ ] **Step 1: Extend layout test**

Add:

```ts
it('renders the data-load sample table through a focused component', () => {
  expect(detailSource).toContain('SampleGroupTable');
  expect(detailSource).toContain('@change="saveSampleDict"');
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
```

Expected: FAIL because `SampleGroupTable` is not used.

- [ ] **Step 3: Create `SampleGroupTable.vue`**

Interface:

```ts
export interface SampleRow {
  sample: string;
  sampleName: string;
  group: string;
}

const props = defineProps<{
  loading?: boolean;
  rows: SampleRow[];
}>();

const emit = defineEmits<{
  change: [];
}>();
```

Template requirements:

- Loading state with "正在扫描样本...".
- Empty state "所选文件夹下没有找到样本数据".
- Table columns: Sample, Sample Name, Group.
- Inputs use `v-model="row.sampleName"` and `v-model="row.group"`.
- Inputs emit `change` on input.

- [ ] **Step 4: Use it in `PipelineDetail.vue`**

Import `SampleGroupTable`.

Replace the large inline sample table with:

```vue
<SampleGroupTable
  :loading="loadingSamples"
  :rows="sampleRows"
  @change="saveSampleDict"
/>
```

Keep the "未指定数据路径" state in `PipelineDetail.vue`, because it depends on `pipeline.dataPath`.

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/components/SampleGroupTable.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts
git commit -m "refactor: extract pipeline sample group table"
```

---

### Task 7: Add Shared Step Result Panel

**Files:**
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.vue`
- Create: `apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`

- [ ] **Step 1: Write source test**

Create `StepResultPanel.source.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts --dom
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Create `StepResultPanel.vue`**

Interface:

```ts
const props = defineProps<{
  getChartUrl: (path: string) => string;
  logs: string[];
  selectedChartUrl?: string;
  step: StepConfig;
  stepLabel: string;
}>();

const emit = defineEmits<{
  openLogs: [];
  openPreview: [url: string];
}>();
```

Include local helpers moved from `PipelineDetail.vue` where possible:

- `STAT_LABELS`.
- `STAT_ORDER`.
- `getSortedStats`.
- `formatStatValue`.

Completed state:

- Metrics strip if stats exist.
- Chart preview list using `step.result.charts`.
- Table/file list using `step.result.tables`.

Running state:

- Spinner.
- Last 8 logs.
- "查看日志" button.

Error state:

- Error message from `step.result?.stats?.error` or `step.result?.error`.
- Last 8 logs.
- "查看完整日志".

- [ ] **Step 4: Integrate the panel for generic result states**

In `PipelineDetail.vue`, use `StepResultPanel` for the generic right-side result panel. Keep specialized annotation helpers in the left/step-specific content for this pass.

Use:

```vue
<StepResultPanel
  :get-chart-url="getChartUrl"
  :logs="currentStepLogs"
  :step="activeStep"
  :step-label="STEP_LABELS[activeStep.stepType] || activeStep.stepType"
  @open-logs="openLogDrawer"
  @open-preview="openLightbox"
/>
```

- [ ] **Step 5: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.vue apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue
git commit -m "feat: add pipeline step result panel"
```

---

### Task 8: Recompose Detail Page Into Two-column Workspace

**Files:**
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue`
- Modify: `apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts`

- [ ] **Step 1: Extend layout test**

Add:

```ts
it('uses a two-column current-step workspace', () => {
  expect(detailSource).toContain('step-workspace-grid');
  expect(detailSource).toContain('StepResultPanel');
  expect(detailSource).toContain('高级参数');
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
```

Expected: FAIL because the two-column marker class and advanced section are not present.

- [ ] **Step 3: Add advanced parameter grouping**

Keep the existing `advanced?: boolean` property. Update `stepParamConfigs.ts` to mark these as advanced:

- QC: `expected_doublet_rate`, `threshold`.
- Dim cluster: `target_sum`, `regress_out_mito`, `n_neighbors`, `umap_min_dist`.
- Marker: `marker_method`, `pct`.
- Sub annotation: `sub_n_neighbors`.

In `PipelineDetail.vue`, compute:

```ts
const basicParams = computed(() => currentStepParamConfigs.value.filter((cfg) => !cfg.advanced));
const advancedParams = computed(() => currentStepParamConfigs.value.filter((cfg) => cfg.advanced));
const showAdvancedParams = ref(false);
```

- [ ] **Step 4: Rebuild non-data-load workspace**

For normal steps, structure:

```vue
<div class="step-workspace-grid grid gap-5 xl:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
  <section class="rounded-xl border border-slate-200 bg-white">
    <!-- step summary, basic params, advanced params, run button -->
  </section>
  <StepResultPanel ... />
</div>
```

For data-load step, left column contains `SampleGroupTable`; right column uses `StepResultPanel`.

- [ ] **Step 5: Preserve existing specialized annotation controls**

Keep marker reference, auto-annotation, cluster mapping, and save h5ad behavior available in the left column for the annotation step. Do not delete existing helper logic; only move its template into the new left-column structure.

- [ ] **Step 6: Run tests and typecheck**

```bash
pnpm vitest run apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts --dom
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.vue apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts apps/web-antdv-next/src/views/biocloud/pipeline/types/stepParamConfigs.ts
git commit -m "feat: recompose pipeline detail workspace"
```

---

### Task 9: Backend UX Support

**Files:**
- Modify: `backend/app/pipeline/service/pipeline_service.py`
- Modify: `backend/app/pipeline/api/v1/pipeline.py`
- Modify: `backend/app/task/tasks/run_pipeline.py`

- [ ] **Step 1: Add service helpers in `pipeline_service.py`**

Add these helpers near `STEP_ORDER`:

```py
def get_step_output_dir_name(step_type: str, step_index: int) -> str:
    from backend.app.task.tasks.run_pipeline import STEP_OUTPUT_DIRS
    return STEP_OUTPUT_DIRS.get(step_type, f'step_{step_index}')


def get_pipeline_task_log_path(task_output_dir: str | None, user_id: int, pipeline_id: int, step_type: str, step_index: int) -> Path:
    out_dir_name = get_step_output_dir_name(step_type, step_index)
    if task_output_dir:
        return Path(task_output_dir) / out_dir_name / 'task.log'
    return MEDIAN_DIR / str(user_id) / 'pipelines' / str(pipeline_id) / out_dir_name / 'task.log'
```

- [ ] **Step 2: Add prerequisite check in `run_step`**

Before dispatching Celery:

```py
if step_index > 0:
    prev = next((s for s in steps if s.step_index == step_index - 1), None)
    if not prev or prev.status != 'completed':
        raise errors.RequestError(msg='请先完成上一步分析')
```

Also reject simultaneous runs:

```py
if any(s.status == 'running' for s in steps):
    raise errors.RequestError(msg='当前流程已有步骤正在运行')
```

- [ ] **Step 3: Use shared log path in API**

In `pipeline.py` logs endpoint:

- Remove local import of `STEP_OUTPUT_DIRS`.
- Use `pipeline_service.get_pipeline_task_log_path(...)`.
- Keep fallback to `execution.log`.

- [ ] **Step 4: Synchronize statuses in `run_pipeline.py`**

When a step starts, update Pipeline and AnalysisTask:

```py
db.execute(update(Pipeline).where(Pipeline.id == pipeline_id).values(status='running'))
if pipeline.analysis_task_id:
    db.execute(update(AnalysisTask).where(AnalysisTask.id == pipeline.analysis_task_id).values(status='running'))
```

When a step fails, update Pipeline:

```py
db.execute(update(Pipeline).where(Pipeline.id == pipeline_id).values(status='error'))
```

When a step completes, set Pipeline status:

```py
next_status = 'completed' if step_index >= len(STEP_SCRIPTS) - 1 else 'running'
db.execute(update(Pipeline).where(Pipeline.id == pipeline_id).values(current_step=step_index + 1, status=next_status))
if next_status == 'completed' and pipeline.analysis_task_id:
    db.execute(update(AnalysisTask).where(AnalysisTask.id == pipeline.analysis_task_id).values(status='completed', completed_at=datetime.now()))
```

- [ ] **Step 5: Run backend static check**

Run:

```bash
python -m compileall backend/app/pipeline backend/app/task/tasks/run_pipeline.py
```

from `/mnt/e/fba/backend/backend`.

Expected: compile succeeds with no syntax errors.

- [ ] **Step 6: Commit**

```bash
git add backend/app/pipeline/service/pipeline_service.py backend/app/pipeline/api/v1/pipeline.py backend/app/task/tasks/run_pipeline.py
git commit -m "fix: tighten pipeline execution status handling"
```

---

### Task 10: End-to-end Verification and Polish

**Files:**
- Modify only files touched by earlier tasks if verification finds issues.

- [ ] **Step 1: Run frontend targeted tests**

```bash
pnpm vitest run \
  apps/web-antdv-next/src/views/biocloud/pipeline/PipelineList.constants.test.ts \
  apps/web-antdv-next/src/views/biocloud/pipeline/PipelineCreate.source.test.ts \
  apps/web-antdv-next/src/views/biocloud/pipeline/PipelineDetail.layout.test.ts \
  apps/web-antdv-next/src/views/biocloud/pipeline/components/PipelineDataFolderSelector.source.test.ts \
  apps/web-antdv-next/src/views/biocloud/pipeline/components/StepResultPanel.source.test.ts \
  --dom
```

Expected: PASS.

- [ ] **Step 2: Run frontend typecheck**

```bash
pnpm -F @vben/web-antd run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

```bash
pnpm -F @vben/web-antd run build
```

Expected: PASS.

- [ ] **Step 4: Run backend compile check**

From `/mnt/e/fba/backend/backend`:

```bash
python -m compileall backend/app/pipeline backend/app/task/tasks/run_pipeline.py
```

Expected: PASS.

- [ ] **Step 5: Manual browser verification**

Start the frontend using the existing project command:

```bash
pnpm -F @vben/web-antd run dev
```

Check:

- `/pipeline` shows the redesigned entry page.
- "创建分析项目" routes to `/pipeline/create?type=scrna`.
- Create form validates project name, data path, and species.
- Successful create routes to `/pipeline/:id`.
- Detail page uses a top stepper.
- Step 1 shows sample grouping on the left and result state on the right.
- Running a step shows logs and running state.
- A completed step shows metrics and chart/table sections.

- [ ] **Step 6: Commit final polish**

If fixes were needed:

```bash
git add apps/web-antdv-next/src backend/app
git commit -m "chore: polish pipeline ux flow"
```

If no fixes were needed, do not create an empty commit.

---

## Self-review Notes

- Spec coverage: home page, create page, top stepper, two-column workspace, advanced parameter folding, result states, sample grouping stage, backend support, and testing are all covered.
- Scope: recent projects/running-task summaries are intentionally deferred, matching the design document's implementation decisions.
- Type consistency: route names, component names, and existing API names match current code.
