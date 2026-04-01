<script lang="ts" setup>
/**
 * StepNavigation - 步骤导航组件
 * 基于 Ant Design Steps 实现流程步骤导航
 */
import type { StepState, StepType } from '../types/pipeline';

import { computed } from 'vue';

import { Icon } from '@iconify/vue';
import { Steps } from 'ant-design-vue';

import { STEP_DEFINITIONS } from '../mock/stepSchemas';
import { STEP_ORDER } from '../types/pipeline';

const props = defineProps<{
  steps: StepState[];
  currentStep: number;
}>();

const emit = defineEmits<{
  (e: 'select', stepType: StepType, index: number): void;
}>();

// 步骤状态映射到 Ant Design Steps 状态
const getStepStatus = (step: StepState, index: number) => {
  if (step.status === 'error') return 'error';
  if (step.status === 'running') return 'process';
  if (step.status === 'completed') return 'finish';
  // pending 状态：如果是当前步骤则 process，否则 wait
  return index === props.currentStep ? 'process' : 'wait';
};

// 步骤数据
const stepsData = computed(() => {
  return STEP_ORDER.map((stepType, index) => {
    const def = STEP_DEFINITIONS[stepType];
    const step = props.steps[index];
    return {
      stepType,
      title: def.displayName,
      description: def.description,
      icon: def.icon,
      status: step ? getStepStatus(step, index) : 'wait',
      disabled: index > 0 && props.steps[index - 1]?.status !== 'completed',
    };
  });
});

// 点击步骤
const handleClick = (index: number) => {
  const stepData = stepsData.value[index];
  if (!stepData || stepData.disabled) return;
  emit('select', stepData.stepType, index);
};
</script>

<template>
  <div class="step-navigation">
    <Steps
      :current="currentStep"
      direction="vertical"
      size="small"
    >
      <Steps.Step
        v-for="(step, index) in stepsData"
        :key="step.stepType"
        :status="step.status"
        :title="step.title"
        :description="step.description"
        :disabled="step.disabled"
        class="step-item"
        @click="handleClick(index)"
      >
        <template #icon>
          <div
            class="step-icon"
            :class="{
              'is-active': index === currentStep,
              'is-completed': step.status === 'finish',
              'is-disabled': step.disabled,
            }"
          >
            <Icon :icon="step.icon" />
          </div>
        </template>
      </Steps.Step>
    </Steps>
  </div>
</template>

<style scoped>
.step-navigation {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.step-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-item:hover:not([disabled]) {
  background: rgba(24, 144, 255, 0.04);
  border-radius: 8px;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f5ff;
  color: #1890ff;
  font-size: 16px;
  transition: all 0.3s ease;
}

.step-icon.is-active {
  background: #1890ff;
  color: white;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.4);
}

.step-icon.is-completed {
  background: #52c41a;
  color: white;
}

.step-icon.is-disabled {
  background: #f5f5f5;
  color: #bfbfbf;
  cursor: not-allowed;
}

:deep(.ant-steps-item-title) {
  font-weight: 500;
}

:deep(.ant-steps-item-description) {
  font-size: 12px;
  color: #8c8c8c;
}

:deep(.ant-steps-item-finish .ant-steps-item-title) {
  color: #52c41a;
}

:deep(.ant-steps-item-process .ant-steps-item-title) {
  color: #1890ff;
  font-weight: 600;
}
</style>
