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
  Map,
  Play,
  ScatterChart,
  Tag,
  Users,
  X,
  ZoomIn,
} from 'lucide-vue-next';
import { message, Table as ATable } from 'ant-design-vue';

import {
  generateDotplot as generateDotplotApi,
  generateFeatureplot as generateFeatureplotApi,
  autoAnnotate as autoAnnotateApi,
  getPipeline as fetchPipelineApi,
  getFilesInFolder,
  getStepLogs,
  getCelltypes,
  runStep as runStepApi,
  saveH5adToMyData as saveH5adApi,
  updateSampleDict,
} from '#/api/pipeline';
import { ChevronDown, Download, Save, Trash2 } from 'lucide-vue-next';

import { STEP_DESCRIPTIONS, STEP_LABELS } from './types/pipeline';
import { STEP_PARAM_CONFIGS } from './types/stepParamConfigs';
import { TISSUE_TYPE_OPTIONS } from './types/tissueMarkerPresets';
import { STEP_HELP_CONTENT } from './types/stepHelpContent';
import { getCellTypesForTissue } from './types/cellTypeMarkers';
import PipelineStepper from './components/PipelineStepper.vue';
import SampleGroupTable from './components/SampleGroupTable.vue';
import StepResultPanel from './components/StepResultPanel.vue';

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

// ========== 参数表单逻辑 ==========

// 存储亚群分析可用的大类细胞类型列表
const subAnnotationCellTypes = ref<{ name: string; count: number }[]>([]);
const isFetchingCellTypes = ref(false);

// 当前步骤的参数配置列表
const currentStepParamConfigs = computed<ParamFieldConfig[]>(() => {
  if (!activeStep.value) return [];
  const configs = STEP_PARAM_CONFIGS[activeStep.value.stepType] || [];
  
  // 对于亚群分析，动态注入下拉选项
  if (activeStep.value.stepType === 'sub_annotation' && subAnnotationCellTypes.value.length > 0) {
    return configs.map(c => {
      if (c.key === 'target_celltype') {
        return {
          ...c,
          options: subAnnotationCellTypes.value.map(ct => ({
            label: `${ct.name} (${ct.count} cells)`,
            value: ct.name,
          })),
        };
      }
      return c;
    });
  }
  
  return configs;
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

// ===== Marker 可编辑表格 =====
interface MarkerRow {
  cellType: string;
  markers: string;
}
const selectedTissueType = ref('pbmc');
const markerTableRows = ref<MarkerRow[]>([]);
const dotplotUrl = ref('');
const dotplotLoading = ref(false);
const featureplotUrl = ref('');
const featureplotLoading = ref(false);
const activeAnnotationVizTab = ref<'dotplot' | 'featureplot'>('dotplot'); // Dotplot / Feature Plot 切换
const showMarkerTable = ref(false); // Marker 表折叠状态
const showSaveDropdown = ref(false); // 保存 h5ad 下拉菜单
const savingH5ad = ref(false); // 保存中状态

// ===== 自动注释相关 =====
const autoAnnotateResult = ref<Record<string, { cell_type: string; score: number; confidence: number }>>({});
const autoAnnotateLoading = ref(false);

// Marker 表中的细胞类型候选列表（供 Cluster 映射下拉使用）
const candidateCellTypes = computed(() =>
  markerTableRows.value.map((r) => r.cellType).filter(Boolean),
);
// 从知识库加载组织类型的 Marker 预设，并自动触发后端注释
const loadMarkerPreset = (tissue: string) => {
  selectedTissueType.value = tissue;
  if (!activeStep.value) return;
  const organism = activeStep.value.params['organism'] as string || 'human';
  const speciesMap: Record<string, 'Human' | 'Mouse'> = { human: 'Human', mouse: 'Mouse' };
  const tissueMap: Record<string, string> = {
    pbmc: 'Immune', lung: 'Lung', liver: 'Liver', brain: 'Brain',
    tumor: 'Immune', gut: 'GI_tract', kidney: 'Kidney', skin: 'Skin', other: 'Immune',
  };
  const sp = speciesMap[organism] || 'Human';
  const ts = tissueMap[tissue] || 'Immune';
  const cellTypes = getCellTypesForTissue(sp, ts);
  markerTableRows.value = cellTypes.map((ct) => ({
    cellType: ct.cellType,
    markers: ct.positive.join(', '),
  }));
  // 选择组织后自动触发自动注释（异步，不阻塞 UI）
  handleAutoAnnotate();
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
    const markerDict: Record<string, string[]> = {};
    for (const row of markerTableRows.value) {
      if (!row.cellType.trim()) continue;
      const genes = row.markers
        .split(/[,，\s]+/)
        .map((g) => g.trim())
        .filter(Boolean);
      if (genes.length > 0) {
        markerDict[row.cellType.trim()] = genes;
      }
    }
    if (Object.keys(markerDict).length === 0) return;
    const resp = await generateDotplotApi(pipeline.value.id, markerDict);
    dotplotUrl.value = resp.url;
  } catch (error) {
    console.error('生成 Dotplot 失败:', error);
  } finally {
    dotplotLoading.value = false;
  }
};

// 收集 marker 表格中的所有基因并调用后端生成 Feature Plot
const handleGenerateFeatureplot = async () => {
  if (!pipeline.value || markerTableRows.value.length === 0) return;
  featureplotLoading.value = true;
  try {
    // 从 marker 表提取所有基因
    const allGenes = new Set<string>();
    for (const row of markerTableRows.value) {
      const genes = row.markers
        .split(/[,，\s]+/)
        .map((g) => g.trim())
        .filter(Boolean);
      genes.forEach((g) => allGenes.add(g));
    }
    if (allGenes.size === 0) return;
    const resp = await generateFeatureplotApi(pipeline.value.id, [...allGenes]);
    featureplotUrl.value = resp.url;
    // 自动切换到 Feature Plot tab
    activeAnnotationVizTab.value = 'featureplot';
  } catch (error) {
    console.error('生成 Feature Plot 失败:', error);
  } finally {
    featureplotLoading.value = false;
  }
};

// 调用后端自动注释预览，获取 cluster→cell_type 映射
const handleAutoAnnotate = async () => {
  if (!pipeline.value || !activeStep.value) return;
  autoAnnotateLoading.value = true;
  try {
    const method = (activeStep.value.params['annotation_method'] as string) || 'panglaodb';
    const organism = (activeStep.value.params['organism'] as string) || 'human';
    const result = await autoAnnotateApi(pipeline.value.id, method, organism);
    autoAnnotateResult.value = result;
    // 将结果自动填入 Cluster 映射表
    for (const row of clusterTableData.value) {
      const autoResult = result[row.cluster];
      if (autoResult && autoResult.cell_type) {
        // 仅在用户未手动填写的情况下自动填入
        if (!row.cellType || row.cellType.trim() === '') {
          row.cellType = autoResult.cell_type;
        }
      }
    }
    message.success(`自动注释完成，已为 ${Object.keys(result).length} 个 Cluster 生成建议`);
  } catch (error) {
    console.error('自动注释失败:', error);
    message.error('自动注释失败，请检查降维聚类步骤是否完成');
  } finally {
    autoAnnotateLoading.value = false;
  }
};

// 一键用自动注释结果填充所有 Cluster
const fillAllAutoAnnotation = () => {
  for (const row of clusterTableData.value) {
    const autoResult = autoAnnotateResult.value[row.cluster];
    if (autoResult && autoResult.cell_type) {
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

// ===== QC 质控图样本切换 =====
const selectedQcSample = ref<string>('all');

// 从当前步骤的 stats.samples 获取样本列表
const qcSampleList = computed<string[]>(() => {
  const samplesObj = activeStep.value?.result?.stats?.samples as Record<string, unknown> | undefined;
  if (!samplesObj) return [];
  return Object.keys(samplesObj);
});

// 数据读取步骤的图后缀
const currentQcChartSuffix = computed(() => {
  if (selectedQcSample.value === 'all') return 'orig_violin.png';
  return `orig_violin_${selectedQcSample.value}.png`;
});

// 质控过滤步骤的图后缀
const currentFilteredChartSuffix = computed(() => {
  if (selectedQcSample.value === 'all') return 'filtered_violin.png';
  return `filtered_violin_${selectedQcSample.value}.png`;
});

// 切换步骤时重置下拉框
watch(activeStepIndex, () => {
  selectedQcSample.value = 'all';
  selectedDimChart.value = 'umap_cluster';
});

// ===== 降维聚类图表切换 =====
const selectedDimChart = ref<string>('umap_cluster');

// 图表选项配置
const DIM_CHART_OPTIONS: { value: string; label: string; match: (u: string) => boolean }[] = [
  { value: 'umap_cluster', label: 'Cluster UMAP', match: (u) => u.includes('umap_cluster') },
  { value: 'umap_sample', label: 'Sample UMAP', match: (u) => u.includes('umap_sample') },
  { value: 'umap_group', label: 'Group UMAP', match: (u) => u.includes('umap_group_split') },
  { value: 'barplot', label: 'Cluster 细胞比例', match: (u) => u.includes('cluster_proportion_barplot') },
  { value: 'hvg', label: '高变基因', match: (u) => u.includes('highly_variable_genes') },
  { value: 'pca', label: 'PCA 方差比', match: (u) => u.includes('pca_variance_ratio') },
];

// 当前可用的图表选项（根据实际返回的 charts 过滤）
const availableDimCharts = computed(() => {
  const charts = activeStep.value?.result?.charts as string[] | undefined;
  if (!charts) return [];
  return DIM_CHART_OPTIONS.filter(opt => charts.some(opt.match));
});

// 当前选中的图表 URL
const currentDimChartUrls = computed(() => {
  const charts = activeStep.value?.result?.charts as string[] | undefined;
  if (!charts) return [];
  const opt = DIM_CHART_OPTIONS.find(o => o.value === selectedDimChart.value);
  if (!opt) return [];
  return charts.filter(opt.match);
});

// ===== Marker 基因表格内联展示 =====
const markerTableColumns = ref<any[]>([]);
const markerTableData = ref<Record<string, string>[]>([]);
const markerTableLoading = ref(false);

const fetchMarkerTable = async () => {
  if (!activeStep.value?.result?.tables) return;
  const tables = activeStep.value.result.tables as string[];
  const target = tables.find((t: string) => t.includes('all_cluster_marker'));
  if (!target) return;

  const url = getChartUrl(target);
  markerTableLoading.value = true;
  try {
    const resp = await fetch(url);
    const text = await resp.text();
    const lines = text.trim().split('\n');
    if (lines.length > 0) {
      const headers = lines[0]!.split('\t').map(h => h.trim());
      console.log('[Marker Table] headers:', headers);
      // 生成 ant-design-vue Table 列配置（仅 cluster 列支持筛选）
      const clusterIdx = headers.findIndex(h => h.toLowerCase() === 'cluster');
      console.log('[Marker Table] clusterIdx:', clusterIdx);
      const clusterValues = clusterIdx >= 0
        ? [...new Set(lines.slice(1).map(l => (l.split('\t')[clusterIdx] || '').trim()))].sort((a, b) => Number(a) - Number(b))
        : [];

      markerTableColumns.value = headers.map(h => ({
        title: h,
        dataIndex: h,
        key: h,
        width: 120,
        ellipsis: true,
        ...(h === 'cluster' && clusterValues.length > 0
          ? {
              filters: clusterValues.map(v => ({ text: `Cluster ${v}`, value: v })),
              onFilter: (value: string, record: Record<string, string>) => record[h] === value,
            }
          : {}),
      }));
      // 生成数据源
      markerTableData.value = lines.slice(1).map((line, idx) => {
        const cells = line.split('\t');
        const row: Record<string, string> = { _key: String(idx) };
        headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
        return row;
      });
    }
  } catch (e) {
    console.error('获取 Marker 表格失败:', e);
  } finally {
    markerTableLoading.value = false;
  }
};

// 切换步骤时重置状态
watch(activeStepIndex, async () => {
  // 切换回图表视图
  activeResultTab.value = 'charts';
  
  // 切换步骤时清空旧数据
  if (activeStep.value?.stepType !== 'find_marker') {
    markerTableColumns.value = [];
    markerTableData.value = [];
  }
  
  // 切换到亚群分析步骤时，获取已有注释细胞类型
  if (activeStep.value?.stepType === 'sub_annotation' && pipeline.value?.id) {
    // 只有在上一步（细胞注释）已完成，且还没有获取过数据时才去获取
    const annotationStep = pipeline.value.steps.find((s) => s.stepType === 'annotation');
    if (annotationStep?.status === 'completed' && subAnnotationCellTypes.value.length === 0 && !isFetchingCellTypes.value) {
      isFetchingCellTypes.value = true;
      try {
        const items = await getCelltypes(pipeline.value.id);
        subAnnotationCellTypes.value = items;
      } catch (err) {
        console.error('获取细胞类型失败', err);
      } finally {
        isFetchingCellTypes.value = false;
      }
    }
  }
});

// 切换到 find_marker 数据表 tab 时自动加载
watch([activeStepIndex, activeResultTab], () => {
  if (activeStep.value?.stepType === 'find_marker' && activeResultTab.value === 'tables' && markerTableData.value.length === 0) {
    fetchMarkerTable();
  }
});

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

// 提交 Cluster→CellType 注释并运行后端
const submitClusterAnnotation = async () => {
  if (!pipeline.value || !activeStep.value) return;
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
    running.value = false;
  }
};
// 下载 h5ad 到本地
const handleDownloadH5ad = () => {
  if (!pipeline.value) return;
  const url = `/static/pipelines/${pipeline.value.userId}/pipelines/${pipeline.value.id}/step_4_annotation/adata_annotated.h5ad`;
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
    message.error(`保存失败: ${err?.message || '未知错误'}`);
  } finally {
    savingH5ad.value = false;
  }
};

// 监听 step 切换时自动初始化映射表
watch([activeStepIndex, clusterList], () => {
  if (isAnnotationStep.value && clusterList.value.length > 0) {
    initClusterMap();
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
  data_load: '01-data_qc',
  qc_filter: '02-cell_filter',
  dim_cluster: '03-dim_cluster',
  find_marker: '04-marker_genes',
  annotation: '05-cell_annotation',
  sub_annotation: '06-sub_cell_annotation',
};

// 将反斜杠统一为正斜杠（Windows 路径兼容）
const normalizePath = (p: string) => p.split('\\').join('/');

// 从 taskOutputDir（绝对路径）提取 median/ 之后的相对路径
const extractRelDir = (absDir: string): string | null => {
  const normalized = normalizePath(absDir);
  const marker = '/median/';
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;
  return normalized.substring(idx + marker.length);
};

// 构建图表/表格的完整访问 URL
const getChartUrl = (relPath: string): string => {
  if (!pipeline.value || !activeStep.value) return relPath;
  if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
  const normalizedPath = normalizePath(relPath);

  // v2: 使用 Pipeline 关联的统一任务目录
  const taskDir = pipeline.value.taskOutputDir;
  if (taskDir) {
    const relDir = extractRelDir(taskDir);
    if (relDir) {
      const stepDir = STEP_OUTPUT_DIRS[activeStep.value.stepType] || `step_${activeStepIndex.value}`;
      return `/static/pipelines/${relDir}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
    }
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
  const taskDir = pipeline.value.taskOutputDir;
  if (taskDir) {
    const relDir = extractRelDir(taskDir);
    if (relDir) {
      const stepDir = STEP_OUTPUT_DIRS[stepType] || stepType;
      return `/static/pipelines/${relDir}/${stepDir}/${normalizedPath}?t=${Date.now()}`;
    }
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
      <div class="space-y-5">
        <PipelineStepper
          v-model:active-step-index="activeStepIndex"
          :current-step="pipeline.currentStep"
          :steps="pipeline.steps"
        />

        <!-- 步骤详情 -->
        <div class="min-w-0 space-y-4">
          <template v-if="activeStep">
            <!-- 步骤头部卡片 -->
            <div class="rounded-t-xl rounded-b-none border border-slate-200 bg-white">
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
            </div>

            <StepResultPanel
              :get-chart-url="getChartUrl"
              :logs="currentStepLogs"
              :step="activeStep"
              :step-label="STEP_LABELS[activeStep.stepType] || activeStep.stepType"
              @open-logs="openLogDrawer"
              @open-preview="openLightbox"
            />

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

              <!-- 运行结果卡片 -->
              <div
                v-if="activeStep.result"
                class="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
                  <div class="flex items-center gap-4">
                    <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
                      <ScatterChart class="h-5 w-5 text-emerald-500" />
                      运行结果
                    </h3>
                    <select
                      v-if="qcSampleList.length > 1"
                      v-model="selectedQcSample"
                      class="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">all samples</option>
                      <option v-for="s in qcSampleList" :key="s" :value="s">{{ s }}</option>
                    </select>
                  </div>
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
                      v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.endsWith(currentQcChartSuffix))"
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
                      图. {{ selectedQcSample !== 'all' ? selectedQcSample + ' 样本' : '各样本' }}质控指标分布（基因数、UMI 总数、线粒体比例、基因复杂度）
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <!-- ========== 通用步骤UI：参数 + 结果独立卡片 ========== -->
            <template v-else>

              <!-- ===== 🔬 注释步骤专属：Marker 基因辅助面板 ===== -->
              <div
                v-if="isAnnotationStep"
                class="!-mt-px overflow-hidden rounded-none border border-b-0 border-slate-200 bg-white"
              >
                <!-- 标题栏 -->
                <div class="flex items-center gap-2 border-b border-slate-100 px-8 py-4">
                  <Tag class="h-5 w-5 text-blue-500" />
                  <h3 class="text-base font-bold text-slate-800">Marker 基因参考</h3>
                  <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                    选择组织 → 编辑 Marker → 生成 Dotplot
                  </span>
                </div>

                <div class="px-8 py-5">
                  <!-- 组织类型选择 + 自动注释状态 -->
                  <div class="mb-5 flex items-center gap-4">
                    <label class="text-sm font-medium text-slate-700 whitespace-nowrap">组织类型</label>
                    <select
                      :value="selectedTissueType"
                      @change="(e: Event) => loadMarkerPreset((e.target as HTMLSelectElement).value)"
                      class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                      :disabled="autoAnnotateLoading"
                    >
                      <option v-for="opt in TISSUE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <!-- 自动注释状态指示 -->
                    <div v-if="autoAnnotateLoading" class="flex items-center gap-2 text-sm text-purple-600">
                      <Loader2 class="h-4 w-4 animate-spin" />
                      <span>自动注释中...</span>
                    </div>
                    <div v-else-if="Object.keys(autoAnnotateResult).length > 0" class="flex items-center gap-2">
                      <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <Check class="h-3 w-3" />
                        已注释 {{ Object.keys(autoAnnotateResult).length }} 个 Cluster
                      </span>
                      <button
                        type="button"
                        @click="handleAutoAnnotate"
                        class="cursor-pointer text-xs text-purple-500 hover:text-purple-700"
                      >
                        🔄 重新注释
                      </button>
                    </div>
                    <span v-else class="text-xs text-slate-400">选择后自动加载 Marker 基因并执行自动注释</span>
                  </div>

                  <!-- Marker 紧凑摘要（默认显示） -->
                  <div v-if="markerTableRows.length > 0 && !showMarkerTable" class="mb-4">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="(row, idx) in markerTableRows"
                        :key="idx"
                        class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs"
                      >
                        <span class="font-semibold text-slate-700">{{ row.cellType }}</span>
                        <span class="text-slate-400">{{ row.markers.split(',').length }} genes</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      @click="showMarkerTable = true"
                      class="mt-2 cursor-pointer text-xs font-medium text-blue-500 hover:text-blue-700"
                    >
                      ✏️ 展开编辑 Marker 表
                    </button>
                  </div>

                  <!-- Marker 可编辑表格（展开时显示） -->
                  <div v-else-if="markerTableRows.length > 0" class="mb-4">
                    <div class="max-h-[320px] overflow-y-auto overflow-hidden rounded-lg border border-slate-200">
                      <table class="w-full text-sm">
                        <thead class="sticky top-0 z-10">
                          <tr class="bg-slate-50">
                            <th class="w-40 px-3 py-2 text-left font-semibold text-slate-600">细胞类型</th>
                            <th class="px-3 py-2 text-left font-semibold text-slate-600">Marker 基因</th>
                            <th class="w-12 px-3 py-2 text-center font-semibold text-slate-600"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(row, idx) in markerTableRows"
                            :key="idx"
                            class="border-t border-slate-100 hover:bg-slate-50/50"
                          >
                            <td class="px-3 py-1.5">
                              <input v-model="row.cellType" type="text"
                                class="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                                placeholder="细胞类型" />
                            </td>
                            <td class="px-3 py-1.5">
                              <input v-model="row.markers" type="text"
                                class="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                                placeholder="CD3D, CD3E, CD4..." />
                            </td>
                            <td class="px-3 py-1.5 text-center">
                              <button type="button" @click="removeMarkerRow(idx)"
                                class="cursor-pointer rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500">
                                <Trash2 class="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="mt-2 flex items-center gap-3">
                      <button type="button" @click="addMarkerRow"
                        class="cursor-pointer text-xs font-medium text-blue-500 hover:text-blue-700">
                        + 添加类型
                      </button>
                      <button type="button" @click="showMarkerTable = false"
                        class="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
                        收起
                      </button>
                    </div>
                  </div>

                  <!-- 无数据提示 -->
                  <div v-else class="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <Tag class="h-4 w-4" />
                    请先选择组织类型以加载预设 Marker 基因
                  </div>

                  <!-- 生成 Dotplot / Feature Plot 按钮区 -->
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      @click="handleGenerateDotplot"
                      :disabled="dotplotLoading || markerTableRows.length === 0"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Loader2 v-if="dotplotLoading" class="h-4 w-4 animate-spin" />
                      <ScatterChart v-else class="h-4 w-4" />
                      {{ dotplotLoading ? '生成中...' : '生成 Dotplot' }}
                    </button>
                    <button
                      type="button"
                      @click="handleGenerateFeatureplot"
                      :disabled="featureplotLoading || markerTableRows.length === 0"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Loader2 v-if="featureplotLoading" class="h-4 w-4 animate-spin" />
                      <Map v-else class="h-4 w-4" />
                      {{ featureplotLoading ? '生成中...' : 'Feature Plot' }}
                    </button>
                  </div>

                  <!-- 可视化结果 Tab 切换 -->
                  <div v-if="dotplotUrl || featureplotUrl" class="mt-5">
                    <!-- Tab 切换栏 -->
                    <div class="mb-3 flex items-center gap-1 rounded-lg bg-slate-100 p-1" style="width: fit-content;">
                      <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all"
                        :class="activeAnnotationVizTab === 'dotplot' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                        @click="activeAnnotationVizTab = 'dotplot'"
                        :disabled="!dotplotUrl"
                      >
                        <ScatterChart class="h-4 w-4" />
                        Dotplot
                      </button>
                      <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all"
                        :class="activeAnnotationVizTab === 'featureplot' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                        @click="activeAnnotationVizTab = 'featureplot'"
                        :disabled="!featureplotUrl"
                      >
                        <Map class="h-4 w-4" />
                        Feature Plot
                      </button>
                    </div>

                    <!-- Dotplot 预览 -->
                    <div
                      v-if="activeAnnotationVizTab === 'dotplot' && dotplotUrl"
                      class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-2 ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                      @click="openLightbox(getStepChartUrl(dotplotUrl, 'annotation'))"
                    >
                      <img
                        :src="getStepChartUrl(dotplotUrl, 'annotation')"
                        alt="Marker Dotplot"
                        class="w-full rounded-lg"
                      />
                      <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                        <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                          <ZoomIn class="h-3.5 w-3.5" />
                          点击放大
                        </div>
                      </div>
                    </div>

                    <!-- Feature Plot 预览 -->
                    <div
                      v-if="activeAnnotationVizTab === 'featureplot' && featureplotUrl"
                      class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-2 ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                      @click="openLightbox(getStepChartUrl(featureplotUrl, 'annotation'))"
                    >
                      <img
                        :src="getStepChartUrl(featureplotUrl, 'annotation')"
                        alt="Feature Plot"
                        class="w-full rounded-lg"
                      />
                      <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                        <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                          <ZoomIn class="h-3.5 w-3.5" />
                          点击放大
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ===== 参数配置卡片 ===== -->
              <div class="!-mt-px overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white px-8 py-6">

                <!-- 注释步骤专属：Cluster → CellType 映射表格 -->
                <template v-if="isAnnotationStep && clusterList.length > 0">
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Tag class="h-5 w-5 text-blue-500" />
                      <h3 class="text-base font-bold text-slate-800">Cluster 细胞类型注释</h3>
                      <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                        共 {{ clusterList.length }} 个 Cluster
                      </span>
                    </div>
                    <!-- 工具按钮（一键填充 / 重置） -->
                    <div class="flex items-center gap-2">
                      <button
                        v-if="Object.keys(autoAnnotateResult).length > 0"
                        type="button"
                        @click="fillAllAutoAnnotation"
                        class="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        一键填充
                      </button>
                      <button
                        type="button"
                        @click="resetAllAnnotation"
                        class="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        重置
                      </button>
                    </div>
                  </div>

                  <div class="max-h-[400px] overflow-y-auto overflow-hidden rounded-lg border border-slate-200">
                    <table class="w-full text-sm">
                      <thead class="sticky top-0 z-10">
                        <tr class="bg-slate-50">
                          <th class="w-20 px-4 py-2.5 text-center font-semibold text-slate-600">Cluster</th>
                          <th v-if="Object.keys(autoAnnotateResult).length > 0" class="w-40 px-4 py-2.5 text-left font-semibold text-purple-600">
                            🤖 自动注释
                          </th>
                          <th class="px-4 py-2.5 text-left font-semibold text-slate-600">细胞类型（从 Marker 表选择或手动输入）</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in clusterTableData"
                          :key="row.cluster"
                          class="border-t border-slate-100 transition-colors"
                          :class="row.cellType?.trim() ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'bg-amber-50/20 hover:bg-amber-50/40'"
                        >
                          <td class="px-4 py-2 text-center">
                            <span class="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                              {{ row.cluster }}
                            </span>
                          </td>
                          <!-- 自动注释参考列（只读） -->
                          <td v-if="Object.keys(autoAnnotateResult).length > 0" class="px-4 py-2">
                            <div v-if="autoAnnotateResult[row.cluster]" class="flex items-center gap-2">
                              <span class="text-xs text-purple-700">{{ autoAnnotateResult[row.cluster]?.cell_type }}</span>
                              <span
                                class="rounded px-1.5 py-0.5 text-[10px] font-bold"
                                :class="(autoAnnotateResult[row.cluster]?.confidence ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (autoAnnotateResult[row.cluster]?.confidence ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'"
                              >
                                {{ autoAnnotateResult[row.cluster]?.confidence ?? 0 }}%
                              </span>
                            </div>
                            <span v-else class="text-xs text-slate-300">—</span>
                          </td>
                          <td class="px-4 py-2">
                            <div class="flex items-center gap-2">
                              <!-- 下拉选择器（候选来自 Marker 表） -->
                              <select
                                v-if="candidateCellTypes.length > 0"
                                :value="row.cellType"
                                @change="(e: Event) => row.cellType = (e.target as HTMLSelectElement).value"
                                class="h-8 w-48 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                              >
                                <option value="">选择...</option>
                                <option v-for="ct in candidateCellTypes" :key="ct" :value="ct">{{ ct }}</option>
                              </select>
                              <!-- 输入框（可覆盖或直接输入） -->
                              <input
                                v-model="row.cellType"
                                type="text"
                                class="h-8 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none"
                                placeholder="或手动输入细胞类型..."
                              />
                              <!-- 已填/未填状态指示 -->
                              <span v-if="row.cellType?.trim()" class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"></span>
                              <span v-else class="h-2 w-2 shrink-0 rounded-full bg-amber-300"></span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="mt-4 flex items-center justify-between">
                    <p class="text-xs text-slate-400">
                      💡 流程：① 选择组织类型自动注释 → ② 参考 Dotplot / Feature Plot 核验 → ③ 手动修改后提交
                    </p>
                    <button
                      type="button"
                      @click="submitClusterAnnotation"
                      :disabled="running"
                      class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Loader2 v-if="running" class="h-4 w-4 animate-spin" />
                      <Check v-else class="h-4 w-4" />
                      {{ running ? '运行中...' : '提交注释' }}
                    </button>
                  </div>
                </template>

                <!-- 通用参数配置 -->
                <template v-else>
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
                </template>
              </div>

              <!-- ===== 分析结果卡片 ===== -->
              <div v-if="activeStep.result" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div class="flex items-center justify-between border-b border-slate-100 px-8 py-4">
                <div class="flex items-center gap-4">
                <h3 class="flex items-center gap-2 text-base font-bold text-slate-800">
                  <ScatterChart class="h-5 w-5 text-emerald-500" />
                  分析结果
                </h3>
                <!-- 降维聚类图表下拉框 -->
                <select
                  v-if="activeStep.stepType === 'dim_cluster' && availableDimCharts.length > 0"
                  v-model="selectedDimChart"
                  class="h-8 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option v-for="opt in availableDimCharts" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                </div>
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

                <!-- Tab 切换栏（降维聚类步骤不显示 tab，改用下拉框） -->
                <div
                  v-if="activeStep.stepType !== 'dim_cluster' && ((activeStep.result.charts && activeStep.result.charts.length > 0) || (activeStep.result.tables && activeStep.result.tables.length > 0))"
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
                    <!-- 降维聚类：下拉框切换图表（下拉框已移到标题栏） -->

                    <!-- UMAP 类型：并排展示，限制最大宽度 -->
                    <div v-if="selectedDimChart === 'umap_cluster' || selectedDimChart === 'umap_sample'" class="mx-auto grid max-w-3xl gap-3" :class="currentDimChartUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
                      <template v-for="(chartUrl, idx) in currentDimChartUrls" :key="idx">
                        <div>
                          <div
                            class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                            @click="openLightbox(getChartUrl(chartUrl))"
                          >
                            <img :src="getChartUrl(chartUrl)" :alt="selectedDimChart" class="w-full rounded-lg" loading="lazy" />
                            <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                              <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                                <ZoomIn class="h-3.5 w-3.5" />
                                点击放大
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>

                    <!-- 其他图表：居中限宽展示 -->
                    <template v-else>
                      <template v-for="(chartUrl, idx) in currentDimChartUrls" :key="idx">
                        <div
                          class="group relative mx-auto mb-2 max-w-3xl cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                          @click="openLightbox(getChartUrl(chartUrl))"
                        >
                          <img :src="getChartUrl(chartUrl)" :alt="selectedDimChart" class="w-full rounded-lg" loading="lazy" />
                          <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                            <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                              <ZoomIn class="h-3.5 w-3.5" />
                              点击放大
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
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

                  <!-- 注释步骤：带图例说明的结果展示 -->
                  <template v-else-if="isAnnotationStep">
                    <!-- CellType + Cluster 对照 UMAP 并排 -->
                    <div class="mb-6 grid grid-cols-2 gap-4">
                      <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('umap_dimplot_celltype') || u.includes('umap_cluster_celltype'))" :key="'ct'+idx">
                        <div
                          class="group relative cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                          @click="openLightbox(getChartUrl(chartUrl))"
                        >
                          <img :src="getChartUrl(chartUrl)" :alt="chartUrl.includes('dimplot') ? 'CellType UMAP' : 'Cluster UMAP'" class="w-full rounded-lg" loading="lazy" />
                          <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                            <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                              <ZoomIn class="h-3.5 w-3.5" />
                              点击放大
                            </div>
                          </div>
                          <p class="mt-2 text-center text-xs text-slate-500">
                            {{ chartUrl.includes('dimplot') ? '图. 细胞类型注释 UMAP' : '图. Cluster 聚类 UMAP' }}
                          </p>
                        </div>
                      </template>
                    </div>

                    <!-- 分组 UMAP -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('umap_split_group'))" :key="'grp'+idx">
                      <div
                        class="group relative mb-4 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" alt="分组 UMAP" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                        <p class="mt-2 text-center text-xs text-slate-500">图. 按实验组分组的细胞类型 UMAP</p>
                      </div>
                    </template>

                    <!-- CellType 比例柱状图 -->
                    <template v-for="(chartUrl, idx) in activeStep.result.charts.filter((u: string) => u.includes('celltype_proportion_barplot'))" :key="'bar'+idx">
                      <div
                        class="group relative mb-4 cursor-pointer overflow-hidden rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
                        @click="openLightbox(getChartUrl(chartUrl))"
                      >
                        <img :src="getChartUrl(chartUrl)" alt="CellType Proportion" class="w-full rounded-lg" loading="lazy" />
                        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-all group-hover:bg-black/5">
                          <div class="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                            <ZoomIn class="h-3.5 w-3.5" />
                            点击放大
                          </div>
                        </div>
                        <p class="mt-2 text-center text-xs text-slate-500">图. 各样本细胞类型比例分布（Connected Barplot）</p>
                      </div>
                    </template>
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
                  <!-- find_marker 步骤：使用 Ant Design Table 展示 -->
                  <template v-if="activeStep.stepType === 'find_marker'">
                    <ATable
                      :columns="markerTableColumns"
                      :data-source="markerTableData"
                      :loading="markerTableLoading"
                      :row-key="(r: any) => r._key"
                      :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20','50','100'], showTotal: (total: number) => `共 ${total} 条` }"
                      :scroll="{ x: 'max-content', y: 480 }"
                      size="small"
                      bordered
                    />
                  </template>
                  <!-- 其他步骤：文件下载链接 -->
                  <template v-else>
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
                  </template>
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
