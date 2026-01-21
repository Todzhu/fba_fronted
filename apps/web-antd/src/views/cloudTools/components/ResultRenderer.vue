<script lang="ts" setup>
/**
 * ResultRenderer - 结果可视化分发器
 *
 * 根据 output_config 动态渲染分析结果
 * 支持类型: echarts, table, download
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import { Button, Empty, message, Space, Spin, Table, Tabs } from 'ant-design-vue';

interface OutputItem {
  key: string;
  path: string;
  type: 'echarts' | 'table' | 'download' | 'pdf';
  title?: string;
}

interface OutputConfig {
  outputs?: OutputItem[];
}

const props = defineProps<{
  config: OutputConfig | null;
  taskId?: string;
  outputDir?: string;
}>();

const loading = ref(false);
const activeKey = ref<string>('');
const outputData = ref<Record<string, unknown>>({});

// ECharts refs
const chartRefs = ref<Record<string, EchartsUIType>>({});

// 获取结果数据
const fetchOutputData = async () => {
  if (!props.outputDir || !props.config?.outputs) return;

  loading.value = true;
  try {
    for (const output of props.config.outputs) {
      const url = `${props.outputDir}/${output.path}`;
      const response = await fetch(url);

      if (output.type === 'echarts') {
        outputData.value[output.key] = await response.json();
      } else if (output.type === 'table') {
        const text = await response.text();
        outputData.value[output.key] = parseCSV(text);
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
    const row: Record<string, string | number> = { key: idx };
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
  if (!props.outputDir) return;
  const url = `${props.outputDir}/${output.path}`;
  window.open(url, '_blank');
};

watch(
  () => props.outputDir,
  () => {
    if (props.outputDir) {
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

onMounted(() => {
  if (props.outputDir) {
    fetchOutputData();
  }
});
</script>

<template>
  <div class="result-renderer">
    <Spin :spinning="loading">
      <template v-if="config?.outputs?.length">
        <Tabs v-model:active-key="activeKey" size="small">
          <Tabs.TabPane
            v-for="output in config.outputs"
            :key="output.key"
            :tab="output.title || output.key"
          >
            <!-- ECharts -->
            <div v-if="output.type === 'echarts'" class="chart-container">
              <EchartsUI
                :ref="(el: any) => { if (el) chartRefs[output.key] = el; }"
              />
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
            <div v-else-if="output.type === 'download'" class="download-container">
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
</style>
