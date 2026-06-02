<script setup lang="ts">
/**
 * 云流程详情页
 * 5 步分析导航 + 参数配置 + 结果展示
 * 第1步"数据读取"自动从创建时选的文件夹加载样本表格
 */
import type { Pipeline, StepConfig } from './types/pipeline';
import type { ParamFieldConfig } from './types/stepParamConfigs';
import type { ClusterMarkersTable } from '#/api/pipeline';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Database,
  Dna,
  FileText,
  Filter,
  Folder,
  Layers,
  Loader2,
  Play,
  ScatterChart,
  Tag,
  X,
} from 'lucide-vue-next';
import { message, Modal } from 'ant-design-vue';

import {
  generateDotplot as generateDotplotApi,
  autoAnnotate as autoAnnotateApi,
  getClusterMarkers,
  getPipeline as fetchPipelineApi,
  getFilesInFolder,
  getStepLogs,
  runStep as runStepApi,
  saveH5adToMyData as saveH5adApi,
  updateSampleDict,
} from '#/api/pipeline';
import { getTaskStatus } from '#/api/analysis-tools';
import { ChevronDown, Download, Save } from 'lucide-vue-next';

import { SPECIES_OPTIONS } from './constants';
import { STEP_DESCRIPTIONS, STEP_LABELS } from './types/pipeline';
import { STEP_PARAM_CONFIGS } from './types/stepParamConfigs';
import { STEP_HELP_CONTENT } from './types/stepHelpContent';
import { getCellTypesForTissue, getTissueOptions } from './types/cellTypeMarkers';
import AnnotationWorkbench from './components/AnnotationWorkbench.vue';
import PipelineStepper from './components/PipelineStepper.vue';
import SampleGroupTable from './components/SampleGroupTable.vue';
import StepResultPanel from './components/StepResultPanel.vue';
import StepStatsSummary from './components/StepStatsSummary.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const pipeline = ref<null | Pipeline>(null);
const loading = ref(false);
const activeStepIndex = ref(0);
const running = ref(false);
const activeContentTab = ref<'params' | 'results'>('params');
const advancedParamsOpenByStep = ref<Record<number, boolean>>({});
const trialRestrictionMessage =
  '当前账号暂未开通该功能。注册用户可使用示例数据体验分析。如需上传个人数据、保存结果到我的数据或提升每日分析次数，请联系管理员。';
const isRegisteredTrialUser = computed(() =>
  (userStore.userInfo?.roles ?? []).includes('注册用户'),
);

const showTrialRestriction = (content = trialRestrictionMessage) => {
  Modal.info({
    title: '功能暂未开通',
    content,
    okText: '知道了',
  });
};

const isTrialRestrictionError = (messageText?: string) => {
  if (!messageText) return false;
  return (
    messageText.includes('注册用户') ||
    messageText.includes('暂未开通') ||
    messageText.includes('今日示例分析次数已用完')
  );
};

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

const normalizeOrganism = (value?: null | string) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('mouse') || normalized.includes('mus') || normalized === '小鼠') {
    return 'mouse';
  }
  return 'human';
};

const getPipelineOrganism = () => normalizeOrganism(pipeline.value?.species);

const formatSpecies = (species?: string) => {
  if (!species) return '-';
  return SPECIES_OPTIONS.find((item) => item.value === species)?.label || species;
};

const getAnnotationSpecies = (): 'Human' | 'Mouse' =>
  getPipelineOrganism() === 'mouse' ? 'Mouse' : 'Human';

const legacyTissueMap: Record<string, string> = {
  brain: 'Brain',
  gut: 'GI_tract',
  kidney: 'Kidney',
  liver: 'Liver',
  lung: 'Lung',
  other: 'Immune',
  pbmc: 'Immune',
  skin: 'Skin',
  tumor: 'Immune',
};

const normalizeTissueKey = (tissue: string) =>
  legacyTissueMap[tissue] || tissue || 'Immune';

const syncAnnotationOrganism = (step?: StepConfig) => {
  if (!step || step.stepType !== 'annotation') return;
  step.params.organism = getPipelineOrganism();
};

const normalizePipeline = (loadedPipeline: null | Pipeline): null | Pipeline => {
  if (!loadedPipeline) return null;
  const visibleSteps = loadedPipeline.steps
    .filter((step) => (step.stepType as string) !== 'sub_annotation')
    .map((step) => {
      const configs = STEP_PARAM_CONFIGS[step.stepType] || [];
      const params: Record<string, unknown> = {
        ...((step.params || {}) as Record<string, unknown>),
      };

      for (const cfg of configs) {
        if (params[cfg.key] === undefined && cfg.defaultValue !== undefined) {
          params[cfg.key] = cfg.defaultValue;
        }
      }
      if (step.stepType === 'annotation') {
        params.organism = normalizeOrganism(loadedPipeline.species);
        params.tissue_type = normalizeTissueKey(String(params.tissue_type || 'Immune'));
      }

      return {
        ...step,
        params,
      };
    });
  return {
    ...loadedPipeline,
    currentStep: Math.min(
      loadedPipeline.currentStep,
      Math.max(visibleSteps.length - 1, 0),
    ),
    steps: visibleSteps,
  };
};

// 加载流程
const fetchPipeline = async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const loadedPipeline = await fetchPipelineApi(id);
    if (loadedPipeline.analysisTaskId) {
      try {
        const task = await getTaskStatus(loadedPipeline.analysisTaskId);
        if (task.task_name) {
          loadedPipeline.name = task.task_name;
        }
      } catch (error) {
        console.warn('同步任务名称失败:', error);
      }
    }
    pipeline.value = normalizePipeline(loadedPipeline);
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
      if (pipeline.value.steps[activeStepIndex.value]?.stepType === 'annotation') {
        const step = pipeline.value.steps[activeStepIndex.value];
        syncAnnotationOrganism(step);
        selectedTissueType.value = normalizeTissueKey(
          String(step?.params.tissue_type || selectedTissueType.value),
        );
        loadMarkerPreset(selectedTissueType.value);
        await loadClusterMarkers();
      }
      // 检测是否有运行中的步骤，自动恢复轮询
      const runningStepIdx = pipeline.value.steps.findIndex(
        (s) => s.status === 'running',
      );
      if (runningStepIdx !== -1 && !pollTimer) {
        activeStepIndex.value = runningStepIdx;
        startLogPolling(runningStepIdx);
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

const activeStepAdvancedParamsOpen = computed(() => {
  return advancedParamsOpenByStep.value[activeStepIndex.value] === true;
});

const toggleAdvancedParams = () => {
  advancedParamsOpenByStep.value[activeStepIndex.value] =
    !activeStepAdvancedParamsOpen.value;
};

const paramTooltipIconClass =
  'flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-bold leading-none text-slate-400 transition-colors group-hover:border-blue-400 group-hover:text-blue-500';

// ========== 参数表单逻辑 ==========

// 当前步骤的参数配置列表
const currentStepParamConfigs = computed<ParamFieldConfig[]>(() => {
  if (!activeStep.value) return [];
  return STEP_PARAM_CONFIGS[activeStep.value.stepType] || [];
});

const basicParamConfigs = computed(() => {
  return currentStepParamConfigs.value.filter((cfg) => !cfg.advanced);
});

const advancedParamConfigs = computed(() => {
  return currentStepParamConfigs.value.filter((cfg) => cfg.advanced);
});

// 当前步骤参数的分组列表（去重，保留顺序）
const paramGroups = computed<string[]>(() => {
  const groups: string[] = [];
  for (const cfg of basicParamConfigs.value) {
    if (cfg.group && !groups.includes(cfg.group)) {
      groups.push(cfg.group);
    }
  }
  return groups;
});

// 按分组获取参数
const getParamsByGroup = (group: string) => {
  return basicParamConfigs.value.filter((cfg) => cfg.group === group);
};

// 未分组的参数
const ungroupedParams = computed(() => {
  return basicParamConfigs.value.filter((cfg) => !cfg.group);
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

// ===== Marker 可编辑表格 =====
interface MarkerRow {
  cellType: string;
  markers: string;
}
const selectedTissueType = ref('Immune');
const markerTableRows = ref<MarkerRow[]>([]);
const dotplotUrl = ref('');
const dotplotLoading = ref(false);
const clusterMarkersTable = ref<ClusterMarkersTable>({
  clusters: [],
  columns: [],
  rows: [],
});
const showSaveDropdown = ref(false); // 保存 h5ad 下拉菜单
const savingH5ad = ref(false); // 保存中状态

// ===== 自动注释相关 =====
const autoAnnotateResult = ref<Record<string, { candidates?: { cell_type: string; score: number; confidence: number }[]; cell_type: string; score: number; confidence: number }>>({});
const autoAnnotateLoading = ref(false);
const annotationTissueOptions = computed(() => getTissueOptions(getAnnotationSpecies()));

const buildMarkerDict = () => {
  const markerDict: Record<string, string[]> = {};
  for (const row of markerTableRows.value) {
    const cellType = row.cellType.trim();
    if (!cellType) continue;
    const genes = row.markers
      .split(/[,，\s]+/)
      .map((g) => g.trim())
      .filter(Boolean);
    if (genes.length > 0) {
      markerDict[cellType] = genes;
    }
  }
  return markerDict;
};

// 从知识库加载组织类型的 Marker 预设。自动注释是独立的可选辅助动作。
const loadMarkerPreset = (tissue: string) => {
  if (!activeStep.value) return;
  syncAnnotationOrganism(activeStep.value);
  const ts = normalizeTissueKey(tissue);
  selectedTissueType.value = ts;
  activeStep.value.params.tissue_type = ts;
  const cellTypes = getCellTypesForTissue(getAnnotationSpecies(), ts);
  markerTableRows.value = cellTypes.map((ct) => ({
    cellType: ct.cellType,
    markers: ct.positive.join(', '),
  }));
};

const addMarkerRow = () => {
  markerTableRows.value.push({ cellType: '', markers: '' });
};

const removeMarkerRow = (idx: number) => {
  markerTableRows.value.splice(idx, 1);
};

// 收集 marker 表格构建分组字典并调用后端生成 dotplot
const handleGenerateDotplot = async () => {
  if (!pipeline.value || markerTableRows.value.length === 0) return;
  dotplotLoading.value = true;
  try {
    // 构建 {细胞类型: [基因列表]} 的字典结构
    const markerDict = buildMarkerDict();
    if (Object.keys(markerDict).length === 0) return;
    const resp = await generateDotplotApi(pipeline.value.id, markerDict);
    dotplotUrl.value = resp.url;
  } catch (error) {
    console.error('生成 Dotplot 失败:', error);
  } finally {
    dotplotLoading.value = false;
  }
};

// 调用后端自动注释预览，获取 cluster→cell_type 映射
const handleAutoAnnotate = async () => {
  if (!pipeline.value || !activeStep.value) return;
  autoAnnotateLoading.value = true;
  try {
    syncAnnotationOrganism(activeStep.value);
    const method = (activeStep.value.params['annotation_method'] as string) || 'panglaodb';
    const organism = (activeStep.value.params['organism'] as string) || getPipelineOrganism();
    const markerDict = buildMarkerDict();
    const result = await autoAnnotateApi(
      pipeline.value.id,
      method,
      organism,
      Object.keys(markerDict).length > 0 ? markerDict : undefined,
      selectedTissueType.value,
    );
    autoAnnotateResult.value = result;
    message.success(`已生成 ${Object.keys(result).length} 个 Cluster 的自动注释参考`);
  } catch (error) {
    console.error('自动注释失败:', error);
    const errorMessage = (error as any)?.message || '';
    if (isTrialRestrictionError(errorMessage)) {
      showTrialRestriction(errorMessage);
    } else {
      message.error('自动注释失败，请检查降维聚类步骤是否完成');
    }
  } finally {
    autoAnnotateLoading.value = false;
  }
};

// 主动将自动注释参考应用到 Cluster 表。默认只填空白，避免覆盖人工判读。
const applyAutoAnnotation = (overwrite = false) => {
  for (const row of clusterTableData.value) {
    const autoResult = autoAnnotateResult.value[row.cluster];
    if (autoResult && autoResult.cell_type && autoResult.confidence >= 60 && (overwrite || !row.cellType?.trim())) {
      row.cellType = autoResult.cell_type;
    }
  }
};

// 重置所有注释
const resetAllAnnotation = () => {
  for (const row of clusterTableData.value) {
    row.cellType = '';
  }
  autoAnnotateResult.value = {};
};

// ===== Cluster→CellType 映射表 =====
// 从 dim_cluster 步骤结果中获取 cluster 列表
const clusterList = computed<string[]>(() => {
  if (!pipeline.value) return [];

  // 来源1：dim_cluster 步骤的 stats.n_clusters
  const dimStep = pipeline.value.steps.find(s => s.stepType === 'dim_cluster');
  if (dimStep?.result?.stats) {
    const n = (dimStep.result.stats as Record<string, unknown>)['n_clusters'] as number;
    if (typeof n === 'number' && n > 0) {
      return Array.from({ length: n }, (_, i) => String(i));
    }
  }

  // 来源2：find_marker 步骤的 stats.n_clusters
  const markerStep = pipeline.value.steps.find(s => s.stepType === 'find_marker');
  if (markerStep?.result?.stats) {
    const n = (markerStep.result.stats as Record<string, unknown>)['n_clusters'] as number;
    if (typeof n === 'number' && n > 0) {
      return Array.from({ length: n }, (_, i) => String(i));
    }
  }

  // 来源3：annotation 步骤已有结果（旧数据兼容）
  const annoStep = pipeline.value.steps.find(s => s.stepType === 'annotation');
  if (annoStep?.result?.stats?.annotation_dict) {
    return Object.keys(annoStep.result.stats.annotation_dict as Record<string, string>).sort(
      (a, b) => Number(a) - Number(b),
    );
  }

  return [];
});

// vxe-table 的数据源
interface ClusterRow { cluster: string; cellType: string; }
const clusterTableData = ref<ClusterRow[]>([]);

// 初始化映射表
const initClusterMap = () => {
  const existingDict = activeStep.value?.result?.stats?.annotation_dict as Record<string, string> | undefined;
  clusterTableData.value = clusterList.value.map(c => ({
    cluster: c,
    cellType: existingDict?.[c] || '',
  }));
};

const loadClusterMarkers = async () => {
  if (!pipeline.value) return;
  try {
    clusterMarkersTable.value = await getClusterMarkers(pipeline.value.id);
  } catch (error) {
    console.error('读取 Cluster marker 表失败:', error);
    clusterMarkersTable.value = { clusters: [], columns: [], rows: [] };
  }
};

// 提交 Cluster→CellType 注释并运行后端
const submitClusterAnnotation = async () => {
  if (!pipeline.value || !activeStep.value) return;
  syncAnnotationOrganism(activeStep.value);
  // 从 clusterTableData 获取数据（proxyConfig query 同源）
  const cellTypeMapping: Record<string, string> = {};
  for (const row of clusterTableData.value) {
    if (row.cellType?.trim()) {
      cellTypeMapping[row.cluster] = row.cellType.trim();
    }
  }
  if (Object.keys(cellTypeMapping).length === 0) return;

  // 注入 marker 基因和 cell_type
  if (markerTableRows.value.length > 0) {
    const allGenes = new Set<string>();
    for (const row of markerTableRows.value) {
      for (const g of row.markers.split(/[,，\s]+/)) {
        const gene = g.trim();
        if (gene) allGenes.add(gene);
      }
    }
    activeStep.value.params['marker_genes'] = [...allGenes].join(',');
  }
  activeStep.value.params['tissue_type'] = selectedTissueType.value;
  activeStep.value.params['cell_type'] = cellTypeMapping;
  activeStep.value.params['annotation_method'] = 'manual';

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
    console.error('提交注释失败:', error);
    const errorMessage = (error as any)?.message || '';
    if (isTrialRestrictionError(errorMessage)) {
      showTrialRestriction(errorMessage);
    }
    running.value = false;
  }
};
// 下载 h5ad 到本地
const handleDownloadH5ad = () => {
  if (!pipeline.value) return;
  const relDir = pipeline.value.taskOutputRelDir;
  const url = relDir
    ? `/static/pipelines/${relDir}/05-cell_annotation/adata_annotated.h5ad`
    : `/static/pipelines/${pipeline.value.userId}/pipelines/${pipeline.value.id}/step_4_annotation/adata_annotated.h5ad`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pipeline.value.name}_annotated.h5ad`;
  a.click();
};

// ---- 保存到「我的数据」Modal ----
const showSaveModal = ref(false);
const saveFileName = ref('');
const saveTargetFolderId = ref<null | number>(null);
const saveTargetFolderName = ref('根目录');
const folderTree = ref<any[]>([]);
const loadingFolders = ref(false);
const showFolderPicker = ref(false);

// 打开保存弹窗
const handleSaveToMyData = async () => {
  if (!pipeline.value) return;
  if (isRegisteredTrialUser.value) {
    showTrialRestriction();
    return;
  }
  saveFileName.value = `${pipeline.value.name}_annotated`;
  saveTargetFolderId.value = null;
  saveTargetFolderName.value = '根目录';
  showSaveDropdown.value = false;
  showSaveModal.value = true;
  // 加载文件夹树
  loadingFolders.value = true;
  try {
    const { getUserFolderTree } = await import('#/api/my-data');
    const tree = await getUserFolderTree();
    // 后端返回 [{ key:'root', title:'我的数据', children: [...] }]，解包取 children
    folderTree.value = tree?.[0]?.children ?? tree;
  } catch {
    folderTree.value = [];
  } finally {
    loadingFolders.value = false;
  }
};

// 选择文件夹
const selectFolder = (id: null | number, name: string) => {
  saveTargetFolderId.value = id;
  saveTargetFolderName.value = name;
  showFolderPicker.value = false;
};

// 确认保存
const confirmSaveToMyData = async () => {
  if (!pipeline.value) return;
  savingH5ad.value = true;
  try {
    const res = await saveH5adApi(
      Number(pipeline.value.id),
      saveTargetFolderId.value,
      saveFileName.value,
    );
    showSaveModal.value = false;
    message.success(`已保存到「${saveTargetFolderName.value}」: ${res.name}`);
  } catch (err: any) {
    const errorMessage = err?.message || '未知错误';
    if (isTrialRestrictionError(errorMessage)) {
      showTrialRestriction(errorMessage);
    } else {
      message.error(`保存失败: ${errorMessage}`);
    }
  } finally {
    savingH5ad.value = false;
  }
};

// 监听 step 切换时自动初始化映射表
watch([activeStepIndex, clusterList], () => {
  if (isAnnotationStep.value && clusterList.value.length > 0) {
    initClusterMap();
    loadClusterMarkers();
  }
}, { immediate: true });

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
    // 注释步骤：自动注入 Marker 表格数据到参数
    if (activeStep.value.stepType === 'annotation' && markerTableRows.value.length > 0) {
      syncAnnotationOrganism(activeStep.value);
      const allGenes = new Set<string>();
      for (const row of markerTableRows.value) {
        for (const g of row.markers.split(/[,，\s]+/)) {
          const gene = g.trim();
          if (gene) allGenes.add(gene);
        }
      }
      activeStep.value.params['marker_genes'] = [...allGenes].join(',');
      activeStep.value.params['tissue_type'] = selectedTissueType.value;
    }
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
    const errorMessage = (error as any)?.message || '';
    if (isTrialRestrictionError(errorMessage)) {
      showTrialRestriction(errorMessage);
    }
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

// 步骤类型 → 输出目录名映射（与后端 STEP_OUTPUT_DIRS 保持一致）
const STEP_OUTPUT_DIRS: Record<string, string> = {
  data_load: '01-data_qc',
  qc_filter: '02-cell_filter',
  dim_cluster: '03-dim_cluster',
  find_marker: '04-marker_genes',
  annotation: '05-cell_annotation',
};

// 将反斜杠统一为正斜杠（Windows 路径兼容）
const normalizePath = (p: string) => p.split('\\').join('/');

// 构建图表/表格的完整访问 URL
const getChartUrl = (relPath: string): string => {
  if (!pipeline.value || !activeStep.value) return relPath;
  if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
  const normalizedPath = normalizePath(relPath);

  // v2: 使用 Pipeline 关联的统一任务目录
  const relDir = pipeline.value.taskOutputRelDir;
  if (relDir) {
    const stepDir = STEP_OUTPUT_DIRS[activeStep.value.stepType] || `step_${activeStepIndex.value}`;
    return `/static/pipelines/${relDir}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
  }

  // 兼容旧版：使用 pipelines/ 路径
  const userId = pipeline.value.userId;
  const pipelineId = pipeline.value.id;
  const stepDir =
    STEP_OUTPUT_DIRS[activeStep.value.stepType] ||
    `step_${activeStepIndex.value}`;
  return `/static/pipelines/${userId}/pipelines/${pipelineId}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
};

// 构建指定步骤类型的图表 URL（用于跨步骤引用图表，如注释步骤引用降维图）
const getStepChartUrl = (relPath: string, stepType: string): string => {
  if (!pipeline.value) return relPath;
  if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
  const normalizedPath = normalizePath(relPath);

  // v2: 使用 Pipeline 关联的统一任务目录
  const relDir = pipeline.value.taskOutputRelDir;
  if (relDir) {
    const stepDir = STEP_OUTPUT_DIRS[stepType] || stepType;
    return `/static/pipelines/${relDir}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
  }

  // 兼容旧版
  const userId = pipeline.value.userId;
  const pipelineId = pipeline.value.id;
  const stepDir = STEP_OUTPUT_DIRS[stepType] || stepType;
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
      syncAnnotationOrganism(step);
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
    if (pipeline.value?.steps[idx]?.stepType === 'annotation') {
      selectedTissueType.value = normalizeTissueKey(
        String(pipeline.value.steps[idx]?.params.tissue_type || selectedTissueType.value),
      );
      loadMarkerPreset(selectedTissueType.value);
      loadClusterMarkers();
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
  <div class="min-h-screen bg-slate-50 pb-10">
    <!-- Header -->
    <div class="compact-project-header border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/tasks')"
            class="w-fit cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div class="min-w-[160px]">
            <h1 class="text-xl font-bold text-slate-900">
              {{ pipeline?.name || '加载中...' }}
            </h1>
          </div>
          <div
            v-if="pipeline"
            class="grid flex-1 grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm md:grid-cols-3"
          >
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-400">样本物种</p>
              <p class="truncate font-semibold text-slate-800" :title="formatSpecies(pipeline.species)">
                {{ formatSpecies(pipeline.species) }}
              </p>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-400">样本数据位置</p>
              <p class="truncate font-semibold text-slate-800" :title="pipeline.dataPath || '-'">
                {{ pipeline.dataPath || '-' }}
              </p>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-400">项目描述</p>
              <p class="truncate font-semibold text-slate-800" :title="pipeline.description || '-'">
                {{ pipeline.description || '-' }}
              </p>
            </div>
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
      <div class="space-y-5">
        <PipelineStepper
          v-model:active-step-index="activeStepIndex"
          :current-step="pipeline.currentStep"
          :steps="pipeline.steps"
        />

        <!-- 步骤详情 -->
        <div class="min-w-0 space-y-4">
          <template v-if="activeStep">
            <!-- 当前步骤工具栏 -->
            <div class="active-step-toolbar rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <component
                        :is="stepIcons[activeStep.stepType] || Database"
                        class="h-5 w-5 text-blue-600"
                      />
                    </div>
                    <div class="min-w-0">
                      <h2 class="truncate text-lg font-black text-slate-900">
                        步骤 {{ activeStepIndex + 1 }} · {{ STEP_LABELS[activeStep.stepType] || activeStep.stepType }}
                      </h2>
                      <p v-if="isDataLoadStep && pipeline" class="mt-0.5 flex min-w-0 items-center gap-2 truncate text-sm text-slate-500">
                        <Folder class="h-3.5 w-3.5 shrink-0 text-blue-400" />
                        <span class="truncate">{{ pipeline.dataPath ? `我的数据/${pipeline.dataPath}` : '未指定数据路径' }}</span>
                        <span
                          v-if="pipeline.species"
                          class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {{ pipeline.species }}
                        </span>
                      </p>
                      <p v-else class="mt-0.5 truncate text-sm text-slate-500">
                        {{ STEP_DESCRIPTIONS[activeStep.stepType] || '' }}
                      </p>
                    </div>
                </div>

                <!-- 右侧操作区 -->
                <div class="flex flex-wrap items-center gap-3 lg:justify-end">
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
                      activeStep.status === 'running' ||
                      activeStep.status === 'error' ||
                      currentStepLogs.length > 0
                    "
                    @click="openLogDrawer"
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <FileText class="h-4 w-4" />
                    日志
                  </button>

                  <!-- 注释步骤：保存 h5ad 按钮 -->
                  <template v-if="isAnnotationStep && activeStep.status === 'completed'">
                    <div class="relative">
                      <button
                        @click="showSaveDropdown = !showSaveDropdown"
                        :disabled="savingH5ad"
                        class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Loader2 v-if="savingH5ad" class="h-4 w-4 animate-spin" />
                        <Save v-else class="h-4 w-4" />
                        {{ savingH5ad ? '保存中...' : '保存 h5ad' }}
                      </button>
                      <!-- 下拉菜单 -->
                      <div
                        v-if="showSaveDropdown && !savingH5ad"
                        class="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                      >
                        <button
                          @click="handleDownloadH5ad(); showSaveDropdown = false"
                          class="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Download class="h-4 w-4 text-blue-500" />
                          下载到本地
                        </button>
                        <button
                          @click="handleSaveToMyData(); showSaveDropdown = false"
                          class="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Folder class="h-4 w-4 text-emerald-500" />
                          保存到我的数据
                        </button>
                      </div>
                    </div>
                  </template>

                  <!-- 非注释步骤：运行按钮 -->
                  <button
                    v-else
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

            <div
              class="step-workspace-grid grid gap-5"
              :class="isAnnotationStep ? 'annotation-step-workspace xl:grid-cols-1' : 'xl:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] xl:items-start'"
            >
              <div
                class="min-w-0"
                :class="isAnnotationStep ? 'annotation-workbench-card !-mt-px' : 'space-y-4'"
              >
            <!-- ========== 数据读取步骤 ========== -->
            <template v-if="isDataLoadStep">
              <div
                v-if="!pipeline.dataPath"
                class="!-mt-px flex flex-col items-center justify-center rounded-b-xl rounded-t-none border border-slate-200 bg-white py-12"
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
              <SampleGroupTable
                v-else
                :loading="loadingSamples"
                :rows="sampleRows"
                @change="saveSampleDict"
              />
            </template>

            <!-- ========== 通用步骤UI：参数 + 结果独立卡片 ========== -->
            <template v-else>
              <template v-if="isAnnotationStep">
                <AnnotationWorkbench
                  :auto-annotate-loading="autoAnnotateLoading"
                  :auto-annotate-result="autoAnnotateResult"
                  :cluster-markers-table="clusterMarkersTable"
                  :cluster-rows="clusterTableData"
                  :dotplot-loading="dotplotLoading"
                  :dotplot-url="dotplotUrl"
                  :get-step-chart-url="getStepChartUrl"
                  :marker-rows="markerTableRows"
                  :running="running"
                  :selected-tissue-type="selectedTissueType"
                  :tissue-options="annotationTissueOptions"
                  @add-marker-row="addMarkerRow"
                  @apply-auto-annotation="applyAutoAnnotation"
                  @auto-annotate="handleAutoAnnotate"
                  @generate-dotplot="handleGenerateDotplot"
                  @load-marker-preset="loadMarkerPreset"
                  @open-preview="openLightbox"
                  @remove-marker-row="removeMarkerRow"
                  @reset-annotation="resetAllAnnotation"
                  @submit="submitClusterAnnotation"
                />
                <StepResultPanel
                  class="mt-5"
                  :get-chart-url="getChartUrl"
                  :step="activeStep"
                  :step-label="STEP_LABELS[activeStep.stepType] || activeStep.stepType"
                  @open-preview="openLightbox"
                />
              </template>

              <!-- ===== 参数配置卡片 ===== -->
              <div
                v-else
                class="!-mt-px overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white px-8 py-6"
              >
                <!-- 通用参数配置 -->
                <div v-if="currentStepParamConfigs.length > 0">

                  <!-- 有分组时：卡片式分组布局 -->
                  <template v-if="paramGroups.length > 0">
                    <div v-for="(group, gIdx) in paramGroups" :key="group" :class="gIdx > 0 ? 'mt-4 pt-1' : ''">
                      <!-- 分组标题 -->
                      <div class="mb-2 flex items-center gap-2">
                        <Layers class="h-4 w-4 text-blue-500" />
                        <span class="text-base font-bold text-slate-800">{{ group }}</span>
                      </div>
                      <!-- 参数 grid -->
                      <div class="pipeline-param-grid grid grid-cols-1 gap-2">
                        <template v-for="cfg in getParamsByGroup(group)" :key="cfg.key">
                          <div class="pipeline-param-field flex items-center gap-3 rounded-md border border-slate-100 bg-white px-2.5 py-2">
                            <!-- 标签行：label + tooltip + 推荐值 -->
                            <div class="pipeline-param-label grid w-28 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
                              <span class="pipeline-param-label-text min-w-0 break-all text-sm font-medium leading-snug text-slate-700">{{ cfg.label }}</span>
                              <div class="pipeline-param-tooltip group relative mt-0.5 shrink-0">
                                <span :class="paramTooltipIconClass">?</span>
                                <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                  {{ cfg.tooltip }}
                                  <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                              </div>
                            </div>
                            <!-- 输入控件 -->
                            <div v-if="cfg.controlType === 'number'" class="pipeline-number-control flex h-8 min-w-0 flex-1 items-center">
                              <button
                                type="button"
                                @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)"
                                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >−</button>
                              <input
                                :value="activeStep.params[cfg.key]"
                                @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)"
                                type="number"
                                class="h-8 min-w-0 flex-1 border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)"
                                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              >+</button>
                            </div>
                            <select
                              v-else-if="cfg.controlType === 'select'"
                              :value="activeStep.params[cfg.key]"
                              @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)"
                              class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                              class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                    <!-- 未分组的参数 -->
                    <div v-if="ungroupedParams.length > 0" class="mt-4">
                      <div class="pipeline-param-grid grid grid-cols-1 gap-2">
                        <template v-for="cfg in ungroupedParams" :key="cfg.key">
                          <div class="pipeline-param-field flex items-center gap-3 rounded-md border border-slate-100 bg-white px-2.5 py-2">
                            <div class="pipeline-param-label grid w-28 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
                              <span class="pipeline-param-label-text min-w-0 break-all text-sm font-medium leading-snug text-slate-700">{{ cfg.label }}</span>
                              <div class="pipeline-param-tooltip group relative mt-0.5 shrink-0">
                                <span :class="paramTooltipIconClass">?</span>
                                <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                  {{ cfg.tooltip }}
                                  <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                              </div>
                            </div>
                            <div v-if="cfg.controlType === 'number'" class="pipeline-number-control flex h-8 min-w-0 flex-1 items-center">
                              <button type="button" @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">−</button>
                              <input :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)" type="number" class="h-8 min-w-0 flex-1 border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                              <button type="button" @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">+</button>
                            </div>
                            <select v-else-if="cfg.controlType === 'select'" :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)" class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
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
                              class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>

                  <!-- 无分组时：同样的卡片 grid -->
                  <template v-else>
                    <div class="pipeline-param-grid grid grid-cols-1 gap-2">
                      <template v-for="cfg in basicParamConfigs" :key="cfg.key">
                        <div class="pipeline-param-field flex items-center gap-3 rounded-md border border-slate-100 bg-white px-2.5 py-2">
                          <div class="pipeline-param-label grid w-28 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
                            <span class="pipeline-param-label-text min-w-0 break-all text-sm font-medium leading-snug text-slate-700">{{ cfg.label }}</span>
                            <div class="pipeline-param-tooltip group relative mt-0.5 shrink-0">
                              <span :class="paramTooltipIconClass">?</span>
                              <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {{ cfg.tooltip }}
                                <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            </div>
                          </div>
                           <div v-if="cfg.controlType === 'number'" class="pipeline-number-control flex h-8 min-w-0 flex-1 items-center">
                            <button type="button" @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">−</button>
                            <input :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)" type="number" class="h-8 min-w-0 flex-1 border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                            <button type="button" @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">+</button>
                          </div>
                          <select v-else-if="cfg.controlType === 'select'" :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)" class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
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
                            class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="逗号分隔，如 CD3D,CD8A,MS4A1"
                          />
                        </div>
                      </template>
                    </div>
                  </template>

                  <div
                    v-if="advancedParamConfigs.length > 0"
                    class="mt-3 border-t border-slate-100 pt-2"
                  >
                    <button
                      type="button"
                      class="pipeline-advanced-toggle flex w-full items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      @click="toggleAdvancedParams"
                    >
                      <span>高级参数</span>
                      <ChevronRight
                        class="h-4 w-4 transition-transform"
                        :class="activeStepAdvancedParamsOpen ? 'rotate-90' : ''"
                      />
                    </button>

                    <div
                      v-if="activeStepAdvancedParamsOpen"
                      class="pipeline-param-grid mt-2 grid grid-cols-1 gap-2"
                    >
                      <template v-for="cfg in advancedParamConfigs" :key="cfg.key">
                        <div class="pipeline-param-field flex items-center gap-3 rounded-md border border-slate-100 bg-white px-2.5 py-2">
                          <div class="pipeline-param-label grid w-28 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5">
                            <span class="pipeline-param-label-text min-w-0 break-all text-sm font-medium leading-snug text-slate-700">{{ cfg.label }}</span>
                            <div class="pipeline-param-tooltip group relative mt-0.5 shrink-0">
                              <span :class="paramTooltipIconClass">?</span>
                              <div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {{ cfg.tooltip }}
                                <div class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                              </div>
                            </div>
                          </div>
                          <div v-if="cfg.controlType === 'number'" class="pipeline-number-control flex h-8 min-w-0 flex-1 items-center">
                            <button type="button" @click="adjustParam(cfg.key, -(cfg.step ?? 1), cfg.min)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">−</button>
                            <input :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, parseFloat((e.target as HTMLInputElement).value) || 0)" type="number" class="h-8 min-w-0 flex-1 border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 [appearance:textfield] focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                            <button type="button" @click="adjustParam(cfg.key, cfg.step ?? 1, undefined, cfg.max)" class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-white text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">+</button>
                          </div>
                          <select v-else-if="cfg.controlType === 'select'" :value="activeStep.params[cfg.key]" @change="(e: Event) => setParam(cfg.key, (e.target as HTMLSelectElement).value)" class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
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
                            class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      </template>
                    </div>
                  </div>

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

            </template>
                <StepStatsSummary v-if="!isAnnotationStep" :step="activeStep" />
              </div>
              <aside v-if="!isAnnotationStep" class="min-w-0 xl:sticky xl:top-[104px]">
                <StepResultPanel
                  :get-chart-url="getChartUrl"
                  :step="activeStep"
                  :step-label="STEP_LABELS[activeStep.stepType] || activeStep.stepType"
                  @open-preview="openLightbox"
                />
              </aside>
            </div>
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

    <!-- ========== 保存到我的数据 Modal ========== -->
    <Transition name="fade">
      <div
        v-if="showSaveModal"
        class="fixed inset-0 z-[55] flex items-center justify-center"
        @click.self="showSaveModal = false"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-bold text-slate-900">保存到我的数据</h3>

          <!-- 文件名 -->
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">文件名</label>
            <div class="flex items-center gap-0">
              <input
                v-model="saveFileName"
                class="flex-1 rounded-l-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="输入文件名"
              />
              <span class="rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">.h5ad</span>
            </div>
          </div>

          <!-- 目标文件夹 -->
          <div class="mb-5">
            <label class="mb-1.5 block text-sm font-medium text-slate-700">保存位置</label>
            <button
              @click="showFolderPicker = !showFolderPicker"
              class="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
            >
              <Folder class="h-4 w-4 text-emerald-500" />
              <span class="flex-1">{{ saveTargetFolderName }}</span>
              <ChevronDown class="h-4 w-4 text-slate-400 transition-transform" :class="{ 'rotate-180': showFolderPicker }" />
            </button>

            <!-- 文件夹树 -->
            <div
              v-if="showFolderPicker"
              class="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white"
            >
              <div v-if="loadingFolders" class="flex items-center justify-center py-4">
                <Loader2 class="h-4 w-4 animate-spin text-slate-400" />
                <span class="ml-2 text-sm text-slate-500">加载中...</span>
              </div>
              <template v-else>
                <!-- 根目录 -->
                <button
                  @click="selectFolder(null, '根目录')"
                  class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                  :class="saveTargetFolderId === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'"
                >
                  <Folder class="h-4 w-4 text-slate-400" />
                  根目录（我的数据）
                </button>
                <!-- 文件夹列表 -->
                <template v-for="folder in folderTree" :key="folder.key">
                  <button
                    @click="selectFolder(Number(folder.key), folder.title)"
                    class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 pl-6 text-left text-sm hover:bg-blue-50"
                    :class="saveTargetFolderId === Number(folder.key) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'"
                  >
                    <Folder class="h-4 w-4 text-amber-500" />
                    {{ folder.title }}
                  </button>
                  <template v-if="folder.children?.length">
                    <button
                      v-for="sub in folder.children"
                      :key="sub.key"
                      @click="selectFolder(Number(sub.key), sub.title)"
                      class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 pl-10 text-left text-sm hover:bg-blue-50"
                      :class="saveTargetFolderId === Number(sub.key) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'"
                    >
                      <Folder class="h-4 w-4 text-amber-400" />
                      {{ sub.title }}
                    </button>
                  </template>
                </template>
              </template>
            </div>
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end gap-3">
            <button
              @click="showSaveModal = false"
              class="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              @click="confirmSaveToMyData"
              :disabled="savingH5ad || !saveFileName.trim()"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="savingH5ad" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ savingH5ad ? '保存中...' : '确认保存' }}
            </button>
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
.pipeline-param-label-text {
  overflow-wrap: anywhere;
}

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
