<script lang="ts" setup>
/**
 * ResultRenderer - 结果可视化分发器
 *
 * 根据 output_config 动态渲染分析结果
 * 支持类型: echarts, table, download
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onUnmounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useAccessStore } from '@vben/stores';

// @ts-ignore
import { Icon } from '@iconify/vue';
import {
  Button,
  Empty,
  message,
  Space,
  Spin,
  Table,
  Tabs,
} from 'ant-design-vue';

import { getTaskFileUrl } from '#/api/analysis-tools';

interface OutputItem {
  key: string;
  path: string;
  type: 'download' | 'echarts' | 'file' | 'html' | 'image' | 'pdf' | 'table';
  title?: string;
}

interface OutputConfig {
  outputs?: OutputItem[];
}

const props = defineProps<{
  config: null | OutputConfig;
  outputDir?: string;
  taskId?: string;
}>();

const loading = ref(false);
const activeKey = ref<string>('');
const outputData = ref<Record<string, unknown>>({});
const imageBlobUrls = ref<Record<string, string>>({}); // 存储图片 Blob URL
const fetchErrors = ref<Record<string, string>>({}); // 存储加载错误信息

// ECharts refs
const chartRefs = ref<Record<string, EchartsUIType>>({});

// 构建文件 URL
const buildFileUrl = (filePath: string): string => {
  if (props.taskId) {
    return getTaskFileUrl(Number(props.taskId), filePath);
  }
  // 回退兼容：直接使用 outputDir
  if (props.outputDir) {
    return `${props.outputDir}/${filePath}`;
  }
  return '';
};

const hasHtmlReport = ref(false);
const htmlReportUrl = ref('');

const getAuthHeaders = (): HeadersInit => {
  const token = useAccessStore().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const setHtmlReportBlob = async (response: Response) => {
  const blob = await response.blob();
  if (htmlReportUrl.value) {
    URL.revokeObjectURL(htmlReportUrl.value);
  }
  htmlReportUrl.value = URL.createObjectURL(blob);
  hasHtmlReport.value = true;
};

const tryLoadHtmlReport = async (path = 'report.html') => {
  const url = buildFileUrl(path);
  if (!url) return false;

  try {
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) return false;
    await setHtmlReportBlob(response);
    return true;
  } catch (error) {
    console.error(`加载 HTML 报告失败: ${path}`, error);
    return false;
  }
};

// 获取结果数据
const fetchOutputData = async () => {
  if ((!props.taskId && !props.outputDir)) return;

  loading.value = true;
  hasHtmlReport.value = false;
  fetchErrors.value = {};
  try {
    // 很多单细胞工具会生成 report.html，直接尝试读取，避免递归扫描结果目录。
    if (await tryLoadHtmlReport('report.html')) {
      return;
    }

    if (!props.config?.outputs) return;

    for (const output of props.config.outputs) {
      const url = buildFileUrl(output.path);
      if (!url) continue;

      const response = await fetch(url, { headers: getAuthHeaders() });

      if (!response.ok) {
        console.error(
          `Fetch failed for ${url}: ${response.status} ${response.statusText}`,
        );
        if (response.status === 401) {
          fetchErrors.value[output.key] = '认证失败，请重新登录';
        } else if (response.status === 404) {
          fetchErrors.value[output.key] = '结果文件不存在，分析可能失败';
        } else {
          fetchErrors.value[output.key] = `加载失败 (${response.status})`;
        }
        continue;
      }

      switch (output.type) {
        case 'echarts': {
          outputData.value[output.key] = await response.json();

          break;
        }
        case 'html': {
          await setHtmlReportBlob(response);

          return;
        }
        case 'image': {
          const blob = await response.blob();
          const existingUrl = imageBlobUrls.value[output.key];
          if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
          }
          imageBlobUrls.value[output.key] = URL.createObjectURL(blob);

          break;
        }
        case 'table': {
          const text = await response.text();
          outputData.value[output.key] = parseCSV(text || '');

          break;
        }
        // No default
      }
    }

    // 设置默认 Tab
    if (props.config.outputs.length > 0) {
      activeKey.value = props.config.outputs[0]?.key ?? '';
    }
  } catch (error) {
    console.error('Failed to fetch output:', error);
    message.error('加载结果数据失败');
  } finally {
    loading.value = false;
  }
};

// 解析 CSV
const parseCSV = (text: string): { columns: any[]; data: any[] } => {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { columns: [], data: [] };

  const headers = lines[0]!.split('\t');
  const columns = headers.map((h) => ({
    title: h,
    dataIndex: h,
    key: h,
    ellipsis: true,
  }));

  const data = lines.slice(1).map((line, idx) => {
    const values = line.split('\t');
    const row: Record<string, number | string> = { key: idx };
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });

  return { columns, data };
};

// 渲染 ECharts
const renderChart = (key: string) => {
  const chartRef = chartRefs.value[key];
  const data = outputData.value[key];
  if (!chartRef || !data) return;

  const { renderEcharts } = useEcharts(ref(chartRef));
  renderEcharts(data as any);
};

// 下载文件
const downloadFile = (output: OutputItem) => {
  const url = buildFileUrl(output.path);
  if (!url) return;
  window.open(url, '_blank');
};

watch(
  [() => props.taskId, () => props.outputDir],
  () => {
    if (props.taskId || props.outputDir) {
      fetchOutputData();
    }
  },
  { immediate: true },
);

watch(activeKey, (key) => {
  const output = props.config?.outputs?.find((o) => o.key === key);
  if (output?.type === 'echarts') {
    setTimeout(() => renderChart(key), 100);
  }
});

onUnmounted(() => {
  if (htmlReportUrl.value) URL.revokeObjectURL(htmlReportUrl.value);
  Object.values(imageBlobUrls.value).forEach(URL.revokeObjectURL);
});
</script>

<template>
  <div class="result-renderer">
    <Spin :spinning="loading">
      <!-- 优先展示 HTML 报告 -->
      <div v-if="hasHtmlReport" class="html-report-container w-full h-[800px]">
        <iframe :src="htmlReportUrl" class="w-full h-full border-0 rounded-md"></iframe>
      </div>

      <template v-else-if="config?.outputs?.length">
        <Tabs v-model:active-key="activeKey" size="small">
          <Tabs.TabPane
            v-for="output in config.outputs"
            :key="output.key"
            :tab="output.title || output.key"
          >
            <!-- ECharts -->
            <div v-if="output.type === 'echarts'" class="chart-container">
              <EchartsUI
                :ref="
                  (el: any) => {
                    if (el) chartRefs[output.key] = el;
                  }
                "
              />
            </div>

            <!-- Image -->
            <div v-else-if="output.type === 'image'" class="image-container">
              <img
                v-if="imageBlobUrls[output.key]"
                :src="imageBlobUrls[output.key]"
                :alt="output.title || output.key"
                class="result-image"
              />
              <div v-else-if="fetchErrors[output.key]" class="error-state">
                <Icon icon="mdi:alert-circle" class="error-icon" />
                <span>{{ fetchErrors[output.key] }}</span>
              </div>
              <Spin v-else />
            </div>

            <!-- Table -->
            <div v-else-if="output.type === 'table'" class="table-container">
              <Table
                v-if="outputData[output.key]"
                :columns="(outputData[output.key] as any)?.columns"
                :data-source="(outputData[output.key] as any)?.data"
                :scroll="{ y: 400 }"
                size="small"
                bordered
              />
            </div>

            <!-- Download -->
            <div
              v-else-if="
                output.type === 'download' ||
                output.type === 'file' ||
                output.type === 'pdf'
              "
              class="download-container"
            >
              <Space direction="vertical" align="center">
                <Icon icon="mdi:file-download" class="download-icon" />
                <Button type="primary" @click="downloadFile(output)">
                  <Icon icon="mdi:download" />
                  下载 {{ output.title || output.key }}
                </Button>
              </Space>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </template>

      <Empty v-else description="暂无结果配置" />
    </Spin>
  </div>
</template>

<style scoped>
.result-renderer {
  width: 100%;
  height: 100%;
  padding: 0 16px; /* 添加左右内边距，让 Tab 不靠边 */
}

.chart-container {
  width: 100%;
  height: 400px;
}

.table-container {
  width: 100%;
  overflow: auto;
}

.download-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.download-icon {
  font-size: 64px;
  color: var(--primary-color, #1890ff);
  opacity: 0.6;
}

.image-container {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 16px;
  overflow: auto;
  background-color: #fafafa;
  border-radius: 8px;
}

.result-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #ff4d4f;
}

.error-icon {
  font-size: 48px;
}
</style>
