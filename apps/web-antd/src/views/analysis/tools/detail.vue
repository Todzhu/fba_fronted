<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  Tabs, Button, Upload, Form, InputNumber, 
  Select, Spin, message, Space
} from 'ant-design-vue';
import { Page } from '@vben/common-ui';
import { Icon } from '@iconify/vue';
import { getAnalysisTool, type AnalysisTool } from '#/api/analysis-tools';
import { EchartsUI, useEcharts, type EchartsUIType } from '@vben/plugins/echarts';

const route = useRoute();
const router = useRouter();

// Tool info
const toolId = computed(() => Number(route.params.id));
const tool = ref<AnalysisTool | null>(null);
const loading = ref(false);
const analyzing = ref(false);
const activeTab = ref('data');

// Chart Setup
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// Data state
const dataSource = ref<any[]>([]);

// GO Example data
interface GOData {
  key: number;
  Term: string;
  Count: number;
  PValue: number;
  FDR: number;
}

const exampleData: GOData[] = [
  { key: 1, Term: 'GO:0006955~immune response', Count: 45, PValue: 1.2e-15, FDR: 2.3e-13 },
  { key: 2, Term: 'GO:0007165~signal transduction', Count: 38, PValue: 3.4e-12, FDR: 5.6e-10 },
  { key: 3, Term: 'GO:0045087~innate immune response', Count: 32, PValue: 4.5e-11, FDR: 6.7e-09 },
  { key: 4, Term: 'GO:0006952~defense response', Count: 28, PValue: 5.6e-10, FDR: 7.8e-08 },
  { key: 5, Term: 'GO:0006954~inflammatory response', Count: 25, PValue: 6.7e-09, FDR: 8.9e-07 },
  { key: 6, Term: 'GO:0042742~defense response to bacterium', Count: 22, PValue: 7.8e-08, FDR: 9.1e-06 },
  { key: 7, Term: 'GO:0002250~adaptive immune response', Count: 20, PValue: 8.9e-07, FDR: 1.2e-05 },
  { key: 8, Term: 'GO:0050896~response to stimulus', Count: 18, PValue: 9.1e-06, FDR: 2.3e-04 },
  { key: 9, Term: 'GO:0009617~response to bacterium', Count: 15, PValue: 1.2e-05, FDR: 3.4e-03 },
  { key: 10, Term: 'GO:0032496~response to lipopolysaccharide', Count: 12, PValue: 2.3e-04, FDR: 4.5e-02 },
  { key: 11, Term: 'GO:0019221~cytokine-mediated signaling pathway', Count: 10, PValue: 3.4e-04, FDR: 0.051 },
  { key: 12, Term: 'GO:0001817~regulation of cytokine production', Count: 8, PValue: 4.5e-03, FDR: 0.12 },
];

// Parameters
const parameters = ref({
  topN: 10,
  colorBy: 'PValue' as 'PValue' | 'FDR',
});

// Result state
const hasResult = ref(false);

// Fetch tool info
const fetchTool = async () => {
  loading.value = true;
  try {
    tool.value = await getAnalysisTool(toolId.value);
    if (tool.value?.title) {
      const title = `${tool.value.title}`;
      document.title = `${title} - FBA`;
      route.meta.title = title;
    }
  } catch (error) {
    message.error('获取工具信息失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// Load example data
const loadExampleData = () => {
  dataSource.value = [...exampleData];
  message.success('已加载示例数据');
};

// Clear data
const clearData = () => {
  dataSource.value = [];
};

// File upload handler
const handleUpload = (info: any) => {
  if (info.file.status === 'done') {
    message.success(`${info.file.name} 上传成功`);
    loadExampleData();
  }
};

// Generate Chart
const updateChart = () => {
  if (!dataSource.value.length) return;

  const data = [...dataSource.value];
  const metric = parameters.value.colorBy;
  data.sort((a, b) => a[metric] - b[metric]);
  const plotData = data.slice(0, parameters.value.topN).reverse();

  const metricValues = plotData.map(d => d[metric]);
  const minVal = Math.min(...metricValues);
  const maxVal = Math.max(...metricValues);

  renderEcharts({
    title: {
      text: tool.value?.title || 'GO Enrichment Bar Plot',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex;
        const item = plotData[idx];
        return `<b>${item.Term}</b><br/>Count: ${item.Count}<br/>PValue: ${item.PValue.toExponential(2)}<br/>FDR: ${item.FDR.toExponential(2)}`;
      }
    },
    grid: { left: '3%', right: '10%', bottom: '15%', containLabel: true },
    xAxis: { type: 'value', name: 'Count', nameLocation: 'middle', nameGap: 30 },
    yAxis: { type: 'category', axisLabel: { width: 180, overflow: 'truncate', interval: 0 } },
    visualMap: {
      dimension: 1,
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#50a3ba', '#eac736', '#d94e5d'] },
      text: [parameters.value.colorBy === 'PValue' ? 'High PValue' : 'High FDR', 
             parameters.value.colorBy === 'PValue' ? 'Low PValue' : 'Low FDR']
    },
    dataset: {
      source: plotData.map(item => [item.Count, item[metric], item.Term.split('~')[1] || item.Term])
    },
    series: [{ type: 'bar', encode: { x: 0, y: 2 } }]
  });
};

// Submit analysis
const submitAnalysis = async () => {
  if (dataSource.value.length === 0) {
    message.warning('请先加载或上传数据');
    return;
  }
  
  analyzing.value = true;
  message.loading('正在分析中，请稍候...', 0);
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    hasResult.value = true;
    setTimeout(() => updateChart(), 100);
    message.destroy();
    message.success('分析完成！');
  } catch (error) {
    message.destroy();
    message.error('分析失败，请重试');
  } finally {
    analyzing.value = false;
  }
};

watch(parameters, () => {
  if (hasResult.value) updateChart();
}, { deep: true });

const goBack = () => router.push('/analysis/tools');

onMounted(() => fetchTool());

// Excel column letters
const getColumnLetter = (index: number) => String.fromCharCode(65 + index);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <!-- Header -->
      <div class="header-bar">
        <div class="header-left">
          <Button type="text" size="large" @click="goBack" class="back-btn">
            <Icon icon="mdi:arrow-left" />
          </Button>
          <div v-if="tool" class="tool-info">
            <div class="tool-icon" :style="{ backgroundColor: (tool.color || '#1890ff') + '15' }">
              <Icon :icon="tool.icon || 'mdi:chart-bar'" :style="{ color: tool.color || '#1890ff' }" />
            </div>
            <h1 class="tool-title">{{ tool.title }}</h1>
          </div>
        </div>
        <Space>
          <Button><Icon icon="mdi:thumb-up-outline" /> 打赏</Button>
          <Button><Icon icon="mdi:star-outline" /> 收藏</Button>
        </Space>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left: Result -->
        <div class="result-panel">
          <div class="panel-header">
            <Space>
              <Button size="small"><Icon icon="mdi:book-open-outline" /> 使用指南</Button>
              <Button size="small" type="primary"><Icon icon="mdi:file-pdf-box" /> 预览PDF</Button>
              <Button size="small"><Icon icon="mdi:eye-outline" /> 预览日志</Button>
              <Button size="small"><Icon icon="mdi:download" /> 下载</Button>
            </Space>
          </div>

          <div class="result-content">
            <div v-if="analyzing" class="loading-state">
              <Spin size="large" />
              <p>正在分析中，请稍候...</p>
            </div>
            <div v-else-if="hasResult" class="chart-container">
              <EchartsUI ref="chartRef" />
            </div>
            <div v-else class="empty-state">
              <Icon icon="mdi:chart-scatter-plot" />
              <p>请在右侧加载数据并提交分析</p>
            </div>
          </div>
        </div>

        <!-- Right: Data & Params -->
        <div class="control-panel">
          <Tabs v-model:activeKey="activeTab" type="card" size="small">
            <Tabs.TabPane key="data" tab="数据文件">
              <div class="tab-content">
                <div class="data-actions">
                  <Button type="primary" size="small" @click="loadExampleData">
                    <Icon icon="mdi:file-document" /> 示例
                  </Button>
                  <Button size="small">下载示例 数据表</Button>
                </div>

                <div class="file-row">
                  <span class="required">*</span>
                  <span class="label">数据表：</span>
                  <span class="filename">{{ dataSource.length > 0 ? 'data.txt' : '' }}</span>
                  <Upload 
                    :showUploadList="false"
                    :customRequest="({ file, onSuccess }: any) => { onSuccess?.('ok'); handleUpload({ file: { ...file, status: 'done' } }); }"
                  >
                    <Button type="primary" size="small"><Icon icon="mdi:upload" /> 上传</Button>
                  </Upload>
                  <Button type="primary" danger size="small" @click="clearData">清空</Button>
                  <Button size="small">切换模式</Button>
                </div>

                <!-- Excel-style Table -->
                <div class="spreadsheet">
                  <div class="sheet-header">
                    <span class="sheet-title">数据表</span>
                  </div>
                  <div class="sheet-container">
                    <table class="excel-table">
                      <thead>
                        <tr>
                          <th class="row-number"></th>
                          <th v-for="(col, i) in ['Term', 'Count', 'PValue', 'FDR']" :key="col" class="col-header">
                            <div class="col-letter">{{ getColumnLetter(i) }}</div>
                            <div class="col-name">{{ col }}</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in dataSource" :key="row.key">
                          <td class="row-number">{{ idx + 1 }}</td>
                          <td class="cell">{{ row.Term }}</td>
                          <td class="cell number">{{ row.Count }}</td>
                          <td class="cell number">{{ row.PValue.toExponential(2) }}</td>
                          <td class="cell number">{{ row.FDR.toExponential(2) }}</td>
                        </tr>
                        <tr v-if="dataSource.length === 0">
                          <td colspan="5" class="empty-cell">暂无数据，请加载示例或上传文件</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <p class="warning-text">
                  <Icon icon="mdi:alert-circle" /> 对于较大的数据文件，在线编辑可能会导致卡顿
                </p>
              </div>
            </Tabs.TabPane>
            
            <Tabs.TabPane key="params" tab="参数设置">
              <div class="tab-content">
                <Form layout="vertical" size="small">
                  <Form.Item label="展示条目数 (Top N)">
                    <InputNumber v-model:value="parameters.topN" :min="1" :max="50" class="w-full" />
                  </Form.Item>
                  <Form.Item label="颜色映射">
                    <Select v-model:value="parameters.colorBy" class="w-full">
                      <Select.Option value="PValue">P-Value</Select.Option>
                      <Select.Option value="FDR">FDR</Select.Option>
                    </Select>
                  </Form.Item>
                </Form>
              </div>
            </Tabs.TabPane>
          </Tabs>

          <div class="submit-area">
            <Button type="primary" size="large" block :loading="analyzing" @click="submitAnalysis">
              <Icon v-if="!analyzing" icon="mdi:play" />
              {{ analyzing ? '分析中...' : '提交分析' }}
            </Button>
          </div>
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--component-background);
  border-radius: 8px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  padding: 4px 8px;
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.tool-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.main-content {
  display: flex;
  gap: 16px;
  height: calc(100vh - 220px);
}

.result-panel {
  flex: 1;
  background: var(--component-background);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.result-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-color-secondary);
}

.empty-state .iconify {
  font-size: 80px;
  opacity: 0.3;
}

.control-panel {
  width: 420px;
  background: var(--component-background);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}

.data-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.required {
  color: #ff4d4f;
}

.label {
  font-weight: 500;
}

.filename {
  color: var(--text-color-secondary);
  flex: 1;
}

.spreadsheet {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.sheet-header {
  background: #f5f5f5;
  padding: 6px 10px;
  font-weight: 500;
  font-size: 13px;
  border-bottom: 1px solid var(--border-color);
}

.dark .sheet-header {
  background: #1f1f1f;
}

.sheet-container {
  max-height: 320px;
  overflow: auto;
}

.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.excel-table th, .excel-table td {
  border: 1px solid #e8e8e8;
  padding: 4px 8px;
  text-align: left;
}

.dark .excel-table th, .dark .excel-table td {
  border-color: #303030;
}

.row-number {
  background: #fafafa;
  color: #888;
  text-align: center;
  width: 32px;
  font-weight: 500;
}

.dark .row-number {
  background: #1f1f1f;
}

.col-header {
  background: #fafafa;
  text-align: center;
  min-width: 80px;
}

.dark .col-header {
  background: #1f1f1f;
}

.col-letter {
  color: #888;
  font-size: 10px;
}

.col-name {
  font-weight: 500;
}

.cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.cell.number {
  text-align: right;
  font-family: monospace;
}

.empty-cell {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 24px !important;
}

.warning-text {
  font-size: 12px;
  color: #fa8c16;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.submit-area {
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

:deep(.ant-tabs-content) {
  height: calc(100% - 40px);
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
