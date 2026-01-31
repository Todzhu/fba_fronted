<script lang="ts" setup>
import type { SampleInfo } from './mock/myDataMock';
/**
 * 单细胞分析流程详情页
 * 三栏布局：左侧步骤导航 / 中间结果展示 / 右侧参数配置
 */
import type { PipelineState, StepType } from './types/pipeline';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';

import { Icon } from '@iconify/vue';
import { Button, Drawer, message, Spin, Tabs, Timeline } from 'ant-design-vue';

import StepConfigPanel from './components/StepConfigPanel.vue';
import StepNavigation from './components/StepNavigation.vue';
import StepResultPanel from './components/StepResultPanel.vue';
import {
  getPipeline,
  getStepHistory,
  runStep,
  updateStepParams,
} from './mock/mockApi';
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
const activeTab = ref('config');

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

// 加载流程数据
const fetchPipeline = async () => {
  loading.value = true;
  try {
    pipeline.value = await getPipeline(pipelineId.value);
    if (pipeline.value) {
      // 设置页签标题
      setTabTitle(pipeline.value.name);
      // 定位到当前步骤
      selectedStepIndex.value = Math.min(
        pipeline.value.currentStep,
        pipeline.value.steps.length - 1,
      );
      // 加载样本数据
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

// 更新步骤参数
const handleUpdateParams = async (params: Record<string, unknown>) => {
  if (!pipeline.value || !selectedStep.value) return;

  await updateStepParams(pipelineId.value, selectedStepType.value, params);

  // 同步更新本地状态
  selectedStep.value.params = { ...selectedStep.value.params, ...params };
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

      // 刷新流程状态
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
        <!-- Header -->
        <div class="page-header">
          <div class="header-left">
            <Button type="text" shape="circle" @click="goBack">
              <Icon icon="mdi:arrow-left" style="font-size: 20px" />
            </Button>
            <div class="pipeline-info">
              <h1 class="pipeline-name">{{ pipeline.name }}</h1>
              <span class="pipeline-id">ID: {{ pipeline.id }}</span>
            </div>
          </div>
        </div>

        <!-- Main Content: 两栏布局 -->
        <div class="main-content">
          <!-- Left: Step Navigation -->
          <div class="left-panel">
            <div class="panel-title">
              <Icon icon="mdi:format-list-numbered" />
              分析步骤
            </div>
            <StepNavigation
              :steps="pipeline.steps"
              :current-step="selectedStepIndex"
              @select="handleSelectStep"
            />
          </div>

          <!-- Center: Tabs (参数配置 + 分析结果) -->
          <div class="center-panel">
            <Tabs v-model:active-key="activeTab" class="center-tabs">
              <Tabs.TabPane key="config">
                <template #tab>
                  <span class="tab-label">
                    <Icon icon="mdi:cog" />
                    参数配置
                  </span>
                </template>
                <div class="tab-content">
                  <StepConfigPanel
                    v-if="selectedStep"
                    :step-type="selectedStepType"
                    :params="selectedStep.params"
                    :status="selectedStep.status"
                    :disabled="
                      selectedStepIndex > 0 &&
                      pipeline.steps[selectedStepIndex - 1]?.status !==
                        'completed'
                    "
                    :history-count="selectedStep.history.length"
                    :samples="samples"
                    @update:params="handleUpdateParams"
                    @update:samples="handleUpdateSamples"
                    @run="handleRunStep"
                    @show-history="showHistory"
                  />
                </div>
              </Tabs.TabPane>

              <Tabs.TabPane key="result">
                <template #tab>
                  <span class="tab-label">
                    <Icon icon="mdi:chart-box" />
                    分析结果
                    <span
                      v-if="selectedStep?.status === 'completed'"
                      class="result-badge"
                      >✓</span
                    >
                  </span>
                </template>
                <div class="tab-content">
                  <StepResultPanel
                    :result="selectedStep?.result"
                    :loading="selectedStep?.status === 'running'"
                  />
                </div>
              </Tabs.TabPane>
            </Tabs>
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
@media (max-width: 1000px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
  }
}

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

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pipeline-info {
  display: flex;
  flex-direction: column;
}

.pipeline-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.pipeline-id {
  font-size: 12px;
  color: #8c8c8c;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 240px;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
}

.center-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
}

.panel-title {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #f0f0f0;
}

/* Tab 样式 */
.center-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.center-tabs :deep(.ant-tabs-nav) {
  padding: 0 16px;
  margin: 0;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.center-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.center-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.center-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
}

.tab-label {
  display: flex;
  gap: 6px;
  align-items: center;
}

.tab-content {
  height: 100%;
  padding: 16px;
  overflow: auto;
}

.result-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  font-size: 10px;
  color: white;
  background: #52c41a;
  border-radius: 50%;
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
</style>
