<script lang="ts" setup>
/**
 * StepNavigation - 紧凑步骤导航
 * 自定义列表式，带编号、状态图标和进度指示
 */
import type { StepState, StepType } from '../types/pipeline';

import { computed } from 'vue';

import { Icon } from '@iconify/vue';

import { STEP_DEFINITIONS } from '../mock/stepSchemas';
import { STEP_ORDER } from '../types/pipeline';

const props = defineProps<{
  currentStep: number;
  steps: StepState[];
}>();

const emit = defineEmits<{
  (e: 'select', stepType: StepType, index: number): void;
}>();

// 已完成步骤数
const completedCount = computed(() => {
  return props.steps.filter((s) => s.status === 'completed').length;
});

// 步骤数据
const stepsData = computed(() => {
  return STEP_ORDER.map((stepType, index) => {
    const def = STEP_DEFINITIONS[stepType];
    const step = props.steps[index];
    return {
      stepType,
      title: def.displayName,
      status: step?.status || 'pending',
      disabled: index > 0 && props.steps[index - 1]?.status !== 'completed',
    };
  });
});

const handleClick = (index: number) => {
  const stepData = stepsData.value[index];
  if (!stepData || stepData.disabled) return;
  emit('select', stepData.stepType, index);
};
</script>

<template>
  <div class="step-nav">
    <!-- 顶部进度 -->
    <div class="nav-header">
      <div class="nav-title">分析步骤</div>
      <div class="nav-progress">{{ completedCount }}/{{ steps.length }} 已完成</div>
    </div>

    <!-- 步骤列表 -->
    <div class="step-list">
      <div
        v-for="(step, index) in stepsData"
        :key="step.stepType"
        class="step-item"
        :class="{
          'is-active': index === currentStep,
          'is-completed': step.status === 'completed',
          'is-running': step.status === 'running',
          'is-error': step.status === 'error',
          'is-disabled': step.disabled,
        }"
        @click="handleClick(index)"
      >
        <!-- 状态图标 -->
        <div class="step-status-icon">
          <Icon
            v-if="step.status === 'completed'"
            icon="mdi:check-circle"
            class="icon-completed"
          />
          <Icon
            v-else-if="step.status === 'running'"
            icon="mdi:loading"
            class="icon-running"
          />
          <Icon
            v-else-if="step.status === 'error'"
            icon="mdi:alert-circle"
            class="icon-error"
          />
          <span v-else class="step-number">{{ index + 1 }}</span>
        </div>

        <!-- 步骤名称 -->
        <span class="step-title">{{ step.title }}</span>

        <!-- 当前步骤箭头 -->
        <Icon
          v-if="index === currentStep"
          icon="mdi:chevron-right"
          class="step-arrow"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-nav {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.nav-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.nav-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.nav-progress {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 12px;
  overflow-y: auto;
}

.step-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.step-item:hover:not(.is-disabled) {
  background: #f0f5ff;
}

.step-item.is-active {
  color: #1677ff;
  background: #e6f4ff;
}

.step-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

/* 状态图标 */
.step-status-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
}

.is-active .step-number {
  color: #1677ff;
  border-color: #1677ff;
}

.icon-completed {
  font-size: 22px;
  color: #52c41a;
}

.icon-running {
  font-size: 22px;
  color: #1677ff;
  animation: spin 1s linear infinite;
}

.icon-error {
  font-size: 22px;
  color: #ff4d4f;
}

/* 步骤名称 */
.step-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #595959;
}

.is-active .step-title {
  font-weight: 600;
  color: #1677ff;
}

.is-completed .step-title {
  color: #262626;
}

/* 箭头 */
.step-arrow {
  font-size: 18px;
  color: #1677ff;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
