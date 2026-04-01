<script lang="ts" setup>
/**
 * 单细胞分析流程详情页 - 卡片式界面
 */
import type { PipelineState, StepType } from './types/pipeline';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { Icon } from '@iconify/vue';
import { Button, message, Spin, Tag } from 'ant-design-vue';

import { getPipelineApi, runStepApi } from './api';
import PipelineWorkspace from './components/PipelineWorkspace.vue';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();

// 状态
const loading = ref(true);
const pipeline = ref<PipelineState | null>(null);

// 获取流程 ID
const pipelineId = computed(() => route.params.id as string);

// 加载流程数据
const fetchPipeline = async () => {
  loading.value = true;
  try {
    const res = await getPipelineApi(pipelineId.value);
    // 转换后端返回的数据格式
    pipeline.value = transformPipelineData(res);
    if (pipeline.value) {
      setTabTitle(pipeline.value.name);
    } else {
      message.error('流程不存在');
      router.push('/analysis/sc-pipeline');
    }
  } catch (error) {
    message.error('加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 转换后端数据格式为前端格式
const transformPipelineData = (data: any): PipelineState => {
  return {
    id: String(data.id),
    name: data.name,
    description: data.description,
    dataPath: data.data_path,
    species: data.species,
    currentStep: data.current_step,
    steps: (data.steps || []).map((step: any) => ({
      stepType: step.step_type as StepType,
      status: step.status,
      params: step.params || {},
      result: step.result_data,
      history: [],
    })),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

// 执行步骤
const handleRunStep = async (stepIndex: number, params: Record<string, unknown>) => {
  if (!pipeline.value) return;
  
  const step = pipeline.value.steps[stepIndex];
  if (!step) return;

  step.status = 'running';
  
  try {
    await runStepApi(pipelineId.value, stepIndex, params);
    message.success('步骤已开始执行');
    
    // 刷新状态
    setTimeout(fetchPipeline, 1000);
  } catch (error) {
    step.status = 'error';
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
  router.push('/analysis/sc-pipeline');
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
      fetchPipeline();
    }
  },
);

onMounted(fetchPipeline);
</script>

<template>
  <Page auto-content-height class="sc-pipeline-detail">
    <Spin :spinning="loading" class="full-spin">
      <template v-if="pipeline">
        <!-- Header -->
        <div class="page-header">
          <div class="header-left">
            <Button type="text" shape="circle" @click="goBack">
              <Icon icon="mdi:arrow-left" style="font-size: 20px" />
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
            <Button @click="fetchPipeline">
              <Icon icon="mdi:refresh" />
              刷新
            </Button>
          </div>
        </div>

        <!-- 卡片式流程工作区 -->
        <div class="workspace-container">
          <PipelineWorkspace
            :steps="pipeline.steps"
            :current-step="pipeline.currentStep"
            :is-multi-sample="(pipeline as any).isMultiSample"
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
}

.pipeline-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pipeline-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
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
}

.workspace-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
}
</style>
