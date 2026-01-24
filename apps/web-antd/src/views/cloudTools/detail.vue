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

import {
  executeAnalysisTool,
  getAnalysisTool,
  getTaskStatus,
  type TaskStatusResponse,
} from '#/api/analysis-tools';

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

// 简单的 Markdown 转 HTML 函数
function simpleMarkdownToHtml(md: string): string {
  return md
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 代码块
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
      return `<pre><code>${code}</code></pre>`;
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 无序列表
    .replace(/^\s*[-*+] (.*)$/gim, '<li>$1</li>')
    // 有序列表
    .replace(/^\s*\d+\. (.*)$/gim, '<li>$1</li>')
    // 引用
    .replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 水平线
    .replace(/^---$/gim, '<hr>')
    // 换行
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// 渲染 guide_doc
const renderedGuideHtml = computed(() => {
  const doc = tool.value?.guide_doc;
  if (!doc) return '';
  return `<p>${simpleMarkdownToHtml(doc)}</p>`;
});

// ========== 表单状态 ==========
const inputFiles = ref<Record<string, null | number>>({});
const formParams = ref<Record<string, unknown>>({});

// ========== 表头状态 ==========
const currentHeaders = ref<Record<string, string[]>>({});
const handleHeadersChange = (headers: Record<string, string[]>) => {
  currentHeaders.value = headers;
  console.log('[detail] Headers updated:', headers);
};

// 动态生成参数模式（注入表头选项）
const dynamicParamSchema = computed(() => {
  if (!tool.value?.param_schema) return null;

  // 深拷贝原始 schema 以免污染原始数据
  const schema = JSON.parse(JSON.stringify(tool.value.param_schema));

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties) as any) {
      if (prop.widget === 'column_select') {
        // 智能获取列名选项
        // 优先使用绑定的 fileKey，否则默认使用第一个输入文件
        const fileKey = prop.fileKey || tool.value.example_data?.[0]?.key || 'data_input';
        const headers = currentHeaders.value[fileKey] || [];
        
        if (headers.length > 0) {
          prop.type = 'string';
          prop.enum = headers;
        }
      }
    }
  }
  return schema;
});

// ========== 结果状态 ==========
const hasResult = ref(false);
const taskId = ref<string>('');
const outputDir = ref<string>('');

// ========== 组件引用 ==========
const dataFileSelectorRef = ref<InstanceType<typeof DataFileSelector>>();


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

  // 验证必填参数
  const paramSchema = tool.value?.param_schema as null | {
    properties?: Record<string, { title?: string; required?: boolean }>;
  };
  if (paramSchema?.properties) {
    for (const [key, config] of Object.entries(paramSchema.properties)) {
      if (config.required) {
        const value = formParams.value[key];
        // 检查值是否为空（null、undefined、空字符串）
        if (value === null || value === undefined || value === '') {
          message.warning(`${config.title || key} 是必填项`);
          return;
        }
      }
    }
  }

  analyzing.value = true;
  showGuide.value = false;
  message.loading('正在提交分析任务...', 0);

  try {
    // 获取表格数据内容
    const fileContents = dataFileSelectorRef.value?.getFileContents() ?? {};
    
    // 调用执行 API
    const response = await executeAnalysisTool(toolId.value, {
      files: inputFiles.value,
      file_contents: fileContents,
      params: formParams.value,
    });

    taskId.value = String(response.task_id);
    message.destroy();
    message.loading('任务已提交，正在分析中...', 0);

    // 轮询任务状态
    const pollStatus = async (): Promise<TaskStatusResponse> => {
      const status = await getTaskStatus(response.task_id);
      if (status.status === 'pending' || status.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return pollStatus();
      }
      return status;
    };

    const finalStatus = await pollStatus();
    message.destroy();

    if (finalStatus.status === 'completed') {
      outputDir.value = finalStatus.output_dir || '';
      hasResult.value = true;
      message.success('分析完成！');

      // 回退兼容：如果没有 output_config，使用硬编码图表
      if (!tool.value?.output_config) {
        setTimeout(() => renderLegacyChart(), 100);
      }
    } else {
      message.error(finalStatus.error_message || '分析失败，请重试');
    }
  } catch (error: any) {
    message.destroy();
    message.error(error?.message || '分析失败，请重试');
    console.error(error);
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
                <!-- 使用 Vditor.md2html 渲染的纯 HTML -->
                <div
                  v-if="renderedGuideHtml"
                  class="guide-md-content vditor-reset"
                  v-html="renderedGuideHtml"
                ></div>
                <!-- Fallback: 默认通用指南 -->
                <Typography v-else>
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
                    点击"提交分析"后，系统将在左侧面板生成交互式图表。您可以：
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
                    ref="dataFileSelectorRef"
                    v-model="inputFiles"
                    :schema="tool?.input_schema ?? null"
                    :example-data="tool?.example_data ?? null"
                    @headers-change="handleHeadersChange"
                    @next-step="activeTab = 'params'"
                  />
                  <DataFileSelector
                    v-else
                    ref="dataFileSelectorRef"
                    v-model="inputFiles"
                    :schema="{
                      files: [{ key: 'data', label: '数据表', required: true }],
                    }"
                    :example-data="tool?.example_data ?? null"
                    @headers-change="handleHeadersChange"
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
                    :schema="(dynamicParamSchema as any) ?? null"
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
  min-height: 0; /* Important for flex child scrolling */
  overflow: hidden;
  background: #fff;
}

/* 非使用指南状态下居中显示 */
.result-content:has(.loading-state),
.result-content:has(.empty-state),
.result-content:has(.chart-container) {
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.guide-content {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.guide-card {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow-y: auto;
  background: #fff;
}

/* Markdown 内容样式 - 使用 Vditor 的 vditor-reset 基础样式 */
.guide-md-content {
  width: 100%;
  padding: 24px 32px;
  font-size: 15px;
  line-height: 1.8;
  color: #334155;
}

.guide-md-content h1 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.guide-md-content h2 {
  margin-top: 24px;
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.guide-md-content h3 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.guide-md-content p {
  margin-bottom: 12px;
}

.guide-md-content ul,
.guide-md-content ol {
  padding-left: 24px;
  margin-bottom: 12px;
}

.guide-md-content li {
  margin-bottom: 6px;
}

.guide-md-content code {
  padding: 2px 6px;
  font-size: 13px;
  background: #f1f5f9;
  border-radius: 4px;
}

.guide-md-content pre {
  padding: 16px;
  margin-bottom: 12px;
  overflow-x: auto;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.guide-md-content blockquote {
  padding-left: 16px;
  margin: 12px 0;
  color: #64748b;
  border-left: 4px solid #3b82f6;
}

.guide-md-content table {
  width: 100%;
  margin-bottom: 12px;
  border-collapse: collapse;
}

.guide-md-content th,
.guide-md-content td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid #e2e8f0;
}

.guide-md-content th {
  background: #f8fafc;
  font-weight: 600;
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
