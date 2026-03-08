<script setup lang="ts">
/**
 * 云流程详情页
 * 6 步分析导航 + 参数配置 + 结果展示
 * 第1步"数据读取"自动从创建时选的文件夹加载样本表格
 */
import type { Pipeline, StepConfig, StepType } from './types/pipeline';
import type { ParamFieldConfig } from './types/stepParamConfigs';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Database,
  FileText,
  Filter,
  Folder,
  Group,
  Loader2,
  Pencil,
  Play,
  ScatterChart,
  Settings,
  Tag,
} from 'lucide-vue-next';

import {
  getPipeline as fetchPipelineApi,
  getFilesInFolder,
  getStepLogs,
  runStep as runStepApi,
  updateSampleDict,
} from '#/api/pipeline';

import { STEP_DESCRIPTIONS, STEP_LABELS } from './types/pipeline';
import { STEP_PARAM_CONFIGS } from './types/stepParamConfigs';

const route = useRoute();
const router = useRouter();

const pipeline = ref<null | Pipeline>(null);
const loading = ref(false);
const activeStepIndex = ref(0);
const running = ref(false);
const showAdvanced = ref(false);
const activeContentTab = ref<'params' | 'results'>('params');

// 步骤图标映射
const stepIcons: Record<StepType, typeof Database> = {
  data_load: Database,
  qc_filter: Filter,
  preprocessing: Settings,
  dim_reduce: ScatterChart,
  clustering: Group,
  annotation: Tag,
};

// ========== 数据读取步骤：样本表格 ==========

// 样本行数据
interface SampleRow {
  sample: string; // 子文件夹名（只读）
  sampleName: string; // 可编辑
  group: string; // 可编辑
}

// 样本表格
const sampleRows = ref<SampleRow[]>([]);
const loadingSamples = ref(false);

// 根据 pipeline 数据加载样本（优先使用已保存的 sampleDict）
const loadSamplesFromPipeline = async () => {
  if (!pipeline.value?.dataPath) return;
  loadingSamples.value = true;
  try {
    // 先从文件系统获取实际的样本目录列表
    const samples = await getFilesInFolder(pipeline.value.dataPath);
    const folderNames = samples.map((s) => s.folderName);

    // 如果 pipeline 已有保存的 sampleDict，用它来恢复用户修改
    const savedDict = pipeline.value.sampleDict;
    if (savedDict && Object.keys(savedDict).length > 0) {
      // 从 sampleDict 反向构建 sampleRows
      // sampleDict 格式: {"NC": ["NC1", "NC2"], "T": ["T1", "T2"]}
      const rows: SampleRow[] = [];
      for (const [group, sampleNames] of Object.entries(savedDict)) {
        for (const name of sampleNames as string[]) {
          // 查找对应的文件夹名（sample 列）
          const folder = folderNames.find((f) => f === name) || name;
          rows.push({
            sample: folder,
            sampleName: name,
            group,
          });
        }
      }
      // 确保文件系统中的目录都在列表中（可能有新增的）
      for (const folder of folderNames) {
        if (!rows.some((r) => r.sample === folder)) {
          rows.push({ sample: folder, sampleName: folder, group: '' });
        }
      }
      sampleRows.value = rows;
    } else {
      // 没有保存过，使用文件夹名初始化
      sampleRows.value = samples.map((s) => ({
        sample: s.folderName,
        sampleName: s.folderName,
        group: s.folderName,
      }));
    }
  } finally {
    loadingSamples.value = false;
  }
};

// 从 sampleRows 构建 sample_dict 格式
const buildSampleDict = (): Record<string, string[]> => {
  const dict: Record<string, string[]> = {};
  for (const row of sampleRows.value) {
    const group = row.group || 'default';
    if (!dict[group]) dict[group] = [];
    dict[group].push(row.sampleName || row.sample);
  }
  return dict;
};

// 防抖保存样本编辑到后端
let saveSampleTimer: null | ReturnType<typeof setTimeout> = null;
const saveSampleDict = () => {
  if (!pipeline.value) return;
  if (saveSampleTimer) clearTimeout(saveSampleTimer);
  saveSampleTimer = setTimeout(async () => {
    try {
      const dict = buildSampleDict();
      await updateSampleDict(pipeline.value!.id, dict);
      // 同步更新本地 pipeline 对象
      if (pipeline.value) {
        pipeline.value.sampleDict = dict;
      }
    } catch (error) {
      console.error('保存样本分组失败:', error);
    }
  }, 1000);
};

// ========== 日志抽屉 ==========
const showLogDrawer = ref(false);

// 日志条目
interface LogEntry {
  time: string;
  level: string;
  message: string;
}

// 按步骤索引存储日志
const stepLogsMap = ref<Record<number, LogEntry[]>>({});

// 当前步骤的日志
const currentStepLogs = computed(() => {
  return stepLogsMap.value[activeStepIndex.value] || [];
});

// ========== 通用逻辑 ==========

// 首次加载标记
const isInitialLoad = ref(true);

// 加载流程
const fetchPipeline = async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    pipeline.value = await fetchPipelineApi(id);
    if (pipeline.value) {
      // 仅首次加载时跳转到当前进行的步骤
      if (isInitialLoad.value) {
        activeStepIndex.value = Math.min(
          pipeline.value.currentStep,
          pipeline.value.steps.length - 1,
        );
        isInitialLoad.value = false;
      }
      // 如果当前是数据读取步骤，自动加载样本
      if (
        pipeline.value.steps[activeStepIndex.value]?.stepType === 'data_load'
      ) {
        await loadSamplesFromPipeline();
      }
      // 检测是否有运行中的步骤，自动恢复轮询
      const runningStepIdx = pipeline.value.steps.findIndex(
        (s) => s.status === 'running',
      );
      if (runningStepIdx !== -1 && !pollTimer) {
        activeStepIndex.value = runningStepIdx;
        startPolling(runningStepIdx);
      }
    }
  } catch (error) {
    console.error('加载流程失败:', error);
  } finally {
    loading.value = false;
  }
};

// 当前活跃步骤
const activeStep = computed<null | StepConfig>(() => {
  if (!pipeline.value) return null;
  return pipeline.value.steps[activeStepIndex.value] ?? null;
});

// 是否是数据读取步骤
const isDataLoadStep = computed(() => {
  return activeStep.value?.stepType === 'data_load';
});

// ========== 参数表单逻辑 ==========

// 当前步骤的参数配置列表
const currentStepParamConfigs = computed<ParamFieldConfig[]>(() => {
  if (!activeStep.value) return [];
  return STEP_PARAM_CONFIGS[activeStep.value.stepType] || [];
});

// 常用参数
const basicParams = computed(() => {
  return currentStepParamConfigs.value.filter((cfg) => !cfg.advanced);
});

// 高级参数
const advancedParams = computed(() => {
  return currentStepParamConfigs.value.filter((cfg) => cfg.advanced);
});

// 设置参数值
const setParam = (key: string, value: unknown) => {
  if (!activeStep.value) return;
  activeStep.value.params[key] = value;
};

// 步进调整数字参数
const adjustParam = (
  key: string,
  delta: number,
  min?: number,
  max?: number,
) => {
  if (!activeStep.value) return;
  const current = Number(activeStep.value.params[key]) || 0;
  let next = current + delta;
  // 保留合理精度（避免浮点数问题）
  next = Math.round(next * 1000) / 1000;
  if (min !== undefined) next = Math.max(next, min);
  if (max !== undefined) next = Math.min(next, max);
  activeStep.value.params[key] = next;
};

// 步骤是否可点击
const isStepClickable = (idx: number) => {
  if (!pipeline.value) return false;
  // 方式1：current_step 已推进到该步骤或之后
  if (idx <= pipeline.value.currentStep) return true;
  // 方式2：前置步骤已经完成（兼容旧数据 current_step 未正确更新的情况）
  if (idx > 0) {
    const prevStep = pipeline.value.steps[idx - 1];
    if (prevStep && prevStep.status === 'completed') return true;
  }
  return false;
};

// 运行当前步骤（调用后端 API，轮询状态）
// 日志轮询定时器
let logPollTimer: null | ReturnType<typeof setInterval> = null;
// 轮询定时器引用（用于清理）
let pollTimer: null | ReturnType<typeof setInterval> = null;

// 轮询获取真实日志
const startLogPolling = (stepIdx: number) => {
  if (logPollTimer) clearInterval(logPollTimer);

  const fetchLogs = async () => {
    if (!pipeline.value) return;
    try {
      const logs = await getStepLogs(pipeline.value.id, stepIdx);
      if (logs && logs.length > 0) {
        stepLogsMap.value[stepIdx] = logs;
      }
    } catch {
      // 日志获取失败不影响主流程
    }
  };

  // 立即获取一次
  fetchLogs();
  // 每 2 秒轮询
  logPollTimer = setInterval(fetchLogs, 2000);
};

// 停止日志轮询
const stopLogPolling = () => {
  if (logPollTimer) {
    clearInterval(logPollTimer);
    logPollTimer = null;
  }
};

// 启动轮询：定期检查步骤状态直到完成
const startPolling = (stepIdx: number) => {
  // 清理已有的轮询
  if (pollTimer) clearInterval(pollTimer);
  running.value = true;

  pollTimer = setInterval(async () => {
    try {
      const updated = await fetchPipelineApi(pipeline.value!.id);
      const step = updated.steps[stepIdx];
      if (step && (step.status === 'completed' || step.status === 'error')) {
        clearInterval(pollTimer!);
        pollTimer = null;
        pipeline.value = updated;
        running.value = false;
        // 最后获取一次日志确保完整
        if (pipeline.value) {
          try {
            const finalLogs = await getStepLogs(pipeline.value.id, stepIdx);
            if (finalLogs && finalLogs.length > 0) {
              stepLogsMap.value[stepIdx] = finalLogs;
            }
          } catch {}
        }
        stopLogPolling();
        // 运行完成后自动切换到结果 Tab
        if (step.status === 'completed') {
          activeContentTab.value = 'results';
        }
      }
    } catch {
      clearInterval(pollTimer!);
      pollTimer = null;
      running.value = false;
      stopLogPolling();
    }
  }, 3000); // 每 3 秒轮询一次
};

const handleRunStep = async () => {
  if (!pipeline.value || !activeStep.value) return;
  running.value = true;
  try {
    // 派发 Celery 任务
    await runStepApi(
      pipeline.value.id,
      activeStepIndex.value,
      activeStep.value.params,
    );
    // 清空旧日志
    stepLogsMap.value[activeStepIndex.value] = [];
    // 启动日志轮询（获取真实运行日志）
    startLogPolling(activeStepIndex.value);
    // 启动状态轮询
    startPolling(activeStepIndex.value);
  } catch (error) {
    console.error('运行步骤失败:', error);
    running.value = false;
  }
};

// 打开日志抽屉
const openLogDrawer = async () => {
  // 如果没有日志，尝试从 API 获取
  if (pipeline.value && !stepLogsMap.value[activeStepIndex.value]?.length) {
    try {
      const logs = await getStepLogs(pipeline.value.id, activeStepIndex.value);
      if (logs && logs.length > 0) {
        stepLogsMap.value[activeStepIndex.value] = logs;
      }
    } catch {}
  }
  showLogDrawer.value = true;
};

// 步骤样式
const getStepClass = (step: StepConfig, idx: number) => {
  const isActive = idx === activeStepIndex.value;
  if (step.status === 'completed') {
    return isActive
      ? 'border-emerald-500 bg-emerald-50'
      : 'border-transparent hover:bg-slate-50';
  }
  if (step.status === 'running') {
    return 'border-blue-500 bg-blue-50';
  }
  if (isActive) {
    return 'border-blue-500 bg-blue-50/50';
  }
  return 'border-transparent opacity-60';
};

// 统计标签中文映射
const STAT_LABELS: Record<string, string> = {
  total_cells: '总细胞数',
  total_genes: '总基因数',
  n_samples: '样本数',
  n_clusters: '聚类数',
  n_hvg: '高变基因数',
  n_pcs: '主成分数',
};

// 过滤 stats 中的简单值（排除嵌套对象）
const getSimpleStats = (
  stats: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'object' || value === null) {
      result[key] = value;
    }
  }
  return result;
};

// 格式化统计值
const formatStatValue = (value: unknown): string => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'object' && value !== null) {
    // 将对象转为可读字符串，如 {NC: 31739, T: 28343} → "NC: 31,739 | T: 28,343"
    return Object.entries(value as Record<string, unknown>)
      .map(
        ([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString() : v}`,
      )
      .join(' | ');
  }
  return String(value ?? '-');
};

// 步骤类型 → 输出目录名映射（与后端 STEP_OUTPUT_DIRS 保持一致）
const STEP_OUTPUT_DIRS: Record<string, string> = {
  data_load: 'step_0_data_load',
  qc_filter: 'step_1_qc_filter',
  preprocessing: 'step_2_dim_cluster',
  dim_reduce: 'step_2_dim_cluster',
  clustering: 'step_2_dim_cluster',
  annotation: 'step_3_annotation',
};

// 构建图表/表格的完整访问 URL
const getChartUrl = (relPath: string): string => {
  if (!pipeline.value || !activeStep.value) return relPath;
  // 如果已经是完整 URL 则直接返回
  if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
  const userId = pipeline.value.userId;
  const pipelineId = pipeline.value.id;
  const stepDir =
    STEP_OUTPUT_DIRS[activeStep.value.stepType] ||
    `step_${activeStepIndex.value}`;
  // 将 Windows 反斜杠替换为正斜杠
  const normalizedPath = relPath.replaceAll('\\\\', '/').replaceAll('\\', '/');
  return `/static/pipelines/${userId}/pipelines/${pipelineId}/${stepDir}/${normalizedPath}`;
};

// 监听路由参数变化
watch(
  () => route.params.id,
  () => {
    if (route.params.id) fetchPipeline();
  },
);

// 当切换到数据读取步骤时，自动加载样本
watch(
  () => activeStepIndex.value,
  (idx) => {
    // 重置高级设置折叠和 Tab
    showAdvanced.value = false;
    activeContentTab.value = 'params';
    if (
      pipeline.value?.steps[idx]?.stepType === 'data_load' &&
      sampleRows.value.length === 0
    ) {
      loadSamplesFromPipeline();
    }
  },
);

onMounted(() => {
  fetchPipeline();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (saveSampleTimer) {
    clearTimeout(saveSampleTimer);
    saveSampleTimer = null;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header -->
    <div class="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/tasks')"
            class="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div>
            <h1 class="text-xl font-bold text-slate-900">
              {{ pipeline?.name || '加载中...' }}
            </h1>
            <p v-if="pipeline?.description" class="text-sm text-slate-500">
              {{ pipeline.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-blue-600" />
    </div>

    <!-- Main Content -->
    <div
      v-else-if="pipeline"
      class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div class="flex gap-6">
        <!-- 左侧：6 步导航 -->
        <div class="w-72 flex-shrink-0">
          <div
            class="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div class="p-4">
              <h3 class="text-sm font-bold text-slate-900">分析步骤</h3>
              <p class="text-xs text-slate-500">
                {{
                  pipeline.steps.filter((s) => s.status === 'completed').length
                }}/{{ pipeline.steps.length }}
                已完成
              </p>
            </div>

            <div class="space-y-0.5 px-2 pb-3">
              <button
                v-for="(step, idx) in pipeline.steps"
                :key="idx"
                @click="isStepClickable(idx) && (activeStepIndex = idx)"
                class="flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-3 text-left transition-all"
                :class="[
                  getStepClass(step, idx),
                  isStepClickable(idx)
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed',
                ]"
              >
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  :class="{
                    'bg-emerald-100 text-emerald-600':
                      step.status === 'completed',
                    'bg-blue-100 text-blue-600':
                      step.status === 'running' ||
                      (step.status === 'pending' && idx === activeStepIndex),
                    'bg-slate-100 text-slate-400':
                      step.status === 'pending' && idx !== activeStepIndex,
                    'bg-red-100 text-red-600': step.status === 'error',
                  }"
                >
                  <Check v-if="step.status === 'completed'" class="h-4 w-4" />
                  <Loader2
                    v-else-if="step.status === 'running'"
                    class="h-4 w-4 animate-spin"
                  />
                  <component
                    v-else
                    :is="stepIcons[step.stepType]"
                    class="h-4 w-4"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] font-bold text-slate-400">
                      {{ idx + 1 }}.
                    </span>
                    <span
                      class="truncate text-sm font-medium"
                      :class="
                        idx === activeStepIndex
                          ? 'text-slate-900'
                          : 'text-slate-600'
                      "
                    >
                      {{ STEP_LABELS[step.stepType] }}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  v-if="idx === activeStepIndex"
                  class="h-4 w-4 flex-shrink-0 text-slate-400"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧：步骤详情 -->
        <div class="min-w-0 flex-1">
          <div
            v-if="activeStep"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <!-- 步骤头部 -->
            <div class="border-b border-slate-100 p-6">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100"
                    >
                      <component
                        :is="stepIcons[activeStep.stepType]"
                        class="h-5 w-5 text-blue-600"
                      />
                    </div>
                    <div>
                      <h2 class="text-lg font-bold text-slate-900">
                        {{ STEP_LABELS[activeStep.stepType] }}
                      </h2>
                      <p class="text-sm text-slate-500">
                        {{ STEP_DESCRIPTIONS[activeStep.stepType] }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 右侧操作区 -->
                <div class="flex items-center gap-3">
                  <!-- 日志按钮 -->
                  <button
                    v-if="
                      activeStep.status === 'completed' ||
                      currentStepLogs.length > 0
                    "
                    @click="openLogDrawer"
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <FileText class="h-4 w-4" />
                    日志
                  </button>

                  <!-- 运行按钮（始终存在） -->
                  <button
                    @click="handleRunStep"
                    :disabled="running"
                    class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Loader2 v-if="running" class="h-4 w-4 animate-spin" />
                    <Play v-else class="h-4 w-4" />
                    {{
                      running
                        ? '运行中...'
                        : activeStep.status === 'completed'
                          ? '重新运行'
                          : '运行'
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ========== 数据读取步骤：直接展示样本表格 ========== -->
            <template v-if="isDataLoadStep">
              <div class="p-6">
                <!-- 数据来源信息 -->
                <div
                  class="mb-6 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3"
                >
                  <Folder class="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-medium text-blue-600">
                      数据来源
                    </div>
                    <div class="mt-0.5 truncate text-sm text-slate-700">
                      {{ pipeline.dataPath ? `我的数据/${pipeline.dataPath}` : '未指定数据路径' }}
                    </div>
                  </div>
                  <span
                    v-if="pipeline.species"
                    class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {{ pipeline.species }}
                  </span>
                </div>

                <!-- 加载中 -->
                <div
                  v-if="loadingSamples"
                  class="flex items-center justify-center py-12"
                >
                  <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
                  <span class="ml-2 text-sm text-slate-500"
                    >正在扫描样本...</span
                  >
                </div>

                <!-- 样本表格 -->
                <div v-else-if="sampleRows.length > 0">
                  <div class="mb-3 flex items-center justify-between">
                    <h3 class="text-sm font-bold text-slate-700">
                      样本列表
                      <span class="ml-2 font-normal text-slate-400">
                        共 {{ sampleRows.length }} 个样本
                      </span>
                    </h3>
                  </div>

                  <!-- 表格 -->
                  <div
                    class="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <table class="w-full">
                      <thead>
                        <tr class="bg-slate-50">
                          <th
                            class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            Sample
                          </th>
                          <th
                            class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            <span class="flex items-center gap-1">
                              Sample Name
                              <Pencil class="h-3 w-3 text-slate-400" />
                            </span>
                          </th>
                          <th
                            class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            <span class="flex items-center gap-1">
                              Group
                              <Pencil class="h-3 w-3 text-slate-400" />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr
                          v-for="row in sampleRows"
                          :key="row.sample"
                          class="transition-colors hover:bg-slate-50/50"
                        >
                          <!-- Sample（只读） -->
                          <td class="px-4 py-2">
                            <span
                              class="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <Folder class="h-3.5 w-3.5 text-amber-500" />
                              {{ row.sample }}
                            </span>
                          </td>
                          <!-- Sample Name（可编辑） -->
                          <td class="px-4 py-1.5">
                            <input
                              v-model="row.sampleName"
                              type="text"
                              class="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              @input="saveSampleDict"
                            />
                          </td>
                          <!-- Group（可编辑） -->
                          <td class="px-4 py-1.5">
                            <input
                              v-model="row.group"
                              type="text"
                              class="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              @input="saveSampleDict"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- 无数据路径 -->
                <div
                  v-else-if="!pipeline.dataPath"
                  class="flex flex-col items-center justify-center py-12"
                >
                  <div
                    class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
                  >
                    <Database class="h-8 w-8 text-slate-400" />
                  </div>
                  <p class="text-slate-500">未指定数据路径</p>
                  <p class="mt-1 text-sm text-slate-400">
                    请在创建流程时选择数据文件夹
                  </p>
                </div>

                <!-- 有路径但无样本 -->
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-12"
                >
                  <p class="text-slate-500">所选文件夹下没有找到样本数据</p>
                  <p class="mt-1 text-sm text-slate-400">
                    路径：{{ pipeline.dataPath }}
                  </p>
                </div>

                <!-- 运行结果（点击运行后显示在表格下方） -->
                <div
                  v-if="activeStep.result"
                  class="mt-6 border-t border-slate-200 pt-6"
                >
                  <h3 class="mb-4 text-sm font-bold text-slate-700">
                    运行结果
                  </h3>

                  <!-- 统计指标 -->
                  <div
                    v-if="
                      activeStep.result.stats &&
                      Object.keys(getSimpleStats(activeStep.result.stats))
                        .length > 0
                    "
                    class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
                  >
                    <div
                      v-for="(value, key) in getSimpleStats(
                        activeStep.result.stats,
                      )"
                      :key="key"
                      class="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <div class="text-xs text-slate-500">
                        {{ STAT_LABELS[key as string] || key }}
                      </div>
                      <div class="mt-1 text-lg font-bold text-slate-900">
                        {{ formatStatValue(value) }}
                      </div>
                    </div>
                  </div>

                  <!-- 图表展示 -->
                  <div
                    v-if="
                      activeStep.result.charts &&
                      activeStep.result.charts.length > 0
                    "
                  >
                    <div
                      v-for="(chartUrl, idx) in activeStep.result.charts"
                      :key="idx"
                      class="mb-4 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-4"
                    >
                      <img
                        :src="getChartUrl(chartUrl)"
                        :alt="`分析图表 ${idx + 1}`"
                        class="w-full rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- ========== 通用步骤UI：Tab 布局 ========== -->
            <template v-else>
              <!-- Tab 栏 -->
              <div class="flex border-b border-slate-200">
                <button
                  type="button"
                  @click="activeContentTab = 'params'"
                  class="relative cursor-pointer px-6 py-3 text-sm font-medium transition-colors"
                  :class="
                    activeContentTab === 'params'
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  "
                >
                  <Settings class="mr-1.5 inline-block h-4 w-4" />
                  参数配置
                  <div
                    v-if="activeContentTab === 'params'"
                    class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  ></div>
                </button>
                <button
                  type="button"
                  @click="activeContentTab = 'results'"
                  class="relative cursor-pointer px-6 py-3 text-sm font-medium transition-colors"
                  :class="
                    activeContentTab === 'results'
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  "
                >
                  <ScatterChart class="mr-1.5 inline-block h-4 w-4" />
                  分析结果
                  <span
                    v-if="activeStep.result"
                    class="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500"
                  ></span>
                  <div
                    v-if="activeContentTab === 'results'"
                    class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  ></div>
                </button>
              </div>

              <!-- ===== 参数配置面板 ===== -->
              <div v-if="activeContentTab === 'params'" class="p-6">
                <div v-if="currentStepParamConfigs.length > 0">
                  <!-- 常用参数 -->
                  <div class="space-y-4">
                    <template v-for="cfg in basicParams" :key="cfg.key">
                      <div class="flex items-start gap-4">
                        <div class="w-40 flex-shrink-0 pt-2">
                          <div class="flex items-center gap-1.5">
                            <span class="text-sm font-medium text-slate-700">{{
                              cfg.label
                            }}</span>
                            <div class="group relative">
                              <span
                                class="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600"
                                >?</span
                              >
                              <div
                                class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                              >
                                {{ cfg.tooltip }}
                                <div
                                  class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="flex-1">
                          <div
                            v-if="cfg.controlType === 'number'"
                            class="flex items-center gap-0"
                          >
                            <button
                              type="button"
                              @click="
                                adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)
                              "
                              class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              −
                            </button>
                            <input
                              :value="activeStep.params[cfg.key]"
                              @change="
                                (e: Event) =>
                                  setParam(
                                    cfg.key,
                                    parseFloat(
                                      (e.target as HTMLInputElement).value,
                                    ) || 0,
                                  )
                              "
                              type="number"
                              class="h-9 w-24 border border-slate-200 bg-white px-3 text-center text-sm text-slate-800 [appearance:textfield] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              @click="
                                adjustParam(
                                  cfg.key,
                                  cfg.step ?? 1,
                                  undefined,
                                  cfg.max,
                                )
                              "
                              class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              +
                            </button>
                          </div>
                          <select
                            v-else-if="cfg.controlType === 'select'"
                            :value="activeStep.params[cfg.key]"
                            @change="
                              (e: Event) =>
                                setParam(
                                  cfg.key,
                                  (e.target as HTMLSelectElement).value,
                                )
                            "
                            class="h-9 w-52 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option
                              v-for="opt in cfg.options"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </option>
                          </select>
                          <button
                            v-else-if="cfg.controlType === 'switch'"
                            type="button"
                            @click="
                              setParam(cfg.key, !activeStep.params[cfg.key])
                            "
                            class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                            :class="
                              activeStep.params[cfg.key]
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            "
                          >
                            <span
                              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                              :class="
                                activeStep.params[cfg.key]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              "
                            ></span>
                          </button>
                        </div>
                      </div>
                    </template>
                  </div>

                  <!-- 高级设置 -->
                  <div v-if="advancedParams.length > 0" class="mt-5">
                    <button
                      type="button"
                      @click="showAdvanced = !showAdvanced"
                      class="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                    >
                      <ChevronRight
                        class="h-4 w-4 transition-transform"
                        :class="{ 'rotate-90': showAdvanced }"
                      />
                      高级设置
                      <span class="text-xs text-slate-400"
                        >({{ advancedParams.length }})</span
                      >
                    </button>
                    <Transition name="expand">
                      <div
                        v-if="showAdvanced"
                        class="mt-4 space-y-4 rounded-lg bg-slate-50/50 px-4 py-4"
                      >
                        <template v-for="cfg in advancedParams" :key="cfg.key">
                          <div class="flex items-start gap-4">
                            <div class="w-40 flex-shrink-0 pt-2">
                              <div class="flex items-center gap-1.5">
                                <span
                                  class="text-sm font-medium text-slate-600"
                                  >{{ cfg.label }}</span
                                >
                                <div class="group relative">
                                  <span
                                    class="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600"
                                    >?</span
                                  >
                                  <div
                                    class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                                  >
                                    {{ cfg.tooltip }}
                                    <div
                                      class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="flex-1">
                              <div
                                v-if="cfg.controlType === 'number'"
                                class="flex items-center gap-0"
                              >
                                <button
                                  type="button"
                                  @click="
                                    adjustParam(
                                      cfg.key,
                                      -(cfg.step ?? 1),
                                      cfg.min,
                                    )
                                  "
                                  class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                  −
                                </button>
                                <input
                                  :value="activeStep.params[cfg.key]"
                                  @change="
                                    (e: Event) =>
                                      setParam(
                                        cfg.key,
                                        parseFloat(
                                          (e.target as HTMLInputElement).value,
                                        ) || 0,
                                      )
                                  "
                                  type="number"
                                  class="h-9 w-24 border border-slate-200 bg-white px-3 text-center text-sm text-slate-800 [appearance:textfield] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  @click="
                                    adjustParam(
                                      cfg.key,
                                      cfg.step ?? 1,
                                      undefined,
                                      cfg.max,
                                    )
                                  "
                                  class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                  +
                                </button>
                              </div>
                              <select
                                v-else-if="cfg.controlType === 'select'"
                                :value="activeStep.params[cfg.key]"
                                @change="
                                  (e: Event) =>
                                    setParam(
                                      cfg.key,
                                      (e.target as HTMLSelectElement).value,
                                    )
                                "
                                class="h-9 w-52 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option
                                  v-for="opt in cfg.options"
                                  :key="opt.value"
                                  :value="opt.value"
                                >
                                  {{ opt.label }}
                                </option>
                              </select>
                              <button
                                v-else-if="cfg.controlType === 'switch'"
                                type="button"
                                @click="
                                  setParam(cfg.key, !activeStep.params[cfg.key])
                                "
                                class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                                :class="
                                  activeStep.params[cfg.key]
                                    ? 'bg-blue-600'
                                    : 'bg-slate-300'
                                "
                              >
                                <span
                                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                                  :class="
                                    activeStep.params[cfg.key]
                                      ? 'translate-x-6'
                                      : 'translate-x-1'
                                  "
                                ></span>
                              </button>
                            </div>
                          </div>
                        </template>
                      </div>
                    </Transition>
                  </div>
                </div>

                <!-- 无参数配置时 -->
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-12"
                >
                  <component
                    :is="stepIcons[activeStep.stepType]"
                    class="mb-3 h-10 w-10 text-slate-300"
                  />
                  <p class="text-sm text-slate-400">
                    {{ STEP_DESCRIPTIONS[activeStep.stepType] }}
                  </p>
                </div>
              </div>

              <!-- ===== 分析结果面板 ===== -->
              <div v-else-if="activeContentTab === 'results'" class="p-6">
                <div v-if="activeStep.result">
                  <!-- 统计指标 -->
                  <div
                    v-if="
                      activeStep.result.stats &&
                      Object.keys(getSimpleStats(activeStep.result.stats))
                        .length > 0
                    "
                    class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
                  >
                    <div
                      v-for="(value, key) in getSimpleStats(
                        activeStep.result.stats,
                      )"
                      :key="key"
                      class="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <div class="text-xs text-slate-500">
                        {{ STAT_LABELS[key as string] || key }}
                      </div>
                      <div class="mt-1 text-lg font-bold text-slate-900">
                        {{ formatStatValue(value) }}
                      </div>
                    </div>
                  </div>

                  <!-- 图表展示 -->
                  <div
                    v-if="
                      activeStep.result.charts &&
                      activeStep.result.charts.length > 0
                    "
                  >
                    <div
                      v-for="(chartUrl, idx) in activeStep.result.charts"
                      :key="idx"
                      class="mb-4 overflow-hidden rounded-lg border border-slate-100 bg-white p-4"
                    >
                      <img
                        :src="getChartUrl(chartUrl)"
                        :alt="`分析图表 ${idx + 1}`"
                        class="w-full rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <!-- 表格下载 -->
                  <div
                    v-if="
                      activeStep.result.tables &&
                      activeStep.result.tables.length > 0
                    "
                    class="mt-4"
                  >
                    <h4 class="mb-3 text-sm font-bold text-slate-700">
                      数据表格
                    </h4>
                    <div class="space-y-2">
                      <a
                        v-for="(tableUrl, idx) in activeStep.result.tables"
                        :key="idx"
                        :href="getChartUrl(tableUrl)"
                        target="_blank"
                        class="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <FileText class="h-4 w-4" />
                        {{ tableUrl.split('/').pop() }}
                      </a>
                    </div>
                  </div>
                </div>

                <!-- 无结果 -->
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-16"
                >
                  <div
                    class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
                  >
                    <ScatterChart class="h-8 w-8 text-slate-300" />
                  </div>
                  <p class="text-slate-500">尚无分析结果</p>
                  <p class="mt-1 text-sm text-slate-400">
                    点击"运行"开始分析，结果将在此展示
                  </p>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 404 -->
    <div v-else class="py-20 text-center">
      <h2 class="text-xl font-bold text-slate-900">流程不存在</h2>
      <button
        @click="router.push('/pipeline')"
        class="mt-4 cursor-pointer text-blue-600 hover:text-blue-700"
      >
        返回流程列表
      </button>
    </div>

    <!-- ========== 日志抽屉（右侧滑出） ========== -->
    <Transition name="drawer">
      <div v-if="showLogDrawer" class="fixed inset-0 z-50 flex justify-end">
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-black/20"
          @click="showLogDrawer = false"
        ></div>
        <!-- 抽屉内容 -->
        <div class="relative w-full max-w-lg bg-white shadow-2xl">
          <!-- 抽屉头部 -->
          <div
            class="flex items-center justify-between border-b border-slate-200 px-6 py-4"
          >
            <div class="flex items-center gap-2">
              <FileText class="h-5 w-5 text-slate-600" />
              <h3 class="text-base font-bold text-slate-900">运行日志</h3>
              <span
                v-if="activeStep"
                class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
              >
                {{ STEP_LABELS[activeStep.stepType] }}
              </span>
            </div>
            <button
              @click="showLogDrawer = false"
              class="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft class="h-5 w-5" />
            </button>
          </div>

          <!-- 日志内容 -->
          <div class="h-[calc(100vh-64px)] overflow-y-auto">
            <div v-if="currentStepLogs.length > 0" class="p-4">
              <div class="rounded-lg bg-slate-900 p-4 font-mono text-sm">
                <div
                  v-for="(log, idx) in currentStepLogs"
                  :key="idx"
                  class="flex gap-3 py-1 leading-relaxed"
                >
                  <span class="flex-shrink-0 text-slate-500">{{
                    log.time
                  }}</span>
                  <span
                    class="w-6 flex-shrink-0 text-center"
                    :class="{
                      'text-emerald-400': log.level === 'success',
                      'text-amber-400': log.level === 'warn',
                      'text-red-400': log.level === 'error',
                      'text-blue-400': log.level === 'info',
                    }"
                  >
                    {{
                      log.level === 'success'
                        ? '✔'
                        : log.level === 'warn'
                          ? '⚠'
                          : log.level === 'error'
                            ? '✘'
                            : '●'
                    }}
                  </span>
                  <span class="text-slate-200">{{ log.message }}</span>
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-20">
              <FileText class="mb-3 h-10 w-10 text-slate-300" />
              <p class="text-sm text-slate-400">暂无日志记录</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.drawer-enter-from > div:first-child,
.drawer-leave-to > div:first-child {
  opacity: 0;
}

.drawer-enter-from > div:last-child {
  transform: translateX(100%);
}

.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}

/* 高级设置展开/折叠动画 */
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
