<script setup lang="ts">
// 工具使用页面 - 参考原系统样式
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  Info,
  Loader2,
  XCircle,
} from 'lucide-vue-next';

import XSpreadsheet from '#/components/XSpreadsheet.vue';

// ========== 类型定义 ==========
interface InputField {
  key: string;
  label: string;
  required: boolean;
  accept?: string;
  description?: string;
  sampleData?: string;
}

interface ToolConfig {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  guide: string;
  inputs: InputField[];
  params: {
    groups: {
      expanded: boolean;
      fields: any[];
      key: string;
      label: string;
    }[];
  };
}

// ========== 路由参数 ==========
const route = useRoute();
const toolId = computed(() => route.params.id as string);

// ========== Mock 工具数据 ==========
const mockTools: Record<string, ToolConfig> = {
  '1': {
    id: '1',
    name: 'ROE 富集分析',
    version: '1.2.0',
    category: 'Bulk RNA',
    description: '计算基因集的观察/期望比值，评估富集程度。',
    guide: `# ROE 富集分析使用指南

## 简介

ROE (Ratio of Observed to Expected) 富集分析是一种用于评估基因集富集程度的方法。

## 输入文件

本工具需要 **两个输入文件**：

### 1. 表达矩阵
包含基因表达数据的 CSV 文件，列为样本，行为基因。

### 2. 分组信息
包含样本分组信息的 CSV 文件，用于定义实验组和对照组。

## 参数说明

- **P 值阈值**: 筛选显著性基因的阈值，默认 0.05
- **配色方案**: 选择输出图表的颜色主题
`,
    inputs: [
      {
        key: 'expression_matrix',
        label: '表达矩阵',
        required: true,
        accept: '.csv,.tsv,.txt',
        description: '基因表达数据，列为样本，行为基因',
        sampleData: `gene,sample1,sample2,sample3,sample4
IL6ST,2.5,3.1,1.8,2.9
MAL,1.2,0.8,1.5,1.1
LEF1,4.2,3.8,4.5,4.1
TCF7,2.1,2.3,1.9,2.2
TPT1,5.5,5.2,5.8,5.4
EEF1A1,6.1,5.9,6.3,6.0
GZMA,0.5,0.8,0.3,0.6
CCL5,1.1,1.4,0.9,1.2`,
      },
      {
        key: 'group_info',
        label: '分组信息',
        required: true,
        accept: '.csv,.tsv,.txt',
        description: '样本分组，包含 sample 和 group 列',
        sampleData: `sample,group
sample1,treatment
sample2,treatment
sample3,control
sample4,control`,
      },
    ],
    params: {
      // 参数分组
      groups: [
        {
          key: 'core',
          label: '核心参数',
          expanded: true,
          fields: [
            {
              key: 'gene_col',
              label: '基因名列',
              type: 'select',
              required: true,
              options: [],
              tooltip: '选择包含基因名称的列',
            },
            {
              key: 'log2fc_col',
              label: 'log2FC列',
              type: 'select',
              required: true,
              options: [],
              tooltip: '选择差异倍数列',
            },
            {
              key: 'pvalue_col',
              label: 'P值列',
              type: 'select',
              required: true,
              options: [],
              tooltip: '选择P值列',
            },
            {
              key: 'fc_threshold',
              label: '差异倍数阈值',
              type: 'number',
              default: 1.2,
              tooltip: '筛选差异基因的倍数阈值',
            },
            {
              key: 'pvalue_threshold',
              label: 'P值阈值',
              type: 'number',
              default: 0.05,
              tooltip: '筛选显著性的P值阈值',
            },
          ],
        },
        {
          key: 'visual',
          label: '可视化设置',
          expanded: false,
          fields: [
            {
              key: 'point_size',
              label: '点大小',
              type: 'number',
              default: 1.5,
              tooltip: '散点图点的大小',
            },
            {
              key: 'up_color',
              label: '上调颜色',
              type: 'color',
              default: '#e74c3c',
              tooltip: '上调基因的颜色',
            },
            {
              key: 'down_color',
              label: '下调颜色',
              type: 'color',
              default: '#3498db',
              tooltip: '下调基因的颜色',
            },
            {
              key: 'ns_color',
              label: '不显著颜色',
              type: 'color',
              default: '#95a5a6',
              tooltip: '不显著基因的颜色',
            },
          ],
        },
        {
          key: 'general',
          label: '通用参数',
          expanded: true,
          fields: [
            {
              key: 'legend_pos',
              label: '图例位置',
              type: 'select',
              default: 'none',
              options: [
                { value: 'none', label: 'none' },
                { value: 'top', label: 'top' },
                { value: 'bottom', label: 'bottom' },
                { value: 'left', label: 'left' },
                { value: 'right', label: 'right' },
              ],
              tooltip: '图例显示位置',
            },
            {
              key: 'fig_width',
              label: '图片宽度',
              type: 'number',
              default: 6,
              tooltip: '输出图片宽度(英寸)',
            },
            {
              key: 'fig_height',
              label: '图片高度',
              type: 'number',
              default: 5,
              tooltip: '输出图片高度(英寸)',
            },
          ],
        },
      ],
    },
  },
};

const tool = computed(() => mockTools[toolId.value] || null);

// ========== 多文件状态管理 ==========
interface FileData {
  file: File | null;
  fileName: string;
  data: any[][];
}

const filesData = ref<Record<string, FileData>>({});
const activeDataKey = ref<string>(''); // 当前选中的数据表 key

// 初始化文件状态
watch(
  tool,
  (newTool) => {
    if (newTool?.inputs) {
      const initialData: Record<string, FileData> = {};
      newTool.inputs.forEach((input: InputField) => {
        initialData[input.key] = { file: null, fileName: '', data: [] };
      });
      filesData.value = initialData;
      activeDataKey.value = newTool.inputs[0]?.key || '';
    }
  },
  { immediate: true },
);

// ========== 主Tab状态 ==========
const mainTab = ref<'data' | 'params'>('data');
const rightActiveTab = ref<'guide' | 'result'>('guide');

// ========== 参数表单状态 ==========
const formValues = ref<Record<string, any>>({});
const expandedGroups = ref<Record<string, boolean>>({});

// ========== 分析状态 ==========
type AnalysisStatus = 'error' | 'idle' | 'running' | 'success';
const analysisStatus = ref<AnalysisStatus>('idle');
const analysisProgress = ref(0);

// ========== 初始化参数默认值 ==========
onMounted(() => {
  if (tool.value?.params?.groups) {
    tool.value.params.groups.forEach((group: any) => {
      // 初始化分组展开状态
      expandedGroups.value[group.key] = group.expanded !== false;
      // 初始化字段默认值
      group.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          formValues.value[field.key] = field.default;
        }
      });
    });
  }
});

// ========== 当前数据表的信息 ==========
const currentInput = computed(() => {
  return tool.value?.inputs.find(
    (i: InputField) => i.key === activeDataKey.value,
  );
});

const currentData = computed(() => {
  return filesData.value[activeDataKey.value]?.data || [];
});

// ========== 方法 ==========
function loadSampleData() {
  // 加载所有输入的示例数据
  if (!tool.value?.inputs) return;

  tool.value.inputs.forEach((input: InputField) => {
    const fileData = filesData.value[input.key];
    if (input.sampleData && fileData) {
      fileData.fileName = `${input.label}_示例.csv`;
      parseCSV(input.sampleData, input.key);
    }
  });
}

function downloadSampleData() {
  const input = currentInput.value;
  if (!input?.sampleData) return;

  const blob = new Blob([input.sampleData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${input.label}_示例数据表.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  const currentFileData = filesData.value[activeDataKey.value];
  if (!file || !currentFileData) return;

  currentFileData.file = file;
  currentFileData.fileName = file.name;

  const content = await file.text();
  parseCSV(content, activeDataKey.value);
}

function parseCSV(content: string, inputKey: string) {
  const lines = content.trim().split('\n');
  const data: any[][] = lines.map((line) => {
    return line.split(',').map((cell) => cell.trim());
  });
  if (filesData.value[inputKey]) {
    filesData.value[inputKey].data = data;
  }
}

// 处理表格编辑变化
function handleSpreadsheetChange(newData: any[][]) {
  const fileData = activeDataKey.value
    ? filesData.value[activeDataKey.value]
    : null;
  if (fileData) {
    fileData.data = newData;
  }
}

function clearData() {
  const fileData = filesData.value[activeDataKey.value];
  if (fileData) {
    filesData.value[activeDataKey.value] = {
      file: null,
      fileName: '',
      data: [],
    };
  }
}

// 切换参数分组展开/折叠
function toggleGroup(groupKey: string) {
  expandedGroups.value[groupKey] = !expandedGroups.value[groupKey];
}

// 重置参数为默认值
function resetParams() {
  if (!tool.value?.params?.groups) return;

  tool.value.params.groups.forEach((group: any) => {
    group.fields.forEach((field: any) => {
      formValues.value[field.key] =
        field.default === undefined ? '' : field.default;
    });
  });
}

// 检查所有必填输入是否已填写
const allRequiredInputsFilled = computed(() => {
  if (!tool.value?.inputs) return false;
  return tool.value.inputs
    .filter((input: InputField) => input.required)
    .every((input: InputField) => filesData.value[input.key]?.data.length > 0);
});

async function submitAnalysis() {
  if (!allRequiredInputsFilled.value) {
    console.warn('请先上传所有必填数据');
    return;
  }

  analysisStatus.value = 'running';
  analysisProgress.value = 0;
  rightActiveTab.value = 'result';

  const interval = setInterval(() => {
    analysisProgress.value += Math.random() * 15;
    if (analysisProgress.value >= 100) {
      analysisProgress.value = 100;
      clearInterval(interval);
      analysisStatus.value = 'success';
    }
  }, 300);
}

function goToNextStep() {
  if (mainTab.value === 'data') {
    mainTab.value = 'params';
  } else {
    submitAnalysis();
  }
}
</script>

<script lang="ts">
// Markdown 渲染
function renderMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replaceAll(
      /^### (.*$)/gm,
      '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>',
    )
    .replaceAll(
      /^## (.*$)/gm,
      '<h2 class="text-xl font-bold mt-8 mb-3 text-slate-800">$1</h2>',
    )
    .replaceAll(
      /^# (.*$)/gm,
      '<h1 class="text-2xl font-bold mb-4 text-slate-900">$1</h1>',
    )
    .replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replaceAll(
      /`(.*?)`/g,
      '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">$1</code>',
    )
    .replaceAll(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replaceAll('\n\n', '</p><p class="my-3 text-slate-600">')
    .replaceAll('\n', '<br/>');
}
</script>

<template>
  <div v-if="tool" class="min-h-screen bg-slate-50">
    <!-- 面包屑导航 -->
    <div class="border-b border-slate-200 bg-white px-6 py-3">
      <div class="mx-auto flex max-w-[1600px] items-center gap-2 text-sm">
        <router-link
          to="/tools"
          class="text-slate-500 transition-colors hover:text-blue-600"
        >
          云工具
        </router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="font-medium text-slate-900">{{ tool.name }}</span>
        <span
          class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
        >
          v{{ tool.version }}
        </span>
      </div>
    </div>

    <!-- 主内容区 - 40/60 分屏 -->
    <div class="mx-auto max-w-[1600px] p-6">
      <div class="flex gap-6" style="min-height: calc(100vh - 180px)">
        <!-- ===== 左侧面板 (40%) ===== -->
        <div
          class="flex w-2/5 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <!-- 主Tab头：数据文件 / 参数设置 -->
          <div class="flex border-b border-slate-200">
            <button
              @click="mainTab = 'data'"
              class="relative cursor-pointer px-6 py-4 text-sm font-medium transition-colors"
              :class="[
                mainTab === 'data'
                  ? 'bg-white text-blue-600'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-700',
              ]"
            >
              数据文件
              <div
                v-if="mainTab === 'data'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              ></div>
            </button>
            <button
              @click="mainTab = 'params'"
              class="relative cursor-pointer px-6 py-4 text-sm font-medium transition-colors"
              :class="[
                mainTab === 'params'
                  ? 'bg-white text-blue-600'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-700',
              ]"
            >
              参数设置
              <div
                v-if="mainTab === 'params'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              ></div>
            </button>
          </div>

          <!-- Tab 内容区 -->
          <div class="flex flex-1 flex-col overflow-hidden">
            <!-- ===== 数据文件 Tab ===== -->
            <div
              v-if="mainTab === 'data'"
              class="flex flex-1 flex-col overflow-hidden p-4"
            >
              <!-- 示例按钮行 -->
              <div class="mb-4 flex items-center gap-3">
                <button
                  @click="loadSampleData"
                  class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 active:scale-95"
                >
                  示 例
                </button>
                <button
                  @click="downloadSampleData"
                  class="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                >
                  下载示例 数据表
                </button>
              </div>

              <!-- 数据输入行 -->
              <div class="mb-4 flex items-center gap-3">
                <span class="whitespace-nowrap text-sm text-slate-600">
                  <span class="text-red-500">*</span>
                  {{ currentInput?.label || '数据' }}：
                </span>
                <input
                  type="text"
                  :value="filesData[activeDataKey]?.fileName || ''"
                  readonly
                  placeholder="请编辑下方表格"
                  class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                />
                <label
                  class="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 active:scale-95"
                >
                  导 入
                  <input
                    type="file"
                    class="hidden"
                    :accept="currentInput?.accept"
                    @change="handleFileUpload"
                  />
                </label>
                <button
                  @click="clearData"
                  class="cursor-pointer rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
                >
                  清 空
                </button>
              </div>

              <!-- 数据表子Tab -->
              <div class="mb-2 flex gap-1">
                <button
                  v-for="input in tool.inputs"
                  :key="input.key"
                  @click="activeDataKey = input.key"
                  class="cursor-pointer rounded-t-lg border px-4 py-2 text-sm font-medium transition-colors"
                  :class="[
                    activeDataKey === input.key
                      ? 'relative z-10 -mb-px border-slate-300 border-b-white bg-white text-blue-600'
                      : 'border-transparent bg-slate-100 text-slate-500 hover:text-slate-700',
                  ]"
                >
                  {{ input.label }}
                  <span
                    v-if="filesData[input.key]?.data.length > 0"
                    class="ml-1 text-green-500"
                    >✓</span
                  >
                </button>
              </div>

              <!-- 表格区域 - x-data-spreadsheet -->
              <div
                class="flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white"
              >
                <XSpreadsheet
                  :data="currentData"
                  height="100%"
                  @change="handleSpreadsheetChange"
                />
              </div>

              <!-- 底部提示 + 按钮（同一行） -->
              <div class="mt-3 flex items-center justify-between gap-4">
                <div class="flex items-start gap-2 text-xs text-blue-600">
                  <Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    对于较大的数据文件，在线编辑可能会导致卡顿，请切换到文件模式；
                    在文件模式下，表格不可编辑且仅展示1000行；超过100M的文件请先上传到云盘
                  </span>
                </div>
                <button
                  @click="goToNextStep"
                  :disabled="mainTab === 'data' && !allRequiredInputsFilled"
                  class="flex-shrink-0 cursor-pointer rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {{ mainTab === 'data' ? '下一步' : '提交分析' }}
                </button>
              </div>
            </div>

            <!-- ===== 参数设置 Tab ===== -->
            <div
              v-if="mainTab === 'params'"
              class="flex flex-1 flex-col overflow-hidden"
            >
              <!-- 参数分组内容 -->
              <div class="flex-1 space-y-3 overflow-auto p-4">
                <div
                  v-for="group in tool.params.groups"
                  :key="group.key"
                  class="overflow-hidden rounded-lg border border-slate-200"
                >
                  <!-- 分组头部 -->
                  <button
                    @click="toggleGroup(group.key)"
                    class="flex w-full cursor-pointer items-center gap-2 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                  >
                    <ChevronRight
                      class="h-4 w-4 text-slate-500 transition-transform"
                      :class="{ 'rotate-90': expandedGroups[group.key] }"
                    />
                    <span class="text-sm font-medium text-slate-700">{{
                      group.label
                    }}</span>
                  </button>

                  <!-- 分组内容 -->
                  <div v-if="expandedGroups[group.key]" class="bg-white p-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div
                        v-for="field in group.fields"
                        :key="field.key"
                        class="space-y-1"
                      >
                        <!-- 标签 -->
                        <label
                          class="flex items-center gap-1 text-sm text-slate-600"
                        >
                          {{ field.label }}
                          <span v-if="field.required" class="text-red-500"
                            >*</span
                          >
                          <span
                            v-if="field.tooltip"
                            class="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400"
                            :title="field.tooltip"
                          >
                            ?
                          </span>
                        </label>

                        <!-- Number Input -->
                        <input
                          v-if="field.type === 'number'"
                          type="number"
                          v-model.number="formValues[field.key]"
                          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        <!-- Select Input -->
                        <select
                          v-if="field.type === 'select'"
                          v-model="formValues[field.key]"
                          class="w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option
                            v-for="opt in field.options"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </option>
                        </select>

                        <!-- Color Input -->
                        <div
                          v-if="field.type === 'color'"
                          class="flex items-center gap-2"
                        >
                          <input
                            type="color"
                            v-model="formValues[field.key]"
                            class="h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-slate-300"
                            style="padding: 0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 底部操作按钮 -->
              <div
                class="flex items-center gap-3 border-t border-slate-200 bg-slate-50 p-4"
              >
                <button
                  @click="resetParams"
                  class="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  重 置
                </button>
                <button
                  class="flex cursor-pointer items-center gap-1 rounded-lg border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Download class="h-4 w-4" />
                  导入参数文件
                </button>
                <button
                  class="flex cursor-pointer items-center gap-1 rounded-lg border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Download class="h-4 w-4" />
                  导出参数文件
                </button>
                <button
                  @click="submitAnalysis"
                  :disabled="!allRequiredInputsFilled"
                  class="ml-auto cursor-pointer rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  提 交
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 右侧面板 (60%) ===== -->
        <div
          class="flex w-3/5 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <!-- Tab 头 -->
          <div class="flex border-b border-slate-200 bg-slate-50">
            <button
              @click="rightActiveTab = 'guide'"
              class="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
              :class="[
                rightActiveTab === 'guide'
                  ? '-mb-px border-b-2 border-blue-600 bg-white text-blue-600'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              <BookOpen class="h-4 w-4" />
              使用指南
            </button>
            <button
              @click="rightActiveTab = 'result'"
              class="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium transition-colors"
              :class="[
                rightActiveTab === 'result'
                  ? '-mb-px border-b-2 border-blue-600 bg-white text-blue-600'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              <BarChart3 class="h-4 w-4" />
              结果预览
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="flex-1 overflow-auto p-6">
            <!-- 使用指南 Tab -->
            <div
              v-if="rightActiveTab === 'guide'"
              class="prose prose-slate max-w-none"
            >
              <div v-html="renderMarkdown(tool.guide)"></div>
            </div>

            <!-- 结果预览 Tab -->
            <div v-if="rightActiveTab === 'result'" class="h-full">
              <!-- 空状态 -->
              <div
                v-if="analysisStatus === 'idle'"
                class="flex h-full flex-col items-center justify-center text-slate-400"
              >
                <BarChart3 class="mb-4 h-16 w-16 opacity-50" />
                <p class="text-lg font-medium">等待分析</p>
                <p class="mt-1 text-sm">上传所有必填数据后点击"提交分析"开始</p>
              </div>

              <!-- 运行中 -->
              <div
                v-if="analysisStatus === 'running'"
                class="flex h-full flex-col items-center justify-center"
              >
                <Loader2 class="mb-4 h-16 w-16 animate-spin text-blue-500" />
                <p class="text-lg font-medium text-slate-700">正在分析中...</p>
                <div class="mt-4 w-64">
                  <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      class="h-full bg-blue-500 transition-all duration-300"
                      :style="{ width: `${analysisProgress}%` }"
                    ></div>
                  </div>
                  <p class="mt-2 text-center text-sm text-slate-500">
                    {{ Math.round(analysisProgress) }}%
                  </p>
                </div>
              </div>

              <!-- 成功 -->
              <div v-if="analysisStatus === 'success'" class="space-y-6">
                <div
                  class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4"
                >
                  <CheckCircle2 class="h-6 w-6 text-green-600" />
                  <div>
                    <p class="font-medium text-green-800">分析完成</p>
                    <p class="text-sm text-green-600">
                      结果已生成，可下载或预览
                    </p>
                  </div>
                </div>

                <!-- Mock 结果 -->
                <div class="overflow-hidden rounded-lg border border-slate-200">
                  <div class="border-b border-slate-200 bg-slate-50 px-4 py-2">
                    <span class="text-sm font-medium text-slate-700"
                      >结果图表</span
                    >
                  </div>
                  <div
                    class="flex items-center justify-center bg-slate-100 p-6"
                    style="height: 300px"
                  >
                    <div class="text-center text-slate-400">
                      <BarChart3 class="mx-auto mb-3 h-20 w-20 opacity-50" />
                      <p class="text-sm">[Mock] ROE 富集分析结果图表</p>
                    </div>
                  </div>
                </div>

                <div class="flex gap-3">
                  <button
                    class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Download class="h-4 w-4" />
                    下载图表 (PNG)
                  </button>
                  <button
                    class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Download class="h-4 w-4" />
                    下载结果表格 (CSV)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 工具不存在 -->
  <div v-else class="flex min-h-screen items-center justify-center bg-slate-50">
    <div class="text-center">
      <XCircle class="mx-auto mb-4 h-16 w-16 text-slate-300" />
      <h1 class="text-xl font-bold text-slate-700">工具不存在</h1>
      <p class="mt-2 text-slate-500">请从云工具选择一个工具</p>
      <router-link
        to="/tools"
        class="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        返回云工具
      </router-link>
    </div>
  </div>
</template>
