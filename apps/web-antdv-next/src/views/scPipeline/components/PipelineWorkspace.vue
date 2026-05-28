<script lang="ts" setup>
/**
 * 单细胞分析工作台
 */
import type { StepState, StepStatus } from '../types/pipeline';
import type { SampleInfo } from '../mock/myDataMock';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, Card, Drawer, Empty, Progress, Space, Spin, Tag, Tooltip } from 'antdv-next';

import { STEP_DEFINITIONS, getStepDefinition } from '../mock/stepSchemas';
import { STEP_LABELS } from '../types/pipeline';
import StepConfigPanel from './StepConfigPanel.vue';
import StepResultPanel from './StepResultPanel.vue';

const props = defineProps<{
  pipelineId?: string;
  steps: StepState[];
  currentStep: number;
  isMultiSample?: boolean;
  samples?: SampleInfo[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'run-step', stepIndex: number, params: Record<string, unknown>): void;
  (e: 'skip-step', stepIndex: number): void;
  (e: 'update-params', stepIndex: number, params: Record<string, unknown>): void;
}>();

const activeStepIndex = ref(0);
const hasInitializedActiveStep = ref(false);
const logDrawerOpen = ref(false);
const ACTIVE_STEP_STORAGE_PREFIX = 'sc-pipeline-active-step';

const STATUS_CONFIG: Record<StepStatus, { color: string; icon: string; text: string }> = {
  pending: { color: 'default', icon: 'mdi:circle-outline', text: '待执行' },
  running: { color: 'processing', icon: 'mdi:loading', text: '执行中' },
  completed: { color: 'success', icon: 'mdi:check-circle', text: '已完成' },
  error: { color: 'error', icon: 'mdi:alert-circle', text: '失败' },
  skipped: { color: 'warning', icon: 'mdi:skip-next-circle', text: '已跳过' },
};

const completedCount = computed(() => {
  return props.steps.filter((step) => step.status === 'completed' || step.status === 'skipped').length;
});

const progressPercent = computed(() => {
  if (props.steps.length === 0) return 0;
  return Math.round((completedCount.value / props.steps.length) * 100);
});

const activeStep = computed(() => props.steps[activeStepIndex.value] || null);

const activeDefinition = computed(() => {
  return activeStep.value ? getStepDefinition(activeStep.value.stepType) : null;
});

const activeStepLogs = computed(() => {
  const step = activeStep.value;
  if (!step) return [];
  const logs = step.result?.logs || [];
  if (logs.length > 0) return logs;
  if (step.errorMessage) return [`错误信息: ${step.errorMessage}`];
  if (step.result?.message) return [step.result.message];
  return ['暂无运行日志'];
});

const isStepAvailable = (index: number) => {
  if (index === 0) return true;
  const prevStep = props.steps[index - 1];
  return prevStep?.status === 'completed' || prevStep?.status === 'skipped';
};

const canRunActiveStep = computed(() => {
  const step = activeStep.value;
  if (!step) return false;
  return isStepAvailable(activeStepIndex.value) && step.status !== 'running';
});

const normalizeStepIndex = (index: number, stepCount = props.steps.length) => {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(index, 0), stepCount - 1);
};

const getActiveStepStorageKey = () => {
  return props.pipelineId ? `${ACTIVE_STEP_STORAGE_PREFIX}:${props.pipelineId}` : '';
};

const readStoredActiveStepIndex = (stepCount: number) => {
  const storageKey = getActiveStepStorageKey();
  if (!storageKey) return null;
  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (rawValue === null) return null;
    const index = Number.parseInt(rawValue, 10);
    return Number.isInteger(index) ? normalizeStepIndex(index, stepCount) : null;
  } catch {
    return null;
  }
};

const saveActiveStepIndex = () => {
  const storageKey = getActiveStepStorageKey();
  if (!storageKey || !hasInitializedActiveStep.value) return;
  try {
    window.sessionStorage.setItem(storageKey, String(activeStepIndex.value));
  } catch {
    // Session persistence is only a UI convenience; analysis state remains server-driven.
  }
};

const getFallbackActiveStepIndex = (stepCount: number, currentStep: number) => {
  const normalizedCurrentStep = normalizeStepIndex(currentStep, stepCount);
  const previousStep = props.steps[normalizedCurrentStep - 1];
  const currentStepState = props.steps[normalizedCurrentStep];

  if (
    normalizedCurrentStep > 0
    && currentStepState?.status === 'pending'
    && (previousStep?.status === 'completed' || previousStep?.status === 'skipped')
  ) {
    return normalizedCurrentStep - 1;
  }

  return normalizedCurrentStep;
};

const selectStep = (index: number) => {
  if (!props.steps[index]) return;
  activeStepIndex.value = index;
  saveActiveStepIndex();
};

const handleRunStep = () => {
  const step = activeStep.value;
  if (!step) return;
  emit('run-step', activeStepIndex.value, { ...step.params });
};

const handleRunStepWithParams = (params?: Record<string, unknown>) => {
  const step = activeStep.value;
  if (!step) return;
  emit('run-step', activeStepIndex.value, { ...step.params, ...(params || {}) });
};

const openLogDrawer = () => {
  logDrawerOpen.value = true;
};

const handleUpdateParams = (params: Record<string, unknown>) => {
  emit('update-params', activeStepIndex.value, params);
};

const activeSamples = computed(() => {
  const paramSamples = activeStep.value?.params?.samples;
  return Array.isArray(paramSamples) ? (paramSamples as SampleInfo[]) : props.samples || [];
});

const handleUpdateSamples = (samples: SampleInfo[]) => {
  const enabledSamples = samples
    .filter((sample) => sample.enabled)
    .map((sample) => ({
      sample: sample.sampleName || sample.folderName,
      group: sample.group || sample.sampleName || sample.folderName,
    }));
  emit('update-params', activeStepIndex.value, {
    ...(activeStep.value?.params || {}),
    samples,
    sample_groups: enabledSamples,
  });
};

watch(
  () => [props.steps.length, props.currentStep] as const,
  ([stepCount, step]) => {
    if (hasInitializedActiveStep.value || stepCount === 0) return;
    activeStepIndex.value = readStoredActiveStepIndex(stepCount) ?? getFallbackActiveStepIndex(stepCount, step);
    hasInitializedActiveStep.value = true;
    saveActiveStepIndex();
  },
  { immediate: true },
);

watch(activeStepIndex, saveActiveStepIndex);
</script>

<template>
  <div class="pipeline-workspace">
    <Spin :spinning="loading">
      <template v-if="steps.length > 0">
        <div class="workflow-header">
          <div class="workflow-title">
            <Icon icon="mdi:timeline-check-outline" />
            <div>
              <div class="workflow-title-text">单细胞分析流程</div>
              <div class="workflow-subtitle">
                逐步完成数据导入、质控、过滤、聚类、注释和报告生成
              </div>
            </div>
          </div>
          <div class="workflow-progress">
            <Progress
              :percent="progressPercent"
              :stroke-width="8"
              :stroke-color="{ '0%': '#1890ff', '100%': '#52c41a' }"
              style="width: 220px"
            />
            <Tag color="success">{{ completedCount }}/{{ steps.length }} 已完成</Tag>
          </div>
        </div>

        <div class="workbench-layout">
          <aside class="step-sidebar">
            <div
              v-for="(step, index) in steps"
              :key="`${step.stepType}-${index}`"
              class="step-row"
              :class="{
                active: index === activeStepIndex,
                disabled: !isStepAvailable(index),
                completed: step.status === 'completed',
                running: step.status === 'running',
                error: step.status === 'error',
              }"
              @click="selectStep(index)"
            >
              <div class="step-index">{{ index + 1 }}</div>
              <div class="step-body">
                <div class="step-name">
                  <Icon :icon="STEP_DEFINITIONS[step.stepType]?.icon || 'mdi:cog'" />
                  <span>{{ STEP_LABELS[step.stepType] || step.stepType }}</span>
                </div>
                <div class="step-desc">
                  {{ STEP_DEFINITIONS[step.stepType]?.description || '等待配置分析参数' }}
                </div>
              </div>
              <Tag :color="STATUS_CONFIG[step.status]?.color || 'default'" class="step-status">
                <Icon
                  :icon="STATUS_CONFIG[step.status]?.icon || 'mdi:circle-outline'"
                  :class="{ spinning: step.status === 'running' }"
                />
                {{ STATUS_CONFIG[step.status]?.text || step.status }}
              </Tag>
            </div>
          </aside>

          <main v-if="activeStep && activeDefinition" class="step-main">
            <Card class="config-card" :bordered="false">
              <template #title>
                <div class="panel-title">
                  <Icon :icon="activeDefinition.icon" />
                  <span>{{ activeDefinition.displayName }}</span>
                  <Tag :color="STATUS_CONFIG[activeStep.status]?.color || 'default'" class="title-status">
                    <Icon
                      :icon="STATUS_CONFIG[activeStep.status]?.icon || 'mdi:circle-outline'"
                      :class="{ spinning: activeStep.status === 'running' }"
                    />
                    {{ STATUS_CONFIG[activeStep.status]?.text || activeStep.status }}
                  </Tag>
                </div>
              </template>
              <template #extra>
                <Space>
                  <Tooltip v-if="!canRunActiveStep" title="请先完成前置步骤">
                    <Button disabled>
                      <Icon icon="mdi:play" />
                      执行
                    </Button>
                  </Tooltip>
                  <Button
                    v-else
                    type="primary"
                    :loading="activeStep.status === 'running'"
                    @click="handleRunStep"
                  >
                    <Icon icon="mdi:play" />
                    {{ activeStep.status === 'completed' ? '重新执行' : '执行当前步骤' }}
                  </Button>
                </Space>
              </template>
              <StepConfigPanel
                :step-type="activeStep.stepType"
                :params="activeStep.params"
                :status="activeStep.status"
                :result="activeStep.result"
                :disabled="!canRunActiveStep"
                :history-count="activeStep.history.length"
                :samples="activeSamples"
                @update:params="handleUpdateParams"
                @update:samples="handleUpdateSamples"
                @run="handleRunStepWithParams"
              />
            </Card>

            <Card class="result-card" :bordered="false">
              <template #title>
                <div class="panel-title">
                  <Icon icon="mdi:chart-box-outline" />
                  <span>分析结果</span>
                </div>
              </template>
              <template #extra>
                <Button @click="openLogDrawer">
                  <Icon icon="mdi:text-box-search-outline" />
                  日志
                </Button>
              </template>
              <StepResultPanel
                :result="activeStep.result"
                :step-type="activeStep.stepType"
                :loading="activeStep.status === 'running'"
                :logs="activeStep.status === 'running' || activeStep.status === 'error' || activeStep.result?.logs?.length ? activeStepLogs : []"
              />
            </Card>
          </main>
        </div>

        <Drawer
          v-model:open="logDrawerOpen"
          title="运行日志"
          placement="right"
          :width="520"
        >
          <div v-if="activeStep" class="log-drawer">
            <div class="log-meta">
              <Tag :color="STATUS_CONFIG[activeStep.status]?.color || 'default'">
                {{ STATUS_CONFIG[activeStep.status]?.text || activeStep.status }}
              </Tag>
              <span>{{ STEP_LABELS[activeStep.stepType] || activeStep.stepType }}</span>
            </div>
            <pre class="log-content">{{ activeStepLogs.join('\n') }}</pre>
          </div>
        </Drawer>
      </template>

      <Empty v-else description="暂无步骤数据" />
    </Spin>
  </div>
</template>

<style scoped>
.pipeline-workspace {
  height: 100%;
  padding: 16px;
}

:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  height: 100%;
}

.workflow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.workflow-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-drawer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #595959;
}

.log-content {
  min-height: 360px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  color: #262626;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.workflow-title > svg,
.workflow-title :deep(svg) {
  font-size: 24px;
  color: #1890ff;
}

.workflow-title-text {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.workflow-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #8c8c8c;
}

.workflow-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workbench-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.step-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.step-row:hover {
  border-color: #91caff;
}

.step-row.active {
  background: #f0f7ff;
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.12);
}

.step-row.disabled {
  cursor: pointer;
  opacity: 0.62;
}

.step-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
  background: #e6f4ff;
  border-radius: 50%;
}

.step-row.completed .step-index {
  color: #fff;
  background: #52c41a;
}

.step-row.running .step-index {
  color: #fff;
  background: #1890ff;
}

.step-row.error .step-index {
  color: #fff;
  background: #ff4d4f;
}

.step-body {
  min-width: 0;
}

.step-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.step-name :deep(svg) {
  color: #1890ff;
}

.step-desc {
  margin-top: 3px;
  overflow: hidden;
  font-size: 12px;
  color: #8c8c8c;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-end: 0;
}

.step-main {
  display: grid;
  grid-template-columns: minmax(380px, 420px) minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.config-card,
.result-card {
  min-width: 0;
  border-radius: 8px;
}

.config-card :deep(.ant-card-head) {
  min-height: 58px;
  background: #fbfdff;
  border-bottom-color: #edf1f7;
}

.config-card :deep(.ant-card-body) {
  padding: 14px;
  background: #fff;
}

.result-card :deep(.ant-card-body) {
  padding-top: 4px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.panel-title :deep(svg) {
  color: #1890ff;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1280px) {
  .workbench-layout {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .step-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .workflow-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workbench-layout {
    grid-template-columns: 1fr;
  }
}
</style>
