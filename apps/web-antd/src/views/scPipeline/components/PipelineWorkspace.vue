<script lang="ts" setup>
/**
 * 单细胞分析流程工作区 - 卡片式界面
 * 10 个步骤以卡片形式展示，支持查看状态、配置参数、执行分析
 */
import type { StepState, StepType, StepStatus } from '../types/pipeline';

import { computed, ref } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  Progress,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { STEP_LABELS, STEP_ORDER, SKIPPABLE_STEPS } from '../types/pipeline';
import StepConfigPanel from './StepConfigPanel.vue';
import StepResultPanel from './StepResultPanel.vue';

// Props
const props = defineProps<{
  steps: StepState[];
  currentStep: number;
  isMultiSample?: boolean;
  loading?: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'run-step', stepIndex: number, params: Record<string, unknown>): void;
  (e: 'skip-step', stepIndex: number): void;
  (e: 'update-params', stepIndex: number, params: Record<string, unknown>): void;
}>();

// 当前打开的步骤详情
const activeStepIndex = ref<number | null>(null);
const drawerVisible = ref(false);
const drawerTab = ref<'config' | 'result'>('config');

// 步骤图标映射
const STEP_ICONS: Record<StepType, string> = {
  data_load: 'mdi:database-import',
  qc_filter: 'mdi:filter-check',
  normalize: 'mdi:chart-bell-curve',
  merge: 'mdi:merge',
  batch_correct: 'mdi:format-paint',
  dim_reduce: 'mdi:scatter-plot',
  annotation: 'mdi:tag-text',
  diff_expr: 'mdi:chart-box',
  enrichment: 'mdi:dna',
  advanced: 'mdi:chart-timeline-variant',
};

// 状态颜色映射
const STATUS_CONFIG: Record<StepStatus | 'skipped', { color: string; icon: string; text: string }> = {
  pending: { color: '#d9d9d9', icon: 'mdi:circle-outline', text: '待执行' },
  running: { color: '#1890ff', icon: 'mdi:loading', text: '执行中' },
  completed: { color: '#52c41a', icon: 'mdi:check-circle', text: '已完成' },
  error: { color: '#ff4d4f', icon: 'mdi:alert-circle', text: '失败' },
  skipped: { color: '#faad14', icon: 'mdi:skip-next-circle', text: '已跳过' },
};

// 计算进度
const progressPercent = computed(() => {
  const completed = props.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  return Math.round((completed / props.steps.length) * 100);
});

// 获取步骤状态配置
const getStepStatusConfig = (step: StepState) => {
  const status = step.status === 'pending' && isStepSkipped(step) ? 'skipped' : step.status;
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
};

// 判断步骤是否被跳过
const isStepSkipped = (step: StepState) => {
  if (!props.isMultiSample && SKIPPABLE_STEPS.includes(step.stepType)) {
    return step.status === 'pending';
  }
  return false;
};

// 判断步骤是否可执行
const canRunStep = (index: number) => {
  if (index === 0) return true;
  const prevStep = props.steps[index - 1];
  return prevStep?.status === 'completed' || isStepSkipped(prevStep);
};

// 判断步骤是否可跳过
const canSkipStep = (step: StepState) => {
  return SKIPPABLE_STEPS.includes(step.stepType) && step.status === 'pending';
};

// 打开步骤详情
const openStepDetail = (index: number, tab: 'config' | 'result' = 'config') => {
  activeStepIndex.value = index;
  drawerTab.value = tab;
  drawerVisible.value = true;
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
  activeStepIndex.value = null;
};

// 当前活动步骤
const activeStep = computed(() => {
  if (activeStepIndex.value === null) return null;
  return props.steps[activeStepIndex.value] || null;
});

// 执行步骤
const handleRunStep = (params: Record<string, unknown>) => {
  if (activeStepIndex.value !== null) {
    emit('run-step', activeStepIndex.value, params);
  }
};

// 跳过步骤
const handleSkipStep = (index: number) => {
  emit('skip-step', index);
};

// 更新参数
const handleUpdateParams = (params: Record<string, unknown>) => {
  if (activeStepIndex.value !== null) {
    emit('update-params', activeStepIndex.value, params);
  }
};
</script>

<template>
  <div class="pipeline-workspace">
    <!-- 进度概览 -->
    <div class="progress-header">
      <div class="progress-info">
        <span class="progress-label">分析进度</span>
        <Progress
          :percent="progressPercent"
          :stroke-color="{ '0%': '#108ee9', '100%': '#52c41a' }"
          :stroke-width="8"
          style="width: 200px"
        />
      </div>
      <div class="step-summary">
        <Tag color="success">
          {{ steps.filter(s => s.status === 'completed').length }} 已完成
        </Tag>
        <Tag v-if="steps.some(s => s.status === 'running')" color="processing">
          1 执行中
        </Tag>
        <Tag color="default">
          {{ steps.filter(s => s.status === 'pending').length }} 待执行
        </Tag>
      </div>
    </div>

    <!-- 步骤卡片网格 -->
    <Spin :spinning="loading">
      <div class="step-grid">
        <div
          v-for="(step, index) in steps"
          :key="step.stepType"
          class="step-card-wrapper"
        >
          <!-- 连接线 -->
          <div v-if="index > 0" class="connector-line" :class="{ completed: step.status === 'completed' }" />
          
          <Card 
            class="step-card"
            :class="{
              'is-active': index === currentStep,
              'is-completed': step.status === 'completed',
              'is-running': step.status === 'running',
              'is-error': step.status === 'error',
              'is-skipped': isStepSkipped(step),
            }"
            hoverable
            @click="openStepDetail(index)"
          >
            <!-- 步骤序号 -->
            <div class="step-number">
              <Badge
                :count="index + 1"
                :number-style="{
                  backgroundColor: getStepStatusConfig(step).color,
                  fontWeight: 600,
                }"
              />
            </div>

            <!-- 卡片内容 -->
            <div class="step-content">
              <div class="step-icon">
                <Icon :icon="STEP_ICONS[step.stepType]" />
              </div>
              <div class="step-info">
                <div class="step-name">{{ STEP_LABELS[step.stepType] }}</div>
                <div class="step-status">
                  <Icon 
                    :icon="getStepStatusConfig(step).icon" 
                    :class="{ spinning: step.status === 'running' }"
                  />
                  <span>{{ getStepStatusConfig(step).text }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="step-actions" @click.stop>
              <Space>
                <!-- 查看结果 -->
                <Tooltip v-if="step.status === 'completed'" title="查看结果">
                  <Button 
                    type="text" 
                    size="small"
                    @click.stop="openStepDetail(index, 'result')"
                  >
                    <Icon icon="mdi:chart-box" />
                  </Button>
                </Tooltip>

                <!-- 配置参数 -->
                <Tooltip title="配置参数">
                  <Button 
                    type="text" 
                    size="small"
                    @click.stop="openStepDetail(index, 'config')"
                  >
                    <Icon icon="mdi:cog" />
                  </Button>
                </Tooltip>

                <!-- 跳过 -->
                <Tooltip v-if="canSkipStep(step)" title="跳过此步骤">
                  <Button 
                    type="text" 
                    size="small"
                    @click.stop="handleSkipStep(index)"
                  >
                    <Icon icon="mdi:skip-next" />
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </Card>
        </div>
      </div>

      <Empty v-if="steps.length === 0" description="暂无步骤数据" />
    </Spin>

    <!-- 步骤详情抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      :title="activeStep ? STEP_LABELS[activeStep.stepType] : '步骤详情'"
      placement="right"
      :width="520"
      @close="closeDrawer"
    >
      <template v-if="activeStep">
        <div class="drawer-tabs">
          <Button 
            :type="drawerTab === 'config' ? 'primary' : 'default'"
            @click="drawerTab = 'config'"
          >
            <Icon icon="mdi:cog" />
            参数配置
          </Button>
          <Button 
            :type="drawerTab === 'result' ? 'primary' : 'default'"
            :disabled="activeStep.status !== 'completed'"
            @click="drawerTab = 'result'"
          >
            <Icon icon="mdi:chart-box" />
            分析结果
          </Button>
        </div>

        <!-- 参数配置 -->
        <div v-if="drawerTab === 'config'" class="drawer-content">
          <StepConfigPanel
            :step-type="activeStep.stepType"
            :params="activeStep.params"
            :status="activeStep.status"
            :disabled="activeStepIndex !== null && !canRunStep(activeStepIndex)"
            :history-count="0"
            :samples="[]"
            @update:params="handleUpdateParams"
            @run="handleRunStep"
          />
        </div>

        <!-- 分析结果 -->
        <div v-else class="drawer-content">
          <StepResultPanel
            :result="activeStep.result"
            :loading="activeStep.status === 'running'"
          />
        </div>
      </template>
    </Drawer>
  </div>
</template>

<style scoped>
.pipeline-workspace {
  padding: 16px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-label {
  font-size: 16px;
  font-weight: 600;
}

.progress-info :deep(.ant-progress-text) {
  color: white !important;
}

.step-summary {
  display: flex;
  gap: 8px;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  position: relative;
}

@media (max-width: 1400px) {
  .step-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1100px) {
  .step-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 800px) {
  .step-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.step-card-wrapper {
  position: relative;
}

.step-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  min-height: 140px;
}

.step-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.step-card.is-active {
  border-color: #1890ff;
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.1);
}

.step-card.is-completed {
  border-color: #52c41a;
  background: linear-gradient(135deg, #f6ffed 0%, #ffffff 100%);
}

.step-card.is-running {
  border-color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%);
}

.step-card.is-error {
  border-color: #ff4d4f;
  background: linear-gradient(135deg, #fff2f0 0%, #ffffff 100%);
}

.step-card.is-skipped {
  opacity: 0.6;
  border-style: dashed;
}

.step-number {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 1;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.step-icon {
  font-size: 32px;
  color: #1890ff;
}

.step-card.is-completed .step-icon {
  color: #52c41a;
}

.step-card.is-error .step-icon {
  color: #ff4d4f;
}

.step-info {
  text-align: center;
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.step-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.step-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.drawer-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.drawer-content {
  padding-top: 8px;
}

/* 连接线样式 */
.connector-line {
  position: absolute;
  top: 50%;
  left: -16px;
  width: 16px;
  height: 2px;
  background: #d9d9d9;
  transform: translateY(-50%);
}

.connector-line.completed {
  background: #52c41a;
}
</style>
