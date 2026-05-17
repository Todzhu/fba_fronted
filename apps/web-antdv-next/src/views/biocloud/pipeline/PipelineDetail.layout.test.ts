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
});
