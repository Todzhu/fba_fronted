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
import { Button, Drawer, Empty, Modal, Table } from 'antdv-next';

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
const reportPreviewOpen = ref(false);
const activeResultId = ref('');

type ResultItemKind = 'chart' | 'file' | 'image' | 'report' | 'table';

interface ResultItem {
  id: string;
  icon: string;
  key: string;
  kind: ResultItemKind;
  label: string;
  section: string;
}

const formatResultLabel = (key: string) => key.replace(/_/g, ' ');

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

const renderActiveChart = () => {
  const item = activeResult.value;
  if (!item || item.kind !== 'chart') return;

  nextTick(() => {
    const chartRef = chartRefs.value[item.key];
    const options = props.result?.charts?.[item.key];
    if (!chartRef || !options) return;

    const { renderEcharts } = useEcharts(ref(chartRef));
    renderEcharts(options as any);
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
const getTableColumns = (tableKey: string) => {
  const table = getTable(tableKey);
  return table.columns.map((col) => {
    const column: Record<string, unknown> = {
      title: col,
      dataIndex: col,
      key: col,
    };
    if (col.toLowerCase() === 'cluster') {
      column.filters = Array.from(new Set(table.data.map((row) => row[col]).filter((value) => value !== undefined && value !== null)))
        .sort((left, right) => String(left).localeCompare(String(right), undefined, { numeric: true }))
        .map((value) => ({ text: String(value), value: String(value) }));
      column.onFilter = (value: unknown, record: Record<string, unknown>) => String(record[col]) === String(value);
    }
    return column;
  });
};

// Chart 数量
const chartKeys = () => Object.keys(props.result?.charts || {});
const imageKeys = () => {
  const keys = Object.keys(props.result?.images || {});
  if (props.stepType !== 'cluster') return keys;
  const visibleKeys = keys.filter((key) => !key.toLowerCase().includes('tsne'));
  const preferredOrder = ['umap', 'pca', 'gene counts', 'cluster correlation'];
  return [...visibleKeys].sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.toLowerCase());
    const rightIndex = preferredOrder.indexOf(right.toLowerCase());
    if (leftIndex === -1 && rightIndex === -1) return 0;
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
};
const hiddenTableSteps: StepType[] = ['cell_annotation'];
const tableKeys = () => hiddenTableSteps.includes(props.stepType as StepType) ? [] : Object.keys(props.result?.tables || {});
const getTable = (tableKey: string) => props.result?.tables?.[tableKey] || { columns: [], data: [] };
const fileList = () => props.result?.files || [];
const isReportStep = computed(() => props.stepType === 'report');
const hiddenFileSteps: StepType[] = ['cell_annotation', 'cell_filter', 'cluster', 'data_load', 'marker_gene'];
const visibleFiles = computed(() => hiddenFileSteps.includes(props.stepType as StepType) ? [] : fileList());
const reportHtmlFile = computed(() => visibleFiles.value.find((file) => file.type === 'html' || file.name.endsWith('.html')));
const visibleDownloadFiles = computed(() => isReportStep.value ? [] : visibleFiles.value.filter((file) => file !== reportHtmlFile.value));
const resultLogs = computed(() => props.logs?.length ? props.logs : props.result?.logs || []);
const hasVisualResult = computed(() => {
  return chartKeys().length > 0 || imageKeys().length > 0 || tableKeys().length > 0 || visibleFiles.value.length > 0;
});
const resultItems = computed<ResultItem[]>(() => {
  const items: ResultItem[] = [];

  if (reportHtmlFile.value) {
    items.push({
      id: 'report-preview',
      icon: 'mdi:file-document-outline',
      key: reportHtmlFile.value.path,
      kind: 'report',
      label: '报告预览',
      section: '报告',
    });
  }

  for (const imageKey of imageKeys()) {
    items.push({
      id: `image-${imageKey}`,
      icon: 'mdi:image-outline',
      key: imageKey,
      kind: 'image',
      label: formatResultLabel(imageKey),
      section: '图像',
    });
  }

  for (const chartKey of chartKeys()) {
    items.push({
      id: `chart-${chartKey}`,
      icon: 'mdi:chart-line',
      key: chartKey,
      kind: 'chart',
      label: formatResultLabel(chartKey),
      section: '图表',
    });
  }

  for (const tableKey of tableKeys()) {
    items.push({
      id: `table-${tableKey}`,
      icon: 'mdi:table',
      key: tableKey,
      kind: 'table',
      label: formatResultLabel(tableKey),
      section: '表格',
    });
  }

  for (const file of visibleDownloadFiles.value) {
    items.push({
      id: `file-${file.path}`,
      icon: 'mdi:file-outline',
      key: file.path,
      kind: 'file',
      label: file.name,
      section: '文件',
    });
  }

  return items;
});
const resultSections = computed(() => {
  const sections: Array<{ items: ResultItem[]; name: string }> = [];
  for (const item of resultItems.value) {
    const section = sections.find((entry) => entry.name === item.section);
    if (section) {
      section.items.push(item);
    } else {
      sections.push({ name: item.section, items: [item] });
    }
  }
  return sections;
});
const activeResult = computed(() => resultItems.value.find((item) => item.id === activeResultId.value) || resultItems.value[0]);
const activeFile = computed(() => visibleDownloadFiles.value.find((file) => file.path === activeResult.value?.key));
const showResultNav = computed(() => !isReportStep.value && resultItems.value.length > 1);

const setChartRef = (chartKey: string | undefined, el: EchartsUIType | null) => {
  if (!chartKey || !el) return;
  chartRefs.value[chartKey] = el;
};

watch(
  resultItems,
  (items) => {
    if (!items.length) {
      activeResultId.value = '';
      return;
    }
    if (!items.some((item) => item.id === activeResultId.value)) {
      activeResultId.value = items[0]?.id || '';
    }
  },
  { immediate: true },
);

watch(
  () => [activeResultId.value, props.result?.charts],
  () => {
    renderActiveChart();
  },
  { immediate: true },
);

const openImagePreview = (imageKey: string) => {
  imagePreviewSrc.value = props.result?.images?.[imageKey] || '';
  imagePreviewTitle.value = imageKey.replace(/_/g, ' ');
  imagePreviewOpen.value = Boolean(imagePreviewSrc.value);
};

const openReportPreview = () => {
  if (!reportHtmlFile.value) return;
  reportPreviewOpen.value = true;
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
      <div v-if="hasVisualResult" class="result-browser">
        <aside v-if="showResultNav" class="result-nav">
          <div class="result-nav-summary">{{ resultItems.length }} 项结果</div>
          <div v-for="section in resultSections" :key="section.name" class="result-nav-section">
            <div class="result-nav-section-title">{{ section.name }}</div>
            <button
              v-for="item in section.items"
              :key="item.id"
              class="result-nav-item"
              :class="{ active: item.id === activeResult?.id }"
              type="button"
              @click="activeResultId = item.id"
            >
              <Icon :icon="item.icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </aside>

        <section class="result-viewer">
          <div v-if="activeResult" class="result-viewer-header">
            <div class="result-viewer-title">
              <Icon :icon="activeResult.icon" />
              <span>{{ activeResult.label }}</span>
            </div>
          </div>

          <div
            v-if="activeResult?.kind === 'report' && reportHtmlFile"
            class="report-preview-launcher"
          >
            <Icon icon="mdi:file-document-outline" />
            <div class="report-preview-copy">
              <div class="report-preview-title">HTML 报告已生成</div>
              <div class="report-preview-desc">点击按钮在右侧抽屉中预览完整报告。</div>
            </div>
            <Button type="primary" @click="openReportPreview">
              <Icon icon="mdi:open-in-new" />
              预览报告
            </Button>
          </div>

          <div
            v-else-if="activeResult?.kind === 'image'"
            class="image-preview"
            @click="openImagePreview(activeResult.key)"
          >
            <img
              :src="result.images![activeResult.key]"
              :alt="activeResult.label"
              class="result-image"
            />
          </div>

          <div v-else-if="activeResult?.kind === 'chart'" class="chart-container">
            <EchartsUI
              :ref="(el: any) => setChartRef(activeResult?.key, el)"
            />
          </div>

          <Table
            v-else-if="activeResult?.kind === 'table'"
            :columns="getTableColumns(activeResult.key)"
            :data-source="getTable(activeResult.key).data"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ y: 420 }"
            size="small"
            bordered
          />

          <div v-else-if="activeResult?.kind === 'file' && activeFile" class="file-list">
            <div class="file-item">
              <div class="file-info">
                <Icon icon="mdi:file-outline" />
                <div>
                  <div class="file-name">{{ activeFile.name }}</div>
                  <div class="file-path">{{ activeFile.path }}</div>
                </div>
              </div>
              <Button size="small" type="link" :href="activeFile.path" target="_blank">
                <Icon icon="mdi:download" />
                {{ activeFile.type === 'html' || activeFile.name.endsWith('.html') ? '打开' : '下载' }}
              </Button>
            </div>
          </div>
        </section>
      </div>
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

    <Drawer
      v-model:open="reportPreviewOpen"
      title="报告预览"
      placement="right"
      width="76vw"
      destroy-on-close
      class="report-preview-drawer"
    >
      <iframe
        v-if="reportHtmlFile"
        class="report-preview-frame"
        :src="reportHtmlFile.path"
        title="报告预览"
      />
    </Drawer>
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
  min-height: 0;
  gap: 16px;
}

.result-browser {
  display: flex;
  min-height: 560px;
  flex-direction: column;
  gap: 10px;
}

.result-nav {
  display: flex;
  min-width: 0;
  max-height: 112px;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 10px;
  overflow-y: auto;
  background: #f8fafc;
  border: 1px solid #e8edf5;
  border-radius: 8px;
}

.result-nav-summary {
  flex: 0 0 auto;
  padding: 6px 12px 6px 2px;
  margin-right: 2px;
  border-right: 1px solid #e4eaf2;
  font-size: 12px;
  line-height: 20px;
  color: #697386;
}

.result-nav-section {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.result-nav-section + .result-nav-section {
  margin-top: 0;
}

.result-nav-section-title {
  flex: 0 0 auto;
  padding: 5px 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  color: #617089;
}

.result-nav-item {
  display: flex;
  width: auto;
  max-width: 190px;
  min-height: 30px;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e6edf5;
  border-radius: 6px;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.result-nav-item:hover {
  color: #1677ff;
  background: #fff;
  border-color: #d7e7ff;
}

.result-nav-item.active {
  color: #0958d9;
  background: #eaf4ff;
  border-color: #91caff;
}

.result-nav-item span {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.3;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-nav-item :deep(svg) {
  flex: 0 0 auto;
}

.result-viewer {
  min-width: 0;
  padding: 10px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
}

.result-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.result-viewer-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.result-viewer-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-preview-frame {
  width: 100%;
  height: calc(100vh - 112px);
  min-height: 640px;
  overflow: auto;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.report-preview-launcher {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 28px;
  background: #fbfcfe;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.report-preview-launcher > :deep(svg) {
  flex: 0 0 auto;
  font-size: 32px;
  color: #1677ff;
}

.report-preview-copy {
  min-width: 0;
}

.report-preview-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.report-preview-desc {
  margin-top: 4px;
  font-size: 13px;
  color: #697386;
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
  min-height: clamp(520px, 62vh, 760px);
  padding: 12px;
  overflow: hidden;
  cursor: zoom-in;
  background: #fbfcfe;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.result-image {
  display: block;
  width: auto;
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
  .result-nav {
    max-height: 180px;
  }

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
