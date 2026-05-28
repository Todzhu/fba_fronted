<script lang="ts" setup>
/**
 * 单细胞分析流程详情页 - 卡片式界面
 */
import type { PipelineState, StepType } from './types/pipeline';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { Icon } from '@iconify/vue';
import { Button, message, Select, Spin, Tag } from 'antdv-next';

import { getPipelineApi, listPipelinesApi, runStepApi } from './api';
import PipelineWorkspace from './components/PipelineWorkspace.vue';
import { getStepSchema } from './mock/stepSchemas';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();
const PIPELINE_LIST_PATH = '/sc-pipeline';

// 状态
const loading = ref(true);
const pipeline = ref<PipelineState | null>(null);
const pipelineOptions = ref<Array<{ label: string; value: string }>>([]);
let statusPollTimer: ReturnType<typeof window.setInterval> | null = null;
const STATUS_POLL_INTERVAL = 3000;

// 获取流程 ID
const pipelineId = computed(() => route.params.id as string);

const openPipelineWorkspace = (id: number | string) => {
  const nextId = String(id);
  router.push({
    name: 'ScPipelineDetail',
    params: { id: nextId },
    query: { pageKey: `sc-pipeline-${nextId}` },
  });
};

const hasRunningStep = (state: PipelineState | null) => {
  if (!state) return false;
  return state.status === 'running' || state.steps.some((step) => step.status === 'running');
};

const stopStatusPolling = () => {
  if (statusPollTimer) {
    window.clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
};

const startStatusPolling = () => {
  if (statusPollTimer) return;
  statusPollTimer = window.setInterval(() => {
    if (!hasRunningStep(pipeline.value)) {
      stopStatusPolling();
      return;
    }
    fetchPipeline(true);
  }, STATUS_POLL_INTERVAL);
};

const syncStatusPolling = () => {
  if (hasRunningStep(pipeline.value)) {
    startStatusPolling();
  } else {
    stopStatusPolling();
  }
};

// 加载流程数据
const fetchPipeline = async (silent = false) => {
  if (!silent) {
    loading.value = true;
  }
  try {
    const res = await getPipelineApi(pipelineId.value);
    // 转换后端返回的数据格式
    pipeline.value = transformPipelineData(res);
    if (pipeline.value) {
      setTabTitle(`${pipeline.value.name} - 分析流程`);
      syncStatusPolling();
    } else {
      message.error('流程不存在');
      router.push(PIPELINE_LIST_PATH);
    }
  } catch (error) {
    if (!silent) {
      message.error('加载失败');
    }
    console.error(error);
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
};

const fetchPipelineOptions = async () => {
  try {
    const list = await listPipelinesApi();
    pipelineOptions.value = (list || []).map((item: any) => ({
      label: item.name || `分析项目 ${item.id}`,
      value: String(item.id),
    }));
  } catch (error) {
    console.error(error);
  }
};

// 转换后端数据格式为前端格式
const transformPipelineData = (data: any): PipelineState => {
  const metadata = data.metadata_json || data.metadata || {};
  const samples = (metadata.samples || []).map((sample: any) => {
    const sampleName = sample.sample || sample.sampleName || sample.name || sample.folderName;
    return {
      folderName: sample.folderName || sample.sample || sampleName,
      sampleName,
      group: sample.group || sampleName,
      enabled: sample.enabled !== false && sample.valid !== false,
    };
  });

  return {
    id: String(data.id),
    name: data.name,
    description: data.description,
    dataPath: data.data_path,
    species: data.species,
    metadata,
    samples,
    currentStep: data.current_step,
    status: data.status,
    isMultiSample: data.is_multi_sample,
    steps: (data.steps || []).map((step: any) => ({
      stepType: step.step_type as StepType,
      status: step.status,
      params: { ...getDefaultParams(step.step_type as StepType), ...(step.params || {}) },
      result: step.result_data,
      errorMessage: step.error_message,
      history: [],
    })),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

const getDefaultParams = (stepType: StepType) => {
  const schema = getStepSchema(stepType);
  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties || {})) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  return defaults;
};

// 执行步骤
const handleRunStep = async (stepIndex: number, params: Record<string, unknown>) => {
  if (!pipeline.value) return;
  
  const step = pipeline.value.steps[stepIndex];
  if (!step) return;

  const submittedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  step.status = 'running';
  step.result = {
    ...(step.result || {}),
    logs: [
      `[${submittedAt}] 步骤已提交，等待 worker 执行...`,
    ],
  };
  startStatusPolling();
  
  try {
    await runStepApi(pipelineId.value, stepIndex, params);
    message.success('步骤已提交执行');
    
    // 刷新状态
    fetchPipeline(true);
  } catch (error) {
    step.status = 'error';
    stopStatusPolling();
    message.error('执行失败');
  }
};

// 跳过步骤
const handleSkipStep = async (stepIndex: number) => {
  if (!pipeline.value) return;
  
  const step = pipeline.value.steps[stepIndex];
  if (step) {
    step.status = 'completed'; // 临时标记为完成（跳过）
    message.info('已跳过此步骤');
  }
};

// 更新参数
const handleUpdateParams = (stepIndex: number, params: Record<string, unknown>) => {
  if (!pipeline.value) return;
  
  const step = pipeline.value.steps[stepIndex];
  if (step) {
    step.params = { ...step.params, ...params };
  }
};

// 返回列表
const goBack = () => {
  router.push(PIPELINE_LIST_PATH);
};

const handleSwitchPipeline = (id?: string) => {
  if (!id || id === pipelineId.value) return;
  openPipelineWorkspace(id);
};

// 获取状态标签颜色
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    created: 'default',
    running: 'processing',
    paused: 'warning',
    completed: 'success',
  };
  return colors[status] || 'default';
};

// 监听路由变化
watch(
  () => route.params.id,
  () => {
    if (route.params.id) {
      stopStatusPolling();
      fetchPipeline();
    }
  },
);

onMounted(() => {
  fetchPipeline();
  fetchPipelineOptions();
});

onUnmounted(() => {
  stopStatusPolling();
});
</script>

<template>
  <Page auto-content-height class="sc-pipeline-detail">
    <Spin :spinning="loading" class="full-spin">
      <template v-if="pipeline">
        <!-- Header -->
        <div class="page-header">
          <div class="header-left">
            <Button @click="goBack">
              <Icon icon="mdi:arrow-left" />
              项目列表
            </Button>
            <div class="pipeline-info">
              <h1 class="pipeline-name">
                <Icon icon="mdi:dna" class="name-icon" />
                {{ pipeline.name }}
              </h1>
              <div class="pipeline-meta">
                <Tag :color="getStatusColor(pipeline.status || 'created')">
                  {{ pipeline.status || 'created' }}
                </Tag>
                <span class="meta-item">
                  <Icon icon="mdi:calendar" />
                  {{ new Date(pipeline.createdAt).toLocaleDateString('zh-CN') }}
                </span>
                <span v-if="pipeline.species" class="meta-item">
                  <Icon icon="mdi:flask" />
                  {{ pipeline.species }}
                </span>
              </div>
            </div>
          </div>
          <div class="header-right">
            <Select
              class="project-switch"
              :value="pipelineId"
              :options="pipelineOptions"
              show-search
              option-filter-prop="label"
              placeholder="切换分析项目"
              @change="handleSwitchPipeline"
            />
            <Button @click="fetchPipeline">
              <Icon icon="mdi:refresh" />
              刷新
            </Button>
          </div>
        </div>

        <!-- 卡片式流程工作区 -->
        <div class="workspace-container">
          <PipelineWorkspace
            :key="pipeline.id"
            :steps="pipeline.steps"
            :current-step="pipeline.currentStep"
            :is-multi-sample="(pipeline as any).isMultiSample"
            :samples="pipeline.samples || []"
            :loading="loading"
            @run-step="handleRunStep"
            @skip-step="handleSkipStep"
            @update-params="handleUpdateParams"
          />
        </div>
      </template>
    </Spin>
  </Page>
</template>

<style scoped>
.sc-pipeline-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f0f5ff 100%);
}

.full-spin {
  height: 100%;
}

:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.pipeline-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.pipeline-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  overflow: hidden;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-icon {
  color: #1890ff;
}

.pipeline-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8c8c8c;
}

.header-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: none;
}

.project-switch {
  width: 260px;
}

.workspace-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

@media (max-width: 900px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    padding: 12px;
  }

  .header-left,
  .header-right {
    width: 100%;
  }

  .project-switch {
    flex: 1;
    width: auto;
  }
}
</style>
