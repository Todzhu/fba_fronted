import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const detailSource = readFileSync(resolve(sourceDir, 'PipelineDetail.vue'), 'utf8');
const stepperSource = readFileSync(
  resolve(sourceDir, 'components/PipelineStepper.vue'),
  'utf8',
);

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

  it('renders the data-load sample table through a focused component', () => {
    expect(detailSource).toContain('SampleGroupTable');
    expect(detailSource).toContain('@change="saveSampleDict"');
  });

  it('renders the shared step result panel in the active step workspace', () => {
    expect(detailSource).toContain('StepResultPanel');
    expect(detailSource).toContain('@open-logs="openLogDrawer"');
    expect(detailSource).toContain('@open-preview="openLightbox"');
  });
});
