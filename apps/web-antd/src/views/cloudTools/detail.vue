<script lang="ts" setup>
/**
 * 分析工具通用使用页面 - 配置驱动版本
 *
 * 根据 tool.input_schema、param_schema、output_config 动态渲染
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { AnalysisTool } from '#/api/analysis-tools';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import { Button, message, Space, Spin, Tabs } from 'ant-design-vue';

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
  message.loading('正在分析中，请稍候...', 0);

  try {
    // TODO: 实际调用后端任务 API
    // const result = await createAnalysisTask({
    //   tool_id: toolId.value,
    //   inputs: inputFiles.value,
    //   params: formParams.value,
    // });

    // 模拟分析过程
    await new Promise((resolve) => setTimeout(resolve, 1500));

    hasResult.value = true;
    // outputDir.value = result.output_dir;
    // taskId.value = result.task_id;

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

onMounted(() => fetchTool());

// ========== 计算属性 ==========
const hasOutputConfig = computed(() => !!tool.value?.output_config);
const hasInputSchema = computed(() => !!tool.value?.input_schema);
const hasParamSchema = computed(() => !!tool.value?.param_schema);

// ========== 示例数据与辅助功能 ==========
// 加载示例数据
const loadExampleData = () => {
  // TODO: 从工具配置中获取示例数据
  message.info('正在加载示例数据...');
  // 模拟加载示例数据
  setTimeout(() => {
    message.success('示例数据已加载');
  }, 500);
};

// 下载示例数据
const downloadExampleData = () => {
  // TODO: 从工具配置中获取示例数据下载链接
  message.info('正在准备下载...');
};

// 打开使用指南
const openGuide = () => {
  // TODO: 根据工具配置打开使用指南
  message.info('使用指南功能开发中...');
};

// 打开视频教程
const openVideoTutorial = () => {
  // TODO: 根据工具配置打开视频教程
  message.info('视频教程功能开发中...');
};

// 预览结果
const previewResult = () => {
  if (!hasResult.value) {
    message.warning('请先提交分析');
    return;
  }
  message.info('预览结果...');
};

// 下载结果
const downloadResult = () => {
  if (!hasResult.value) {
    message.warning('请先提交分析');
    return;
  }
  message.info('下载结果...');
};
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
        <Space>
          <Button type="text"><Icon icon="mdi:thumb-up-outline" /> 打赏</Button>
          <Button type="text"><Icon icon="mdi:star-outline" /> 收藏</Button>
        </Space>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left: Result -->
        <div class="result-panel">
          <div class="panel-header">
            <Space>
              <Button type="text" size="small" @click="openGuide">
                <Icon icon="mdi:book-open-outline" /> 使用指南
              </Button>
              <Button type="text" size="small" @click="openVideoTutorial">
                <Icon icon="mdi:video-outline" /> 视频教程
              </Button>
            </Space>
            <Space>
              <Button size="small" type="primary" ghost @click="previewResult">
                <Icon icon="mdi:chart-bar" /> 预览结果
              </Button>
              <Button size="small" @click="downloadResult">
                <Icon icon="mdi:download" /> 下载结果
              </Button>
            </Space>
          </div>

          <div class="result-content">
            <div v-if="analyzing" class="loading-state">
              <Spin size="large" />
              <p>正在分析中，请稍候...</p>
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
                <Icon icon="mdi:chart-box-outline" />
              </div>
              <div class="text-center">
                <h3 class="empty-title">等待分析</h3>
                <p class="empty-desc">请在右侧配置数据和参数并提交分析</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Config Panel -->
        <div class="control-panel">
          <Tabs v-model:active-key="activeTab" size="small">
            <template #rightExtra>
              <Space size="small" style="padding-right: 16px">
                <Button type="link" size="small" @click="loadExampleData">
                  填充示例
                </Button>
                <Button type="link" size="small" @click="downloadExampleData">
                  下载示例
                </Button>
              </Space>
            </template>
            <!-- 数据文件选项卡 -->
            <Tabs.TabPane key="data" tab="数据文件">
              <div class="tab-content">
                <DataFileSelector
                  v-if="hasInputSchema"
                  v-model="inputFiles"
                  :schema="tool?.input_schema ?? null"
                />
                <div v-else class="empty-schema">
                  <p>此工具暂无文件配置</p>
                </div>
              </div>
            </Tabs.TabPane>
            <!-- 参数设置选项卡 -->
            <Tabs.TabPane key="params" tab="参数设置">
              <div class="tab-content">
                <DynamicForm
                  v-if="hasParamSchema"
                  v-model="formParams"
                  :schema="(tool?.param_schema as any) ?? null"
                />
                <div v-else class="empty-schema">
                  <p>此工具暂无可配置参数</p>
                </div>
              </div>
            </Tabs.TabPane>
          </Tabs>

          <div class="submit-area">
            <Button
              type="primary"
              size="large"
              block
              :loading="analyzing"
              :style="{ height: '48px', fontSize: '16px' }"
              @click="submitAnalysis"
            >
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
/* Scientific Minimalism Design System */
:global(body) {
  --bg-color: #f8fafc;
}

.page-container {
  min-height: 100vh;
  padding-bottom: 24px;
  background-color: #f8fafc !important; /* Slate 50 */
}

.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  margin-bottom: 24px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0; /* Slate 200 */
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}

.header-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.back-btn {
  color: #64748b; /* Slate 500 */
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
  background: #f1f5f9; /* Slate 100 */
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
  border-radius: 10px;

  /* Icon background handled inline */
}

.tool-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #1e293b; /* Slate 800 */
  letter-spacing: -0.01em;
}

.main-content {
  display: flex;
  gap: 24px;
  height: calc(100vh - 120px); /* Adjusted for header */
  padding: 0 32px;
}

.result-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;

  /* Soft shadow */
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}

.result-content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow: auto;
  background: #fff;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
}

.empty-state-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 50%;
}

.empty-state .iconify {
  font-size: 40px;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}

.empty-desc {
  max-width: 250px;
  font-size: 14px;
  color: #64748b;
  text-align: center;
}

.control-panel {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.tab-content {
  padding: 20px;
  overflow-y: auto;
}

.empty-schema {
  padding: 32px;
  color: #94a3b8;
  text-align: center;
}

.submit-area {
  padding: 20px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
}

/* Custom Tabs Styling */
:deep(.ant-tabs-nav) {
  padding: 0 20px;
  margin: 0 !important;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.ant-tabs-tab) {
  padding: 16px 0 !important;
  margin: 0 24px 0 0 !important;
  background: transparent !important;
  border: none !important;
  transition: all 0.3s;
}

:deep(.ant-tabs-tab-active) {
  font-weight: 600;
}

:deep(.ant-tabs-tab-btn) {
  font-size: 14px;
  color: #64748b;
}

:deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--primary-color) !important;
}

:deep(.ant-tabs-ink-bar) {
  height: 3px !important;
  background: var(--primary-color);
  border-radius: 3px 3px 0 0;
}

:deep(.ant-tabs-content) {
  height: calc(100% - 54px); /* Adjusted for nav height */
}

:deep(.ant-tabs-tabpane) {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
