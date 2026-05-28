<script lang="ts" setup>
/**
 * StepResultPanel - 步骤结果展示面板
 * 支持统计卡片、ECharts 图表和数据表格
 */
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { StepResult, StepType } from '../types/pipeline';

import { computed, nextTick, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import { Button, Empty, Modal, Table, Tabs } from 'antdv-next';

const props = defineProps<{
  result?: StepResult;
  stepType?: StepType;
  loading?: boolean;
  logs?: string[];
}>();

// ECharts refs
const chartRefs = ref<Record<string, EchartsUIType>>({});
const imagePreviewOpen = ref(false);
const imagePreviewSrc = ref('');
const imagePreviewTitle = ref('');

// 渲染图表
const renderCharts = () => {
  if (!props.result?.charts) return;

  nextTick(() => {
    for (const [key, options] of Object.entries(props.result!.charts!)) {
      const chartRef = chartRefs.value[key];
      if (chartRef) {
        const { renderEcharts } = useEcharts(ref(chartRef));
        renderEcharts(options as any);
      }
    }
  });
};

// 监听结果变化
watch(
  () => props.result,
  () => {
    if (props.result?.charts) {
      renderCharts();
    }
  },
  { immediate: true },
);

// 表格列定义
const getTableColumns = (columns: string[]) => {
  return columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
  }));
};

// Chart 数量
const chartKeys = () => Object.keys(props.result?.charts || {});
const imageKeys = () => Object.keys(props.result?.images || {});
const tableKeys = () => Object.keys(props.result?.tables || {});
const getTable = (tableKey: string) => props.result?.tables?.[tableKey] || { columns: [], data: [] };
const fileList = () => props.result?.files || [];
const visibleFiles = computed(() => props.stepType === 'data_load' ? [] : fileList());
const reportHtmlFile = computed(() => visibleFiles.value.find((file) => file.type === 'html' || file.name.endsWith('.html')));
const resultLogs = computed(() => props.logs?.length ? props.logs : props.result?.logs || []);
const hasVisualResult = computed(() => {
  return chartKeys().length > 0 || imageKeys().length > 0 || tableKeys().length > 0 || visibleFiles.value.length > 0;
});

const openImagePreview = (imageKey: string) => {
  imagePreviewSrc.value = props.result?.images?.[imageKey] || '';
  imagePreviewTitle.value = imageKey.replace(/_/g, ' ');
  imagePreviewOpen.value = Boolean(imagePreviewSrc.value);
};
</script>

<template>
  <div class="step-result-panel">
    <div v-if="loading || (!hasVisualResult && resultLogs.length > 0)" class="live-log-view">
      <div class="live-log-header">
        <div class="live-log-title">
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:text-box-check-outline'" :class="{ spinning: loading }" />
          <span>{{ loading ? '正在执行分析' : '运行日志' }}</span>
        </div>
        <span class="live-log-count">{{ resultLogs.length }} 条日志</span>
      </div>
      <pre class="live-log-content">{{ resultLogs.join('\n') }}</pre>
    </div>

    <!-- Empty State -->
    <Empty
      v-else-if="!result"
      description="执行步骤后查看结果"
      class="empty-state"
    >
      <template #image>
        <Icon icon="mdi:chart-timeline-variant" class="empty-icon" />
      </template>
    </Empty>

    <!-- Result Content -->
    <div v-else class="result-content">
      <!-- Charts & Tables -->
      <Tabs
        v-if="hasVisualResult"
        class="result-tabs"
      >
        <!-- Report preview -->
        <Tabs.TabPane v-if="reportHtmlFile" key="report-preview" tab="报告预览">
          <iframe
            class="report-preview-frame"
            :src="reportHtmlFile.path"
            title="报告预览"
          />
        </Tabs.TabPane>

        <!-- Images -->
        <Tabs.TabPane
          v-for="imageKey in imageKeys()"
          :key="`image-${imageKey}`"
          :tab="imageKey.replace(/_/g, ' ')"
        >
          <div class="image-preview" @click="openImagePreview(imageKey)">
            <img
              :src="result.images![imageKey]"
              :alt="imageKey"
              class="result-image"
            />
          </div>
        </Tabs.TabPane>

        <!-- Charts -->
        <Tabs.TabPane
          v-for="chartKey in chartKeys()"
          :key="`chart-${chartKey}`"
          :tab="chartKey.replace(/_/g, ' ')"
        >
          <div class="chart-container">
            <EchartsUI
              :ref="(el: any) => { if (el) chartRefs[chartKey] = el; }"
            />
          </div>
        </Tabs.TabPane>

        <!-- Tables -->
        <Tabs.TabPane
          v-for="tableKey in tableKeys()"
          :key="`table-${tableKey}`"
          :tab="tableKey.replace(/_/g, ' ')"
        >
          <Table
            :columns="getTableColumns(getTable(tableKey).columns)"
            :data-source="getTable(tableKey).data"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ y: 300 }"
            size="small"
            bordered
          />
        </Tabs.TabPane>

        <!-- Files -->
        <Tabs.TabPane v-if="visibleFiles.length > 0" key="files" tab="结果文件">
          <div class="file-list">
            <div v-for="file in visibleFiles" :key="file.path" class="file-item">
              <div class="file-info">
                <Icon icon="mdi:file-outline" />
                <div>
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-path">{{ file.path }}</div>
                </div>
              </div>
              <Button size="small" type="link" :href="file.path" target="_blank">
                <Icon icon="mdi:download" />
                {{ file.type === 'html' || file.name.endsWith('.html') ? '打开' : '下载' }}
              </Button>
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>

    <Modal
      v-model:open="imagePreviewOpen"
      :title="imagePreviewTitle"
      :footer="null"
      centered
      width="92vw"
      wrap-class-name="sc-pipeline-image-modal"
    >
      <div class="image-modal-body">
        <img :src="imagePreviewSrc" :alt="imagePreviewTitle" />
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.step-result-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.live-log-view {
  display: flex;
  flex: 1;
  min-height: 360px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
}

.live-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #edf1f7;
  background: #f8fbff;
}

.live-log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.live-log-title :deep(svg) {
  color: #1677ff;
}

.live-log-count {
  font-size: 12px;
  color: #697386;
}

.live-log-content {
  flex: 1;
  min-height: 0;
  padding: 14px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fbfcfe;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-icon {
  font-size: 64px;
  color: #bfbfbf;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-tabs {
  flex: 1;
  min-width: 0;
}

.report-preview-frame {
  width: 100%;
  height: min(72vh, 960px);
  min-height: 640px;
  overflow: auto;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.chart-container {
  width: 100%;
  height: 360px;
}

.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 360px;
  padding: 16px;
  overflow: hidden;
  cursor: zoom-in;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.result-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.image-modal-body {
  max-height: 82vh;
  overflow: auto;
  text-align: center;
}

.image-modal-body img {
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

@media (max-width: 900px) {
  .image-preview {
    min-height: 300px;
    padding: 12px;
  }

  .result-image {
    width: 100%;
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.file-info {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #262626;
}

.file-path {
  max-width: 420px;
  overflow: hidden;
  font-size: 12px;
  color: #8c8c8c;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.ant-table) {
  font-size: 13px;
}
</style>
