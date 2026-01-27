<script lang="ts" setup>
/**
 * StepConfigPanel - 步骤参数配置面板
 * 封装 DynamicForm，根据当前步骤加载对应 Schema
 * 对于数据读取步骤，显示样本信息表格
 */
import type { ParamSchema, StepStatus, StepType } from '../types/pipeline';
import type { SampleInfo } from '../mock/myDataMock';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, message, Space, Spin, Tag } from 'ant-design-vue';

import DynamicForm from '../../cloudTools/components/DynamicForm.vue';
import { STEP_DEFINITIONS } from '../mock/stepSchemas';
import SampleTableEditor from './SampleTableEditor.vue';

const props = defineProps<{
  stepType: StepType;
  params: Record<string, unknown>;
  status: StepStatus;
  disabled?: boolean;
  historyCount?: number;
  samples?: SampleInfo[];  // 样本列表（仅数据读取步骤使用）
}>();

const emit = defineEmits<{
  (e: 'update:params', params: Record<string, unknown>): void;
  (e: 'update:samples', samples: SampleInfo[]): void;
  (e: 'run'): void;
  (e: 'show-history'): void;
}>();

// 是否为数据读取步骤
const isDataLoadStep = computed(() => props.stepType === 'data_load');

// 当前步骤定义
const stepDef = computed(() => STEP_DEFINITIONS[props.stepType]);

// 参数 Schema
const paramSchema = computed<ParamSchema | null>(() => {
  return stepDef.value?.paramSchema || null;
});

// 本地参数副本
const localParams = ref<Record<string, unknown>>({});

// 本地样本副本
const localSamples = ref<SampleInfo[]>([]);

// 同步外部参数
watch(
  () => props.params,
  (newParams) => {
    localParams.value = { ...newParams };
  },
  { immediate: true, deep: true },
);

// 同步外部样本
watch(
  () => props.samples,
  (newSamples) => {
    localSamples.value = newSamples ? [...newSamples] : [];
  },
  { immediate: true, deep: true },
);

// 参数变更
const handleParamsChange = (params: Record<string, unknown>) => {
  localParams.value = params;
  emit('update:params', params);
};

// 样本变更
const handleSamplesChange = (samples: SampleInfo[]) => {
  localSamples.value = samples;
  emit('update:samples', samples);
};

// 重置参数
const handleReset = () => {
  if (!paramSchema.value?.properties) return;

  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(paramSchema.value.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  localParams.value = defaults;
  emit('update:params', defaults);
  message.success('参数已重置');
};

// 执行步骤
const handleRun = () => {
  emit('run');
};

// 状态标签
const statusConfig = computed(() => {
  const configs: Record<StepStatus, { color: string; text: string; icon: string }> = {
    pending: { color: 'default', text: '待执行', icon: 'mdi:clock-outline' },
    running: { color: 'processing', text: '运行中', icon: 'mdi:loading' },
    completed: { color: 'success', text: '已完成', icon: 'mdi:check-circle' },
    error: { color: 'error', text: '执行失败', icon: 'mdi:alert-circle' },
  };
  return configs[props.status];
});
</script>

<template>
  <div class="step-config-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <Icon :icon="stepDef?.icon || 'mdi:cog'" class="step-icon" />
        <span class="step-title">{{ stepDef?.displayName || '参数配置' }}</span>
        <Tag :color="statusConfig.color">
          <Icon
            :icon="statusConfig.icon"
            :class="{ spinning: status === 'running' }"
          />
          {{ statusConfig.text }}
        </Tag>
      </div>
      <div class="header-right">
        <Button
          v-if="historyCount && historyCount > 0"
          type="link"
          size="small"
          @click="$emit('show-history')"
        >
          <Icon icon="mdi:history" />
          历史 ({{ historyCount }})
        </Button>
      </div>
    </div>

    <!-- Description -->
    <p class="step-description">{{ stepDef?.description }}</p>

    <!-- Loading State -->
    <Spin v-if="status === 'running'" class="running-spin">
      <template #tip>正在执行分析...</template>
    </Spin>

    <!-- Form -->
    <div v-else class="form-container">
      <!-- 数据读取步骤：显示样本表格 -->
      <template v-if="isDataLoadStep">
        <SampleTableEditor
          :model-value="localSamples"
          @update:model-value="handleSamplesChange"
        />
      </template>

      <!-- 其他步骤：显示 DynamicForm -->
      <template v-else>
        <DynamicForm
          v-if="paramSchema"
          :model-value="localParams"
          :schema="paramSchema as any"
          :show-actions="false"
          @update:model-value="handleParamsChange"
          @reset="handleReset"
        />
      </template>

      <!-- Actions -->
      <div class="action-bar">
        <Space>
          <Button v-if="!isDataLoadStep" @click="handleReset">
            <Icon icon="mdi:refresh" />
            重置
          </Button>
          <Button
            type="primary"
            :disabled="disabled || status === 'running'"
            :loading="status === 'running'"
            @click="handleRun"
          >
            <Icon icon="mdi:play" />
            {{ status === 'completed' ? '重新执行' : '执行' }}
          </Button>
        </Space>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-icon {
  font-size: 20px;
  color: #1890ff;
}

.step-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.step-description {
  margin-bottom: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.form-container {
  flex: 1;
  overflow-y: auto;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.running-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
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
</style>
