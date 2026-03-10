<script setup lang="ts">
/**
 * 云流程详情页
 * 6 步分析导航 + 参数配置 + 结果展示
 * 第1步"数据读取"自动从创建时选的文件夹加载样本表格
 */
import type { Pipeline, StepConfig } from './types/pipeline';
import type { ParamFieldConfig } from './types/stepParamConfigs';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Dna,
  FileText,
  Filter,
  Folder,
  Layers,
  Loader2,
  Pencil,
  Play,
  ScatterChart,
  Table2,
  Tag,
  Users,
  X,
  ZoomIn,
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
import { TISSUE_MARKER_PRESETS } from './types/tissueMarkerPresets';
import { STEP_HELP_CONTENT } from './types/stepHelpContent';
import { getCellTypesForTissue } from './types/cellTypeMarkers';

const route = useRoute();
const router = useRouter();

const pipeline = ref<null | Pipeline>(null);
const loading = ref(false);
const activeStepIndex = ref(0);
const running = ref(false);
const activeContentTab = ref<'params' | 'results'>('params');

// ========== 图片放大预览 ==========
const lightboxUrl = ref('');
const showLightbox = ref(false);
const openLightbox = (url: string) => {
  lightboxUrl.value = url;
  showLightbox.value = true;
};

// 步骤图标映射
const stepIcons: Record<string, typeof Database> = {
  data_load: Database,
  qc_filter: Filter,
  dim_cluster: ScatterChart,
  find_marker: Dna,
  annotation: Tag,
  sub_annotation: ZoomIn,
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
    // sampleDict 格式: {"P1": [{"folder": "C1", "name": "Control1"}], "P2": [...]}
    const savedDict = pipeline.value.sampleDict;
    if (savedDict && Object.keys(savedDict).length > 0) {
      const rows: SampleRow[] = [];
      for (const [group, items] of Object.entries(savedDict)) {
        for (const item of items as any[]) {
          // 兼容新格式 {folder, name} 和旧格式 string
          const folder = typeof item === 'string' ? item : item.folder;
          const name = typeof item === 'string' ? item : item.name;
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
// 格式: {"P1": [{"folder": "C1", "name": "Control1"}], "P2": [{"folder": "C2", "name": "Case1"}]}
const buildSampleDict = (): Record<string, { folder: string; name: string }[]> => {
  const dict: Record<string, { folder: string; name: string }[]> = {};
  for (const row of sampleRows.value) {
    const group = row.group || row.sample;
    if (!dict[group]) dict[group] = [];
    dict[group].push({
      folder: row.sample,
      name: row.sampleName || row.sample,
    });
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
const showHelpDrawer = ref(false);

const currentHelp = computed(() => {
  if (!activeStep.value) return null;
  return STEP_HELP_CONTENT[activeStep.value.stepType] || null;
});

// 按步骤索引存储日志（纯文本行）
const stepLogsMap = ref<Record<number, string[]>>({});

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

// 是否是注释步骤
const isAnnotationStep = computed(() => {
  return activeStep.value?.stepType === 'annotation';
});

// 降维聚类步骤（注释步骤需要引用其UMAP图）
const dimReduceStep = computed(() => {
  if (!pipeline.value) return null;
  return pipeline.value.steps.find(s => s.stepType === 'dim_cluster') ?? null;
});

// ========== 参数表单逻辑 ==========

// 当前步骤的参数配置列表
const currentStepParamConfigs = computed<ParamFieldConfig[]>(() => {
  if (!activeStep.value) return [];
  return STEP_PARAM_CONFIGS[activeStep.value.stepType] || [];
});



// 当前步骤参数的分组列表（去重，保留顺序）
const paramGroups = computed<string[]>(() => {
  const groups: string[] = [];
  for (const cfg of currentStepParamConfigs.value) {
    if (cfg.group && !groups.includes(cfg.group)) {
      groups.push(cfg.group);
    }
  }
  return groups;
});

// 按分组获取参数
const getParamsByGroup = (group: string) => {
  return currentStepParamConfigs.value.filter((cfg) => cfg.group === group);
};

// 未分组的参数
const ungroupedParams = computed(() => {
  return currentStepParamConfigs.value.filter((cfg) => !cfg.group);
});

// 设置参数值
const setParam = (key: string, value: unknown) => {
  if (!activeStep.value) return;
  activeStep.value.params[key] = value;
  // 组织类型联动预填 Marker 基因
  if (key === 'tissue_type' && typeof value === 'string') {
    const preset = TISSUE_MARKER_PRESETS[value] || '';
    if (preset) activeStep.value.params['marker_genes'] = preset;
  }
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

// ===== 细胞注释映射表编辑 =====
// 分析结果 Tab（图表 / 数据表）
const activeResultTab = ref<'charts' | 'tables'>('charts');
// 辅助图折叠状态
const showAuxCharts = ref(false);

const editingAnnotation = ref<Record<string, string>>({});
const annotationSearchQuery = ref<Record<string, string>>({}); // 每个cluster的搜索关键词
const annotationDropdownOpen = ref<Record<string, boolean>>({}); // 每个cluster的下拉是否打开

// 当前组织的候选细胞类型（从知识库获取）
const candidateCellTypes = computed(() => {
  if (!activeStep.value) return [];
  const organism = activeStep.value.params['organism'] as string || 'human';
  const tissueType = activeStep.value.params['tissue_type'] as string || 'pbmc';
  // 将参数值映射到知识库的 key
  const speciesMap: Record<string, 'Human' | 'Mouse'> = { human: 'Human', mouse: 'Mouse' };
  const tissueMap: Record<string, string> = {
    pbmc: 'Immune', lung: 'Lung', liver: 'Liver', brain: 'Brain',
    tumor: 'Immune', gut: 'GI_tract', kidney: 'Kidney', skin: 'Skin', other: 'Immune',
  };
  const sp = speciesMap[organism] || 'Human';
  const ts = tissueMap[tissueType] || 'Immune';
  return getCellTypesForTissue(sp, ts);
});

// 过滤后的候选细胞类型（根据cluster的搜索关键词）
const getFilteredCandidates = (cluster: string) => {
  const query = (annotationSearchQuery.value[cluster] || '').toLowerCase();
  if (!query) return candidateCellTypes.value;
  return candidateCellTypes.value.filter(
    (ct: { cellType: string; positive: string[] }) => ct.cellType.toLowerCase().includes(query)
  );
};

// 选择候选细胞类型
const selectCellType = (cluster: string, cellType: string) => {
  editingAnnotation.value[cluster] = cellType;
  annotationDropdownOpen.value[cluster] = false;
  annotationSearchQuery.value[cluster] = '';
};

// blur时延迟关闭下拉（让mousedown事件先执行）
const closeDropdownLater = (cluster: string) => {
  globalThis.setTimeout(() => { annotationDropdownOpen.value[cluster] = false }, 200);
};

// 初始化注释映射表
const initAnnotationEdit = () => {
  if (!activeStep.value?.result?.stats?.annotation_dict) return;
  editingAnnotation.value = { ...(activeStep.value.result.stats.annotation_dict as Record<string, string>) };
};

// 确认注释并重新出图
const confirmAnnotation = async () => {
  if (!pipeline.value || !activeStep.value) return;
  // 将编辑后的映射写入 params.cell_type
  activeStep.value.params['cell_type'] = { ...editingAnnotation.value };
  running.value = true;
  try {
    await runStepApi(
      pipeline.value.id,
      activeStepIndex.value,
      activeStep.value.params,
    );
    activeStep.value.result = undefined;
    activeStep.value.status = 'running';
    stepLogsMap.value[activeStepIndex.value] = [];
    startLogPolling(activeStepIndex.value);
    startPolling(activeStepIndex.value);
  } catch (error) {
    console.error('确认注释失败:', error);
    running.value = false;
  }
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
    // 清空旧结果
    activeStep.value.result = undefined;
    activeStep.value.status = 'running';
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
  n_groups: '分组数',
  cells_after_filter: '过滤后细胞数',
  genes_after_filter: '过滤后基因数',
  filter_ratio: '过滤比例',
  median_genes: '基因中位数',
  n_clusters: '聚类数',
  n_hvg: '高变基因数',
  n_pcs: '主成分数',
};

// 统计指标图标映射
const STAT_ICONS: Record<string, any> = {
  total_cells: Users,
  total_genes: Dna,
  n_samples: Folder,
  n_groups: Layers,
  n_clusters: ScatterChart,
  n_hvg: Dna,
  n_pcs: Layers,
};

// 统计指标图标背景色
const STAT_ICON_COLORS: Record<string, string> = {
  total_cells: 'bg-blue-600',
  total_genes: 'bg-indigo-600',
  n_samples: 'bg-emerald-600',
  n_groups: 'bg-slate-700',
  n_clusters: 'bg-violet-600',
  n_hvg: 'bg-teal-600',
  n_pcs: 'bg-cyan-600',
};

// 统计指标排序优先级（越小越前）
const STAT_ORDER: Record<string, number> = {
  total_cells: 1,
  total_genes: 2,
  n_samples: 3,
  n_groups: 4,
  cells_after_filter: 1,
  genes_after_filter: 2,
  filter_ratio: 3,
  median_genes: 4,
  n_clusters: 5,
  n_hvg: 6,
  n_pcs: 7,
};

// 获取排序后的统计数据
const getSortedStats = (stats: Record<string, unknown>): Array<{ key: string; value: unknown }> => {
  const simple: Array<{ key: string; value: unknown }> = [];
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'object' || value === null) {
      simple.push({ key, value });
    }
  }
  return simple.sort((a, b) => (STAT_ORDER[a.key] ?? 99) - (STAT_ORDER[b.key] ?? 99));
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
  dim_cluster: 'step_2_dim_cluster',
  find_marker: 'step_3_find_marker',
  annotation: 'step_4_annotation',
  sub_annotation: 'step_5_sub_annotation',
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
  // 加时间戳防止浏览器缓存旧图
  return `/static/pipelines/${userId}/pipelines/${pipelineId}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
};

// 构建指定步骤类型的图表 URL（用于跨步骤引用图表，如注释步骤引用降维图）
const getStepChartUrl = (relPath: string, stepType: string): string => {
  if (!pipeline.value) return relPath;
  if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
  const userId = pipeline.value.userId;
  const pipelineId = pipeline.value.id;
  const stepDir = STEP_OUTPUT_DIRS[stepType] || stepType;
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
    activeContentTab.value = 'params';

    // 统一填充未设置的参数默认值
    const step = pipeline.value?.steps[idx];
    if (step) {
      const configs = STEP_PARAM_CONFIGS[step.stepType];
      if (configs) {
        for (const cfg of configs) {
          if (step.params[cfg.key] === undefined && cfg.defaultValue !== undefined) {
            step.params[cfg.key] = cfg.defaultValue;
          }
        }
      }
    }


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
            <div class="px-5 py-4">
              <h3 class="text-base font-bold text-slate-900">分析步骤</h3>
              <p class="mt-0.5 text-xs font-medium text-slate-500">
                {{
                  pipeline.steps.filter((s) => s.status === 'completed').length
                }}/{{ pipeline.steps.length }}
                已完成
              </p>
            </div>

            <div class="space-y-0.5 px-3 pb-4">
              <button
                v-for="(step, idx) in pipeline.steps"
                :key="idx"
                @click="isStepClickable(idx) && (activeStepIndex = idx)"
                class="flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-3.5 text-left transition-all"
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
                    :is="stepIcons[step.stepType] || Database"
                    class="h-4 w-4"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-slate-400">
                      {{ idx + 1 }}.
                    </span>
                    <span
                      class="truncate text-base font-semibold"
                      :class="
                        idx === activeStepIndex
                          ? 'text-slate-900'
                          : 'text-slate-700'
                      "
                    >
                      {{ STEP_LABELS[step.stepType] || step.stepType }}
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
        <div class="min-w-0 flex-1 space-y-4">
          <template v-if="activeStep">
            <!-- 步骤头部卡片 -->
            <div class="overflow-hidden rounded-t-xl rounded-b-none border border-slate-200 bg-white">
            <div class="px-8 py-6">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-4">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100"
                    >
                      <component
                        :is="stepIcons[activeStep.stepType] || Database"
                        class="h-6 w-6 text-blue-600"
                      />
                    </div>
                    <div>
                      <h2 class="text-xl font-black text-slate-900">
                        步骤 {{ activeStepIndex + 1 }}: {{ STEP_LABELS[activeStep.stepType] || activeStep.stepType }}
                      </h2>
                      <p v-if="isDataLoadStep && pipeline" class="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                        <Folder class="h-3.5 w-3.5 text-blue-400" />
                        {{ pipeline.dataPath ? `我的数据/${pipeline.dataPath}` : '未指定数据路径' }}
                        <span
                          v-if="pipeline.species"
                          class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {{ pipeline.species }}
                        </span>
                      </p>
                      <p v-else class="mt-0.5 text-sm text-slate-500">
                        {{ STEP_DESCRIPTIONS[activeStep.stepType] || '' }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 右侧操作区 -->
                <div class="flex items-center gap-3">
                  <!-- 使用说明按钮 -->
                  <button
                    v-if="STEP_HELP_CONTENT[activeStep.stepType]"
                    @click="showHelpDrawer = true"
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <BookOpen class="h-4 w-4" />
                    使用说明
                  </button>
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
            </div>

            <!-- ========== 数据读取步骤 ========== -->
            <template v-if="isDataLoadStep">

              <!-- 样本列表卡片（视觉上与步骤头合并） -->
              <div class="!-mt-px overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white">
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
                  <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
                    <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
                      <Table2 class="h-5 w-5 text-blue-500" />
                      样本列表
                      <span class="ml-2 text-sm font-normal text-slate-400">
                        共 {{ sampleRows.length }} 个样本
                      </span>
                    </h3>
                  </div>

                  <!-- 表格 -->
                  <div class="px-8 py-4">
                  <div
                    class="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <table class="w-full">
                      <thead>
                        <tr class="bg-slate-50">
                          <th
                            class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                          >
                            Sample
                          </th>
                          <th
                            class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                          >
                            <span class="flex items-center gap-1">
                              Sample Name
                              <Pencil class="h-3 w-3 text-slate-400" />
                            </span>
                          </th>
                          <th
                            class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
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
                          <td class="px-5 py-3">
                            <span
                              class="flex items-center gap-2 text-sm font-medium text-slate-700"
                            >
                              <Folder class="h-3.5 w-3.5 text-amber-500" />
                              {{ row.sample }}
                            </span>
                          </td>
                          <!-- Sample Name（可编辑） -->
                          <td class="px-5 py-2">
                            <input
                              v-model="row.sampleName"
                              type="text"
                              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              @input="saveSampleDict"
                            />
                          </td>
                          <!-- Group（可编辑） -->
                          <td class="px-5 py-2">
                            <input
                              v-model="row.group"
                              type="text"
                              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              @input="saveSampleDict"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
              </div>

              <!-- 运行结果卡片 -->
              <div
                v-if="activeStep.result"
                class="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
                  <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
                    <ScatterChart class="h-5 w-5 text-emerald-500" />
                    运行结果
                  </h3>
                  <!-- 统计指标（标题栏右侧） -->
                  <div
                    v-if="
                      activeStep.result.stats &&
                      Object.keys(getSimpleStats(activeStep.result.stats)).length > 0
                    "
                    class="flex flex-wrap items-center gap-x-4 gap-y-1"
                  >
                    <template
                      v-for="(item, sIdx) in getSortedStats(activeStep.result.stats)"
                      :key="item.key"
                    >
                      <span class="inline-flex items-center gap-1.5 text-sm">
                        <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: ['#4f46e5','#2563eb','#f59e0b','#10b981'][sIdx % 4] }"></span>
                        <span class="text-slate-400">{{ STAT_LABELS[item.key] || item.key }}</span>
                        <span class="font-bold" :style="{ color: ['#4f46e5','#2563eb','#f59e0b','#10b981'][sIdx % 4] }">{{ formatStatValue(item.value) }}</span>
                      </span>
                      <span v-if="sIdx < getSortedStats(activeStep.result.stats).length - 1" class="text-slate-200">|</span>
                    </template>
                  </div>
                </div>

                <div class="px-8 py-5">

                  <!-- 图表展示 -->
                  <div
                    v-if="
                      activeStep.result.charts &&
                      activeStep.result.charts.length > 0
                    "
                  >
                    <div
                      v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.endsWith('orig_violin.png'))"
                      :key="idx"
                      class="group relative mb-2 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                      @click="openLightbox(getChartUrl(chartUrl))"
                    >
                      <img
                        :src="getChartUrl(chartUrl)"
                        :alt="`分析图表 ${idx + 1}`"
                        class="w-full rounded-lg"
                        loading="lazy"
                      />
                      <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                        <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                          <ZoomIn class="h-3.5 w-3.5" />
                          点击放大
                        </div>
                      </div>
                    </div>
                    <!-- 图注 -->
                    <p class="mt-2 mb-4 text-center text-sm font-medium text-slate-800">
                      图. 各样本质控指标分布（基因数、UMI 总数、线粒体比例、基因复杂度）
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <!-- ========== 通用步骤UI：参数 + 结果独立卡片 ========== -->
            <template v-else>

              <!-- ===== 🔬 注释步骤专属：UMAP 参考图 + Cluster 概览 ===== -->
              <div
                v-if="isAnnotationStep && dimReduceStep?.result"
                class="!-mt-px overflow-hidden rounded-none border border-b-0 border-slate-200 bg-white"
              >
                <!-- 标题栏 -->
                <div class="flex items-center gap-2 border-b border-slate-100 px-8 py-4">
                  <ScatterChart class="h-5 w-5 text-blue-500" />
                  <h3 class="text-base font-bold text-slate-800">聚类参考</h3>
                  <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                    来自降维聚类结果
                  </span>
                </div>

                <div class="px-8 py-5">
                  <!-- 统计指标卡片 -->
                  <div
                    v-if="dimReduceStep.result.stats"
                    class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
                  >
                    <div
                      v-for="(item, sIdx) in getSortedStats(dimReduceStep.result.stats as Record<string, unknown>)"
                      :key="item.key"
                      class="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
                    >
                      <div class="text-xs font-medium text-slate-500">{{ STAT_LABELS[item.key] || item.key }}</div>
                      <div class="mt-1 text-lg font-bold text-slate-800">{{ formatStatValue(item.value) }}</div>
                    </div>
                  </div>

                  <!-- UMAP 图表（后端 PNG） -->
                  <div
                    v-if="dimReduceStep.result.charts && dimReduceStep.result.charts.length > 0"
                    class="grid grid-cols-1 gap-3 lg:grid-cols-2"
                  >
                    <div
                      v-for="(chartUrl, idx) in (dimReduceStep.result.charts as string[]).slice(0, 4)"
                      :key="idx"
                      class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-2 ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                      @click="openLightbox(getStepChartUrl(chartUrl, 'dim_cluster'))"
                    >
                      <img
                        :src="getStepChartUrl(chartUrl, 'dim_cluster')"
                        :alt="`UMAP ${idx + 1}`"
                        class="w-full rounded-lg"
                        loading="lazy"
                      />
                      <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                        <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                          <ZoomIn class="h-3.5 w-3.5" />
                          点击放大
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 无图表时的提示 -->
                  <div v-else class="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <ScatterChart class="h-4 w-4" />
                    降维聚类步骤尚未生成图表，请先完成降维聚类步骤
                  </div>
                </div>
              </div>

              <!-- ===== 参数配置卡片 ===== -->
              <div class="!-mt-px overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white px-8 py-6">
                <div v-if="currentStepParamConfigs.length > 0">

                  <!-- 有分组时：卡片式分组布局 -->
                  <template v-if="paramGroups.length > 0">
                    <div v-for="(group, gIdx) in paramGroups" :key="group" :class="gIdx > 0 ? 'mt-6 pt-2' : ''">
                      <!-- 分组标题 -->
                      <div class="mb-4 flex items-center gap-2">
                        <Layers class="h-4 w-4 text-blue-500" />
                        <span class="text-base font-bold text-slate-800">{{ group }}</span>
                      </div>
                      <!-- 参数 grid -->
                      <div class="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                        <template v-for="cfg in getParamsByGroup(group)" :key="cfg.key">
                          <div class="space-y-1">
                            <!-- 标签行：label + tooltip + 推荐值 -->
                            <div class="mb-1.5 flex items-center justify-between">
                              <div class="flex items-center gap-1.5">
                                <span class="text-sm font-medium text-slate-700">{{ cfg.label }}</span>
                                <div class="group relative">
                                  <span class="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold text-slate-400 transition-colors group-hover:border-blue-400 group-hover:text-blue-500">?</span>
                                  <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    {{ cfg.tooltip }}
                                    <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <!-- 输入控件 -->
                            <div v-if="cfg.controlType === 'number'" class="flex items-center gap-0">
                              <button
                                type="button"
                                @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)"
                                class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >−</button>
                              <input
                                :value="activeStep.params[cfg.key]"
                                @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)"
                                type="number"
                                class="h-10 w-full min-w-0 flex-1 border border-slate-200 bg-white px-3 text-center text-sm font-medium text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)"
                                class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >+</button>
                            </div>
                            <select
                              v-else-if="cfg.controlType === 'select'"
                              :value="activeStep.params[cfg.key]"
                              @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)"
                              class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            >
                              <option v-for="opt in cfg.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                            </select>
                            <button
                              v-else-if="cfg.controlType === 'switch'"
                              type="button"
                              @click="setParam(cfg.key, !activeStep.params[cfg.key])"
                              class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                              :class="activeStep.params[cfg.key] ? 'bg-blue-600' : 'bg-slate-300'"
                            >
                              <span
                                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                                :class="activeStep.params[cfg.key] ? 'translate-x-6' : 'translate-x-1'"
                              ></span>
                            </button>
                            <input
                              v-else-if="cfg.controlType === 'text'"
                              :value="activeStep.params[cfg.key]"
                              @change="(e: Event) => setParam(cfg.key, (e.target as HTMLInputElement).value)"
                              type="text"
                              class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                    <!-- 未分组的参数 -->
                    <div v-if="ungroupedParams.length > 0" class="mt-6">
                      <div class="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                        <template v-for="cfg in ungroupedParams" :key="cfg.key">
                          <div class="space-y-1">
                            <div class="mb-1.5 flex items-center gap-1.5">
                              <span class="text-sm font-medium text-slate-700">{{ cfg.label }}</span>
                              <div class="group relative">
                                <span class="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full text-[9px] font-bold text-slate-400 transition-colors group-hover:text-blue-500">?</span>
                                <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                  {{ cfg.tooltip }}
                                  <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                              </div>
                            </div>
                            <div v-if="cfg.controlType === 'number'" class="flex items-center gap-0">
                              <button type="button" @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)" class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">−</button>
                              <input :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)" type="number" class="h-10 w-full min-w-0 flex-1 border border-slate-200 bg-white px-3 text-center text-sm font-medium text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              <button type="button" @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)" class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">+</button>
                            </div>
                            <select v-else-if="cfg.controlType === 'select'" :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
                              <option v-for="opt in cfg.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                            </select>
                            <button
                              v-else-if="cfg.controlType === 'switch'"
                              type="button"
                              @click="setParam(cfg.key, !activeStep.params[cfg.key])"
                              class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                              :class="activeStep.params[cfg.key] ? 'bg-blue-600' : 'bg-slate-300'"
                            >
                              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="activeStep.params[cfg.key] ? 'translate-x-6' : 'translate-x-1'"></span>
                            </button>
                            <input
                              v-else-if="cfg.controlType === 'text'"
                              :value="activeStep.params[cfg.key]"
                              @change="(e: Event) => setParam(cfg.key, (e.target as HTMLInputElement).value)"
                              type="text"
                              class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>

                  <!-- 无分组时：同样的卡片 grid -->
                  <template v-else>
                    <div class="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                      <template v-for="cfg in currentStepParamConfigs" :key="cfg.key">
                        <div class="space-y-1">
                          <div class="mb-1.5 flex items-center gap-1">
                            <span class="text-sm font-medium text-slate-700">{{ cfg.label }}</span>
                            <div class="group relative">
                              <span class="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full text-[9px] font-bold text-slate-400 transition-colors group-hover:text-blue-500">?</span>
                              <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {{ cfg.tooltip }}
                                <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            </div>
                          </div>
                           <div v-if="cfg.controlType === 'number'" class="flex items-center gap-0">
                            <button type="button" @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)" class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">−</button>
                            <input :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)" type="number" class="h-10 w-full min-w-0 flex-1 border border-slate-200 bg-white px-3 text-center text-sm font-medium text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                            <button type="button" @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)" class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">+</button>
                          </div>
                          <select v-else-if="cfg.controlType === 'select'" :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option v-for="opt in cfg.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                          </select>
                          <button
                            v-else-if="cfg.controlType === 'switch'"
                            type="button"
                            @click="setParam(cfg.key, !activeStep.params[cfg.key])"
                            class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                            :class="activeStep.params[cfg.key] ? 'bg-blue-600' : 'bg-slate-300'"
                          >
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="activeStep.params[cfg.key] ? 'translate-x-6' : 'translate-x-1'"></span>
                          </button>
                          <input
                            v-else-if="cfg.controlType === 'text'"
                            :value="activeStep.params[cfg.key]"
                            @change="(e: Event) => setParam(cfg.key, (e.target as HTMLInputElement).value)"
                            type="text"
                            class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                          />
                        </div>
                      </template>
                    </div>
                  </template>

                </div>

                <!-- 无参数配置时 -->
                <div
                  v-else
                  class="flex flex-col items-center justify-center py-8"
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

              <!-- ===== 分析结果卡片 ===== -->
              <div v-if="activeStep.result" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
                <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
                  <ScatterChart class="h-5 w-5 text-emerald-500" />
                  分析结果
                </h3>
                <!-- 统计指标（标题栏右侧） -->
                <div
                  v-if="
                    activeStep.result.stats &&
                    Object.keys(getSimpleStats(activeStep.result.stats)).length > 0
                  "
                  class="flex flex-wrap items-center gap-x-4 gap-y-1"
                >
                  <template
                    v-for="(item, sIdx) in getSortedStats(activeStep.result.stats)"
                    :key="item.key"
                  >
                    <span class="inline-flex items-center gap-1.5 text-sm">
                      <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: ['#4f46e5','#2563eb','#f59e0b','#10b981'][sIdx % 4] }"></span>
                      <span class="text-slate-400">{{ STAT_LABELS[item.key] || item.key }}</span>
                      <span class="font-bold" :style="{ color: ['#4f46e5','#2563eb','#f59e0b','#10b981'][sIdx % 4] }">{{ formatStatValue(item.value) }}</span>
                    </span>
                    <span v-if="sIdx < getSortedStats(activeStep.result.stats).length - 1" class="text-slate-200">|</span>
                  </template>
                </div>
                </div>
                <div class="px-8 pt-4 pb-6">

                <!-- Tab 切换栏 -->
                <div
                  v-if="(activeStep.result.charts && activeStep.result.charts.length > 0) || (activeStep.result.tables && activeStep.result.tables.length > 0)"
                  class="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all"
                    :class="activeResultTab === 'charts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    @click="activeResultTab = 'charts'"
                  >
                    <ScatterChart class="h-4 w-4" />
                    图表
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all"
                    :class="activeResultTab === 'tables' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                    @click="activeResultTab = 'tables'"
                  >
                    <FileText class="h-4 w-4" />
                    数据表
                  </button>
                </div>

                <!-- 图表展示 Tab -->
                <div
                  v-if="activeResultTab === 'charts' && activeStep.result.charts && activeStep.result.charts.length > 0"
                >
                  <template v-if="activeStep.stepType === 'qc_filter'">
                    <!-- 质控过滤：只展示 filtered_violin 和 scrublet -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.endsWith('filtered_violin.png') || u.includes('scrublet'))" :key="idx">
                      <div
                        class="group relative mb-2 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" :alt="`分析图表 ${idx + 1}`" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                      </div>
                      <p class="mt-1 mb-4 text-center text-sm font-medium text-slate-800">
                        {{ chartUrl.includes('filtered_violin') ? '图. 过滤后各样本质控指标分布（基因数、UMI 总数、线粒体比例、基因复杂度）' : '图. Scrublet 双细胞检测得分分布' }}
                      </p>
                    </template>
                  </template>
                  <template v-else-if="activeStep.stepType === 'dim_cluster'">
                    <!-- 降维聚类：UMAP 并排 + barplot + 辅助图折叠 -->

                    <!-- 核心图：2 张 UMAP 并排 -->
                    <div class="mb-4 grid grid-cols-2 gap-3">
                      <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('umap_sample') || u.includes('umap_cluster'))" :key="idx">
                        <div>
                          <div
                            class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                            @click="openLightbox(getChartUrl(chartUrl))"
                          >
                            <img :src="getChartUrl(chartUrl)" :alt="chartUrl.includes('sample') ? 'Sample UMAP' : 'Cluster UMAP'" class="w-full rounded-lg" loading="lazy" />
                            <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                              <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <ZoomIn class="h-3.5 w-3.5" />
                                点击放大
                              </div>
                            </div>
                          </div>
                          <p class="mt-1 text-center text-sm font-medium text-slate-800">
                            {{ chartUrl.includes('sample') ? '图. Sample UMAP' : '图. Cluster UMAP' }}
                          </p>
                        </div>
                      </template>
                    </div>

                    <!-- 核心图：barplot 全宽 -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('cluster_proportion_barplot'))" :key="'bar'+idx">
                      <div
                        class="group relative mb-2 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" alt="Cluster Proportion" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                      </div>
                      <p class="mt-1 mb-4 text-center text-sm font-medium text-slate-800">图. 各样本 Cluster 细胞比例</p>
                    </template>

                    <!-- 辅助图折叠区 -->
                    <div
                      v-if="activeStep.result.charts.filter((u: string) => !u.includes('umap_sample') && !u.includes('umap_cluster') && !u.includes('cluster_proportion_barplot')).length > 0"
                    >
                      <button
                        type="button"
                        class="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                        @click="showAuxCharts = !showAuxCharts"
                      >
                        <ChevronRight class="h-4 w-4 transition-transform" :class="showAuxCharts ? 'rotate-90' : ''" />
                        {{ showAuxCharts ? '收起辅助图' : '查看辅助图（高变基因、PCA 方差比等）' }}
                      </button>
                      <div v-show="showAuxCharts" class="grid grid-cols-2 gap-3">
                        <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => !u.includes('umap_sample') && !u.includes('umap_cluster') && !u.includes('cluster_proportion_barplot'))" :key="'aux'+idx">
                          <div
                            class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                            @click="openLightbox(getChartUrl(chartUrl))"
                          >
                            <img :src="getChartUrl(chartUrl)" :alt="`辅助图 ${idx + 1}`" class="w-full rounded-lg" loading="lazy" />
                            <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                              <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <ZoomIn class="h-3.5 w-3.5" />
                                点击放大
                              </div>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="activeStep.stepType === 'find_marker'">
                    <!-- 特征基因：dotplot + heatmap 核心展示，rank_genes_groups 折叠 -->

                    <!-- 核心图：dotplot -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('dotplot'))" :key="'dot'+idx">
                      <div
                        class="group relative mb-2 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" alt="DotPlot" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                      </div>
                      <p class="mt-1 mb-4 text-center text-sm font-medium text-slate-800">图. 各 Cluster Top3 Marker 基因气泡图</p>
                    </template>

                    <!-- 核心图：heatmap -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('heatmap'))" :key="'hm'+idx">
                      <div
                        class="group relative mb-2 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" alt="Heatmap" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                      </div>
                      <p class="mt-1 mb-4 text-center text-sm font-medium text-slate-800">图. 各 Cluster Top10 Marker 基因热图</p>
                    </template>

                    <!-- 辅助图折叠区 -->
                    <div
                      v-if="activeStep.result.charts.filter((u: string) => !u.includes('dotplot') && !u.includes('heatmap')).length > 0"
                    >
                      <button
                        type="button"
                        class="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                        @click="showAuxCharts = !showAuxCharts"
                      >
                        <ChevronRight class="h-4 w-4 transition-transform" :class="showAuxCharts ? 'rotate-90' : ''" />
                        {{ showAuxCharts ? '收起辅助图' : '查看辅助图（Marker 基因排名等）' }}
                      </button>
                      <div v-show="showAuxCharts">
                        <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => !u.includes('dotplot') && !u.includes('heatmap'))" :key="'aux'+idx">
                          <div
                            class="group relative mb-4 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                            @click="openLightbox(getChartUrl(chartUrl))"
                          >
                            <img :src="getChartUrl(chartUrl)" :alt="`辅助图 ${idx + 1}`" class="w-full rounded-lg" loading="lazy" />
                            <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                              <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <ZoomIn class="h-3.5 w-3.5" />
                                点击放大
                              </div>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <!-- 其他步骤：展示全部图表 -->
                    <div
                      v-for="(chartUrl, idx) in activeStep.result.charts"
                      :key="idx"
                      class="group relative mb-4 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                      @click="openLightbox(getChartUrl(chartUrl))"
                    >
                      <img :src="getChartUrl(chartUrl)" :alt="`分析图表 ${idx + 1}`" class="w-full rounded-lg" loading="lazy" />
                      <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                        <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                          <ZoomIn class="h-3.5 w-3.5" />
                          点击放大
                        </div>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 数据表 Tab -->
                <div
                  v-if="activeResultTab === 'tables' && activeStep.result.tables && activeStep.result.tables.length > 0"
                >
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

                <!-- 细胞注释映射表（仅 annotation 步骤显示） -->
                <div
                  v-if="activeStep.stepType === 'annotation' && activeStep.result?.stats?.annotation_dict"
                  class="mt-6"
                >
                  <div class="mb-4 flex items-center justify-between">
                    <h4 class="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Tag class="h-4 w-4 text-blue-500" />
                      细胞类型注释
                    </h4>
                    <span class="text-xs text-slate-400">
                      已注释 {{ Object.keys(editingAnnotation).length }} 个 Cluster
                    </span>
                  </div>

                  <div class="overflow-hidden rounded-lg border border-slate-200">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="bg-slate-50">
                          <th class="w-24 px-4 py-2.5 text-left font-semibold text-slate-600">Cluster</th>
                          <th class="px-4 py-2.5 text-left font-semibold text-slate-600">自动注释结果</th>
                          <th class="px-4 py-2.5 text-left font-semibold text-slate-600">修改为（输入或从知识库选择）</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(cellType, cluster) in (activeStep.result.stats.annotation_dict as Record<string, string>)"
                          :key="cluster"
                          class="border-t border-slate-100 transition-colors hover:bg-slate-50/50"
                        >
                          <td class="px-4 py-2.5">
                            <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                              {{ cluster }}
                            </span>
                          </td>
                          <td class="px-4 py-2.5 text-slate-500">{{ cellType }}</td>
                          <td class="relative px-4 py-2">
                            <div class="relative">
                              <input
                                :value="editingAnnotation[cluster as string] || cellType"
                                @input="(e: Event) => { editingAnnotation[cluster as string] = (e.target as HTMLInputElement).value; annotationSearchQuery[cluster as string] = (e.target as HTMLInputElement).value; annotationDropdownOpen[cluster as string] = true; }"
                                @focus="annotationDropdownOpen[cluster as string] = true"
                                @blur="closeDropdownLater(cluster as string)"
                                type="text"
                                class="h-8 w-full rounded-md border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                                placeholder="输入细胞类型..."
                              />
                              <ChevronRight
                                class="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-300"
                              />
                              <!-- Autocomplete 下拉 -->
                              <div
                                v-if="annotationDropdownOpen[cluster as string] && getFilteredCandidates(cluster as string).length > 0"
                                class="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                <button
                                  v-for="ct in getFilteredCandidates(cluster as string)"
                                  :key="ct.cellType"
                                  type="button"
                                  class="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-blue-50"
                                  @mousedown.prevent="selectCellType(cluster as string, ct.cellType)"
                                >
                                  <span class="whitespace-nowrap text-sm font-medium text-slate-800">{{ ct.cellType }}</span>
                                  <span class="truncate text-xs text-slate-400">{{ ct.positive.slice(0, 4).join(', ') }}</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="mt-4 flex items-center justify-between">
                    <p class="text-xs text-slate-400">
                      💡 输入时会自动显示 {{ activeStep.params['organism'] === 'mouse' ? 'Mouse' : 'Human' }} 组织知识库中的候选细胞类型
                    </p>
                    <button
                      type="button"
                      @click="() => { initAnnotationEdit(); confirmAnnotation(); }"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                      :disabled="running"
                    >
                      <Check class="h-4 w-4" />
                      确认注释并重新出图
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </template>
          </template>
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
              <div class="rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed">
                <div
                  v-for="(line, idx) in currentStepLogs"
                  :key="idx"
                  class="py-0.5"
                  :class="{
                    'text-emerald-400': line.includes('[INFO]') || line.includes('成功'),
                    'text-amber-400': line.includes('[WARN]') || line.includes('STDERR'),
                    'text-red-400': line.includes('[ERROR]') || line.includes('失败'),
                    'text-blue-300': line.startsWith('=====') || line.startsWith('流程') || line.startsWith('步骤') || line.startsWith('脚本') || line.startsWith('开始时间') || line.startsWith('结束时间') || line.startsWith('耗时') || line.startsWith('执行命令') || line.startsWith('参数'),
                    'text-slate-300': !line.includes('[INFO]') && !line.includes('[WARN]') && !line.includes('[ERROR]') && !line.startsWith('=====') && !line.includes('成功') && !line.includes('失败') && !line.includes('STDERR') && !line.startsWith('流程') && !line.startsWith('步骤') && !line.startsWith('脚本') && !line.startsWith('开始时间') && !line.startsWith('结束时间') && !line.startsWith('耗时') && !line.startsWith('执行命令') && !line.startsWith('参数'),
                  }"
                >
                  <span class="mr-3 select-none text-slate-600">{{ String(idx + 1).padStart(3, ' ') }}</span>{{ line }}
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

    <!-- ========== 步骤说明抽屉（右侧滑出） ========== -->
    <Transition name="drawer">
      <div v-if="showHelpDrawer && currentHelp" class="fixed inset-0 z-50 flex justify-end">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/20" @click="showHelpDrawer = false"></div>
        <!-- 抽屉内容 -->
        <div class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl">
          <!-- 抽屉头部 -->
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div class="flex items-center gap-2">
              <BookOpen class="h-5 w-5 text-blue-600" />
              <h3 class="text-base font-bold text-slate-900">使用说明</h3>
              <span v-if="activeStep" class="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                {{ STEP_LABELS[activeStep.stepType] }}
              </span>
            </div>
            <button @click="showHelpDrawer = false" class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
              <X class="h-5 w-5" />
            </button>
          </div>
          <!-- 抽屉正文 -->
          <div class="flex-1 overflow-y-auto">
            <!-- 概要 -->
            <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <p class="text-sm leading-relaxed text-slate-600">{{ currentHelp.summary }}</p>
            </div>
            <!-- 各个 section -->
            <div class="space-y-0">
              <div v-for="(section, idx) in currentHelp.sections" :key="idx" class="border-b border-slate-50 px-6 py-5">
                <h4 class="mb-3 text-sm font-semibold text-slate-800">{{ section.title }}</h4>
                <div class="text-sm leading-relaxed text-slate-600" v-html="section.content"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ========== 图片放大 Lightbox ========== -->
    <Transition name="lightbox">
      <div
        v-if="showLightbox"
        class="fixed inset-0 z-[60] flex items-center justify-center"
        @click.self="showLightbox = false"
      >
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <!-- 内容 -->
        <div class="relative max-h-[90vh] max-w-[90vw]">
          <img
            :src="lightboxUrl"
            class="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
            alt="放大查看"
          />
          <button
            @click="showLightbox = false"
            class="absolute -right-3 -top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition-colors hover:bg-slate-100"
          >
            <X class="h-4 w-4" />
          </button>
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

/* lightbox 淡入淡出动画 */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: all 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-active img,
.lightbox-leave-active img {
  transition: transform 0.25s ease;
}

.lightbox-enter-from img {
  transform: scale(0.9);
}

.lightbox-leave-to img {
  transform: scale(0.9);
}
</style>

