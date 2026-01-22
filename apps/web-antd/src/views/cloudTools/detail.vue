<script lang="ts" setup>
/**
 * 分析工具通用使用页面 - 配置驱动版本 (Pro Max Optimized)
 *
 * 布局：左侧参数配置 (Config) / 右侧结果展示 (Result)
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { AnalysisTool } from '#/api/analysis-tools';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import {
  Button,
  message,
  Space,
  Spin,
  TabPane,
  Tabs,
  Typography,
} from 'ant-design-vue';

import { getAnalysisTool } from '#/api/analysis-tools';

import DataFileSelector from './components/DataFileSelector.vue';
import DynamicForm from './components/DynamicForm.vue';
import ResultRenderer from './components/ResultRenderer.vue';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();

// ========== 工具信息 ==========
const toolId = computed(() => Number(route.params.id));
const tool = ref<AnalysisTool | null>(null);
const loading = ref(false);
const analyzing = ref(false);
const activeTab = ref('data');

// ========== 配置驱动计算属性 ==========
const hasInputSchema = computed(() => {
  const schema = tool.value?.input_schema as { files?: unknown[] } | null;
  return schema?.files && schema.files.length > 0;
});

const hasParamSchema = computed(() => {
  const schema = tool.value?.param_schema as { properties?: object } | null;
  return schema?.properties && Object.keys(schema.properties).length > 0;
});

const hasOutputConfig = computed(() => {
  const config = tool.value?.output_config as { outputs?: unknown[] } | null;
  return config?.outputs && config.outputs.length > 0;
});

// ========== 表单状态 ==========
const inputFiles = ref<Record<string, null | number>>({});
const formParams = ref<Record<string, unknown>>({});

// ========== 结果状态 ==========
const hasResult = ref(false);
const taskId = ref<string>('');
const outputDir = ref<string>('');

// ========== 回退兼容：硬编码图表 ==========
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// ========== API 调用 ==========
const fetchTool = async () => {
  loading.value = true;
  try {
    tool.value = await getAnalysisTool(toolId.value);
    // 动态更新页签标题为工具名称
    if (tool.value?.title) {
      document.title = `${tool.value.title} - FBA`;
      setTabTitle(tool.value.title);
    }

    // 初始化参数默认值
    if (tool.value?.param_schema?.properties) {
      const defaults: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(
        tool.value.param_schema.properties as Record<string, any>,
      )) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      }
      formParams.value = defaults;
    }
  } catch (error) {
    message.error('获取工具信息失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 提交分析
const submitAnalysis = async () => {
  // 验证必填文件
  const inputSchema = tool.value?.input_schema as null | {
    files?: Array<{ key: string; label?: string; required?: boolean }>;
  };
  if (inputSchema?.files) {
    for (const file of inputSchema.files) {
      if (file.required && !inputFiles.value[file.key]) {
        message.warning(`请选择 ${file.label || file.key}`);
        return;
      }
    }
  }

  analyzing.value = true;
  showGuide.value = false; // 关闭指南
  message.loading('正在分析中，请稍候...', 0);

  try {
    // 模拟分析过程
    await new Promise((resolve) => setTimeout(resolve, 1500));

    hasResult.value = true;
    message.destroy();
    message.success('分析完成！');

    // 回退兼容：如果没有 output_config，使用硬编码图表
    if (!tool.value?.output_config) {
      setTimeout(() => renderLegacyChart(), 100);
    }
  } catch {
    message.destroy();
    message.error('分析失败，请重试');
  } finally {
    analyzing.value = false;
  }
};

// 回退兼容：硬编码图表渲染
const renderLegacyChart = () => {
  renderEcharts({
    title: { text: tool.value?.title || '分析结果', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '15%', containLabel: true },
    xAxis: { type: 'value', name: 'Count' },
    yAxis: { type: 'category', data: ['示例1', '示例2', '示例3'] },
    series: [{ type: 'bar', data: [10, 20, 30] }],
  });
};

// 监听参数变化，实时更新图表
watch(
  formParams,
  () => {
    if (hasResult.value && !tool.value?.output_config) {
      renderLegacyChart();
    }
  },
  { deep: true },
);

const goBack = () => router.push('/analysis/tools');

const showGuide = ref(false);
const openGuide = () => {
  showGuide.value = true;
};

const previewResult = () => {
  // 如果已有结果，直接切换视图，不重新生成
  if (hasResult.value) {
    showGuide.value = false;
    return;
  }

  message.loading({ content: '生成预览数据中...', key: 'preview' });
  setTimeout(() => {
    hasResult.value = true;
    message.success({ content: '预览结果已生成', key: 'preview' });

    // 渲染更丰富的预览图表
    renderEcharts({
      title: { text: '示例分析结果预览 (Mock Data)', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Sample A', 'Sample B'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Sample A',
          type: 'line',
          stack: 'Total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: [120, 132, 101, 134, 90, 230, 210],
        },
        {
          name: 'Sample B',
          type: 'line',
          stack: 'Total',
          areaStyle: {},
          emphasis: { focus: 'series' },
          data: [220, 182, 191, 234, 290, 330, 310],
        },
      ],
    });
    showGuide.value = false; // 关闭指南，显示结果
  }, 800);
};
const downloadResult = () => {
  if (!hasResult.value) return message.warning('请先提交分析');
  message.info('下载结果...');
};

// 重置参数为默认值
const handleReset = () => {
  if (tool.value?.param_schema?.properties) {
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(
      tool.value.param_schema.properties as Record<string, any>,
    )) {
      if (prop.default !== undefined) {
        defaults[key] = prop.default;
      }
    }
    formParams.value = defaults;
    message.success('参数已重置');
  }
};

// 导入参数文件
const handleImportParams = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (typeof json === 'object') {
        formParams.value = { ...formParams.value, ...json };
        message.success('参数导入成功');
      }
    } catch {
      message.error('参数文件格式错误');
    }
  });
  input.click();
};

// 导出参数文件
const handleExportParams = () => {
  const data = JSON.stringify(formParams.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tool.value?.title || 'analysis'}_params_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('参数导出成功');
};

onMounted(() => fetchTool());
</script>

<template>
  <Page auto-content-height class="page-container">
    <Spin :spinning="loading">
      <!-- Header -->
      <div class="header-bar">
        <div class="header-left">
          <Button type="text" shape="circle" class="back-btn" @click="goBack">
            <Icon icon="mdi:arrow-left" style="font-size: 20px" />
          </Button>
          <div v-if="tool" class="tool-info">
            <div
              class="tool-icon"
              :style="{
                backgroundColor: `${tool.color || '#1890ff'}15`,
                color: tool.color || '#1890ff',
              }"
            >
              <Icon :icon="tool.icon || 'mdi:chart-bar'" />
            </div>
            <h1 class="tool-title">{{ tool.title }}</h1>
          </div>
        </div>
      </div>

      <!-- Main Content: Result (Left) / Config (Right) -->
      <div class="main-content">
        <!-- Result: Main Panel (Flex Grow) -->
        <div class="result-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <Icon icon="mdi:chart-box" class="panel-header-icon" />
              <span class="panel-header-text">分析结果</span>
            </div>
            <Space>
              <Button
                :type="showGuide ? 'primary' : 'text'"
                size="small"
                @click="openGuide"
              >
                <Icon icon="mdi:book-open-outline" /> 使用指南
              </Button>
              <Button
                :type="!showGuide ? 'primary' : 'text'"
                :ghost="false"
                size="small"
                @click="previewResult"
              >
                <Icon icon="mdi:eye-outline" />
                {{ hasResult ? '查看结果' : '结果预览' }}
              </Button>
              <div class="v-divider"></div>
              <Button type="primary" size="small" @click="downloadResult">
                <Icon icon="mdi:download" /> 下载
              </Button>
            </Space>
          </div>

          <div class="result-content">
            <div v-if="analyzing" class="loading-state">
              <Spin size="large" />
              <p class="mt-4 text-slate-500">正在进行数据分析，请耐心等待...</p>
            </div>

            <!-- 使用指南 (Embedded - High Priority) -->
            <div v-else-if="showGuide" class="guide-content">
              <div class="guide-card">
                <Typography>
                  <Typography.Title :level="3">快速开始</Typography.Title>
                  <Typography.Paragraph>
                    欢迎使用在线分析工具。本工具支持多种格式的数据文件输入，并提供高度可配置的参数选项。
                  </Typography.Paragraph>

                  <Typography.Title :level="4">1. 数据准备</Typography.Title>
                  <Typography.Paragraph>
                    请准备符合以下要求的 CSV 或 Excel 文件：
                    <ul>
                      <li>第一行为表头（列名）</li>
                      <li>第一列为样本或基因 ID</li>
                      <li>数值数据必须为纯数字</li>
                    </ul>
                  </Typography.Paragraph>

                  <Typography.Title :level="4">2. 参数设置</Typography.Title>
                  <Typography.Paragraph>
                    在右侧参数面板中配置分析参数：
                    <ul>
                      <li>
                        <strong>通用参数</strong>：包括图表标题、配色方案等。
                      </li>
                      <li>
                        <strong>特殊参数</strong
                        >：根据具体分析方法设置的阈值、算法选项等。
                      </li>
                    </ul>
                  </Typography.Paragraph>

                  <Typography.Title :level="4">3. 查看结果</Typography.Title>
                  <Typography.Paragraph>
                    点击“提交分析”后，系统将在左侧面板生成交互式图表。您可以：
                    <ul>
                      <li>缩放和拖拽图表</li>
                      <li>导出图片 (PNG/PDF)</li>
                      <li>下载原始分析结果文件</li>
                    </ul>
                  </Typography.Paragraph>

                  <div
                    class="demo-image-placeholder my-4 rounded border border-dashed bg-gray-50 p-4 text-center text-gray-400"
                  >
                    [示例数据截图占位符]
                  </div>
                </Typography>
              </div>
            </div>

            <!-- 动态结果渲染 -->
            <ResultRenderer
              v-else-if="hasResult && hasOutputConfig"
              :config="tool?.output_config ?? null"
              :output-dir="outputDir"
              :task-id="taskId"
            />

            <!-- 回退兼容：硬编码图表 -->
            <div
              v-else-if="hasResult && !hasOutputConfig"
              class="chart-container"
            >
              <EchartsUI ref="chartRef" />
            </div>

            <div v-else class="empty-state">
              <div class="empty-state-visual">
                <Icon icon="mdi:chart-timeline-variant" />
              </div>
              <div class="text-center">
                <h3 class="empty-title">准备就绪</h3>
                <p class="empty-desc">
                  请在左侧配置数据和参数，点击"提交分析"查看结果
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Config Panel (Fixed Width) -->
        <div class="control-panel">
          <div class="panel-scroll-content">
            <Tabs v-model:active-key="activeTab" class="config-tabs">
              <!-- Tab 1: Data Files -->
              <TabPane key="data" tab="数据文件">
                <div class="config-section">
                  <DataFileSelector
                    v-if="hasInputSchema"
                    v-model="inputFiles"
                    :schema="tool?.input_schema ?? null"
                    @next-step="activeTab = 'params'"
                  />
                  <DataFileSelector
                    v-else
                    v-model="inputFiles"
                    :schema="{
                      files: [{ key: 'data', label: '数据表', required: true }],
                    }"
                    @next-step="activeTab = 'params'"
                  />
                </div>
              </TabPane>

              <!-- Tab 2: Parameters -->
              <TabPane key="params" tab="参数设置">
                <div class="config-section params-section">
                  <DynamicForm
                    v-if="hasParamSchema"
                    v-model="formParams"
                    :schema="(tool?.param_schema as any) ?? null"
                    @reset="handleReset"
                    @import="handleImportParams"
                    @export="handleExportParams"
                    @submit="submitAnalysis"
                  />
                  <div v-else class="empty-schema">
                    <p>此工具暂无可配置参数</p>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </div>
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
    height: auto;
    padding: 0 16px 24px;
  }

  .control-panel {
    flex: none;
    width: 100%;
    max-width: 100%;
  }

  .result-panel {
    flex: none;
    height: 600px;
  }
}

:global(body) {
  --bg-color: #f8fafc;
}

.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: 0;
  overflow: hidden;
  background-color: #f8fafc !important;
}

.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}

.header-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.back-btn {
  color: #64748b;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
  background: #f1f5f9;
}

.tool-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 24px;
  background-color: #eff6ff;
  border-radius: 12px;
}

.tool-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #1e293b;
  letter-spacing: -0.01em;
}

/* Layout */
.main-content {
  display: flex;
  flex: 1; /* Take remaining height */
  gap: 16px;
  min-height: 0; /* Important for nested scrolling */
  padding: 0 16px 16px; /* Add bottom padding here */
}

/* Control Panel (now Right) */
.control-panel {
  display: flex;
  flex: 0 0 600px; /* Fixed width 600px */
  flex-direction: column;
  max-width: 600px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px; /* Smooth corners */
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.panel-scroll-content {
  flex: 1;
  overflow-y: auto;
  scrollbar-color: #cbd5e1 transparent;

  /* Custom Scrollbar for sleek look */
  scrollbar-width: thin;
}

:deep(.config-tabs .ant-tabs-nav) {
  padding: 0 16px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.config-tabs .ant-tabs-tab) {
  padding: 16px 0;
  margin: 0 16px 0 0;
  font-size: 15px;
  color: #64748b;
  transition: all 0.3s;
}

:deep(.config-tabs .ant-tabs-tab:hover) {
  color: var(--primary-color);
}

:deep(.config-tabs .ant-tabs-tab-active) {
  font-weight: 600;
}

:deep(.config-tabs .ant-tabs-tab-btn) {
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

/* Selected Tab Style */
:deep(.config-tabs .ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--primary-color);
  background: #eff6ff;
}

:deep(.config-tabs .ant-tabs-ink-bar) {
  display: none; /* Hide default ink bar for custom look */
}

.config-section {
  padding: 20px 24px;
}

.step-nav-area {
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px dashed #e2e8f0;
}

.submit-area {
  z-index: 10;
  padding: 24px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  box-shadow: 0 -4px 12px rgb(0 0 0 / 2%);
}

.submit-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgb(var(--primary-color-rgb) / 20%);
}

/* Result Panel (Right) */
.result-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title-group {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.panel-header-icon {
  font-size: 20px;
  color: #64748b;
}

.v-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: #e2e8f0;
}

.result-content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow-y: auto; /* Allow result content to scroll */
  background: #fff;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.guide-content {
  display: flex;
  flex: 1;
  justify-content: center;
  width: 100%;
}

.guide-card {
  width: 100%;
  max-width: 800px;
  padding: 40px;
  background: #fff;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-state-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  color: #cbd5e1;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 50%;
}

.empty-state-visual .iconify {
  font-size: 48px;
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #334155;
}

.empty-desc {
  max-width: 300px;
  font-size: 14px;
  color: #64748b;
}

.mt-4 {
  margin-top: 16px;
}

.empty-schema {
  padding: 24px;
  color: #94a3b8;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
}

/* Scientific Minimalism Design System */
</style>
