<script lang="ts" setup>
import type { SampleInfo } from './mock/myDataMock';
/**
 * 单细胞分析流程详情页
 * 左侧步骤导航 + 右侧卡片式垂直滚动内容
 */
import type { PipelineState, StepType } from './types/pipeline';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { Icon } from '@iconify/vue';
import { Button, Drawer, message, Spin, Timeline } from 'ant-design-vue';

import DynamicForm from '../cloudTools/components/DynamicForm.vue';
import SampleTableEditor from './components/SampleTableEditor.vue';
import StepNavigation from './components/StepNavigation.vue';
import StepResultPanel from './components/StepResultPanel.vue';
import {
  getPipeline,
  getStepHistory,
  runStep,
  updateStepParams,
} from './mock/mockApi';
import { STEP_DEFINITIONS } from './mock/stepSchemas';
import { getSamplesInFolder } from './mock/myDataMock';
import { STEP_ORDER } from './types/pipeline';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();

// 状态
const loading = ref(true);
const pipeline = ref<null | PipelineState>(null);
const selectedStepIndex = ref(0);
const samples = ref<SampleInfo[]>([]);

// 获取流程 ID
const pipelineId = computed(() => route.params.id as string);

// 当前选中的步骤
const selectedStep = computed(() => {
  if (!pipeline.value) return null;
  return pipeline.value.steps[selectedStepIndex.value] || null;
});

// 当前步骤类型
const selectedStepType = computed<StepType>(() => {
  return selectedStep.value?.stepType || STEP_ORDER[0];
});

// 当前步骤定义
const stepDef = computed(() => STEP_DEFINITIONS[selectedStepType.value]);

// 是否为数据读取步骤
const isDataLoadStep = computed(() => selectedStepType.value === 'data_load');

// 参数 Schema
const paramSchema = computed(() => stepDef.value?.paramSchema || null);

// 本地参数副本
const localParams = ref<Record<string, unknown>>({});

// 同步参数
watch(
  () => selectedStep.value?.params,
  (newParams) => {
    if (newParams) {
      localParams.value = { ...newParams };
    }
  },
  { immediate: true, deep: true },
);

// 加载流程数据
const fetchPipeline = async () => {
  loading.value = true;
  try {
    pipeline.value = await getPipeline(pipelineId.value);
    if (pipeline.value) {
      setTabTitle(pipeline.value.name);
      selectedStepIndex.value = Math.min(
        pipeline.value.currentStep,
        pipeline.value.steps.length - 1,
      );
      await loadSamples();
    } else {
      message.error('流程不存在');
      router.push('/analysis/sc-pipeline');
    }
  } catch {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 加载样本数据
const loadSamples = async () => {
  if (!pipeline.value) return;
  const metadata = (pipeline.value as any).metadata;
  if (metadata?.dataPath) {
    try {
      samples.value = await getSamplesInFolder(metadata.dataPath);
    } catch (error) {
      console.warn('加载样本失败:', error);
      samples.value = [];
    }
  }
};

// 切换步骤
const handleSelectStep = (_stepType: StepType, index: number) => {
  selectedStepIndex.value = index;
};

// 参数变更
const handleParamsChange = (params: Record<string, unknown>) => {
  localParams.value = params;
  if (pipeline.value && selectedStep.value) {
    updateStepParams(pipelineId.value, selectedStepType.value, params);
    selectedStep.value.params = { ...selectedStep.value.params, ...params };
  }
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
  handleParamsChange(defaults);
  message.success('参数已重置');
};

// 更新样本数据
const handleUpdateSamples = (newSamples: SampleInfo[]) => {
  samples.value = newSamples;
};

// 执行步骤
const handleRunStep = async () => {
  if (!pipeline.value || !selectedStep.value) return;

  const step = selectedStep.value;
  step.status = 'running';

  try {
    const response = await runStep(
      pipelineId.value,
      selectedStepType.value,
      step.params,
    );

    if (response.success && response.result) {
      step.status = 'completed';
      step.result = response.result;
      message.success(response.result.message || '执行成功');
      await fetchPipeline();
    } else {
      step.status = 'error';
      message.error(response.error || '执行失败');
    }
  } catch {
    step.status = 'error';
    message.error('执行出错');
  }
};

// 是否可以执行
const canRun = computed(() => {
  if (!pipeline.value || !selectedStep.value) return false;
  if (selectedStep.value.status === 'running') return false;
  // 前置步骤需要完成
  if (selectedStepIndex.value > 0) {
    const prevStep = pipeline.value.steps[selectedStepIndex.value - 1];
    if (prevStep?.status !== 'completed') return false;
  }
  return true;
});

// ========== 历史记录抽屉 ==========
const historyDrawerVisible = ref(false);
const historyLoading = ref(false);
const historyList = ref<any[]>([]);

const showHistory = async () => {
  historyDrawerVisible.value = true;
  historyLoading.value = true;
  try {
    historyList.value = await getStepHistory(
      pipelineId.value,
      selectedStepType.value,
    );
  } catch {
    message.error('加载历史失败');
  } finally {
    historyLoading.value = false;
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN');
};

// 返回列表
const goBack = () => {
  router.push('/analysis/sc-pipeline');
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
        <!-- Main Content: 两栏布局 -->
        <div class="main-layout">
          <!-- Left: Step Navigation -->
          <div class="left-panel">
            <StepNavigation
              :steps="pipeline.steps"
              :current-step="selectedStepIndex"
              @select="handleSelectStep"
            />
          </div>

          <!-- Right: Content Area -->
          <div class="content-panel">
            <!-- 步骤标题栏 -->
            <div class="step-header">
              <div class="step-header-left">
                <div class="step-icon-wrap">
                  <Icon :icon="stepDef?.icon || 'mdi:cog'" />
                </div>
                <div class="step-info">
                  <h2 class="step-name">{{ stepDef?.displayName || '参数配置' }}</h2>
                  <p class="step-desc">{{ stepDef?.description }}</p>
                </div>
              </div>
              <div class="step-header-actions">
                <Button size="small" @click="showHistory">
                  <Icon icon="mdi:book-open-outline" />
                  使用说明
                </Button>
                <Button size="small" @click="showHistory">
                  <Icon icon="mdi:text-box-outline" />
                  日志
                </Button>
                <Button
                  type="primary"
                  :disabled="!canRun"
                  :loading="selectedStep?.status === 'running'"
                  @click="handleRunStep"
                >
                  <Icon icon="mdi:play" />
                  {{ selectedStep?.status === 'completed' ? '重新运行' : '运行' }}
                </Button>
              </div>
            </div>

            <!-- 滚动内容区 -->
            <div class="content-scroll">
              <!-- 数据来源卡片 (仅数据读取步骤) -->
              <div v-if="isDataLoadStep && pipeline.dataPath" class="source-card">
                <div class="source-inner">
                  <div class="source-left">
                    <Icon icon="mdi:folder-open-outline" class="source-icon" />
                    <div>
                      <div class="source-label">数据来源</div>
                      <div class="source-path">{{ pipeline.dataPath }}</div>
                    </div>
                  </div>
                  <div v-if="pipeline.species" class="species-tag">
                    {{ pipeline.species }}
                  </div>
                </div>
              </div>

              <!-- 样本列表卡片 (仅数据读取步骤) -->
              <SampleTableEditor
                v-if="isDataLoadStep"
                :model-value="samples"
                @update:model-value="handleUpdateSamples"
              />

              <!-- 参数配置卡片 (非数据读取步骤) -->
              <div v-if="!isDataLoadStep && paramSchema" class="config-card">
                <div class="card-header">
                  <div class="card-title">
                    <Icon icon="mdi:tune-variant" class="title-icon" />
                    <span>参数配置</span>
                  </div>
                  <Button size="small" @click="handleReset">
                    <Icon icon="mdi:refresh" />
                    重置
                  </Button>
                </div>
                <div class="config-body">
                  <DynamicForm
                    :model-value="localParams"
                    :schema="paramSchema as any"
                    :show-actions="false"
                    @update:model-value="handleParamsChange"
                    @reset="handleReset"
                  />
                </div>
              </div>

              <!-- 运行结果卡片 -->
              <StepResultPanel
                v-if="selectedStep?.result || selectedStep?.status === 'running'"
                :result="selectedStep?.result"
                :loading="selectedStep?.status === 'running'"
              />
            </div>
          </div>
        </div>
      </template>
    </Spin>

    <!-- History Drawer -->
    <Drawer
      v-model:open="historyDrawerVisible"
      title="执行历史"
      placement="right"
      :width="400"
    >
      <Spin :spinning="historyLoading">
        <Timeline v-if="historyList.length > 0">
          <Timeline.Item
            v-for="exec in historyList"
            :key="exec.id"
            color="green"
          >
            <div class="history-item">
              <div class="history-time">{{ formatDate(exec.executedAt) }}</div>
              <div class="history-params">
                <code>{{ JSON.stringify(exec.params, null, 2) }}</code>
              </div>
              <div v-if="exec.result?.message" class="history-result">
                {{ exec.result.message }}
              </div>
            </div>
          </Timeline.Item>
        </Timeline>
        <div v-else class="no-history">暂无执行历史</div>
      </Spin>
    </Drawer>
  </Page>
</template>

<style scoped>
.sc-pipeline-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.full-spin {
  height: 100%;
}

:deep(.ant-spin-nested-loading),
:deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 两栏布局 */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 220px;
  overflow: hidden;
  background: white;
  border-right: 1px solid #f0f0f0;
}

.content-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

/* 步骤标题栏 */
.step-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.step-header-left {
  display: flex;
  gap: 14px;
  align-items: center;
}

.step-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 10px;
}

.step-info {
  display: flex;
  flex-direction: column;
}

.step-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
}

.step-desc {
  margin: 2px 0 0;
  font-size: 13px;
  color: #8c8c8c;
}

.step-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 滚动内容区 */
.content-scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 24px 32px;
  overflow-y: auto;
}

/* 数据来源卡片 */
.source-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.source-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}

.source-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.source-icon {
  font-size: 24px;
  color: #1677ff;
}

.source-label {
  font-size: 12px;
  color: #1677ff;
}

.source-path {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.species-tag {
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 16px;
}

/* 参数配置卡片 */
.config-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.title-icon {
  font-size: 20px;
  color: #1677ff;
}

.config-body {
  padding: 20px 24px;
}

/* 历史记录 */
.history-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-time {
  font-size: 12px;
  color: #8c8c8c;
}

.history-params {
  padding: 8px;
  overflow-x: auto;
  font-size: 11px;
  background: #f5f5f5;
  border-radius: 4px;
}

.history-params code {
  word-break: break-all;
  white-space: pre-wrap;
}

.history-result {
  font-size: 13px;
  color: #52c41a;
}

.no-history {
  padding: 40px 0;
  color: #8c8c8c;
  text-align: center;
}

/* 响应式 */
@media (max-width: 1000px) {
  .main-layout {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }
}
</style>
