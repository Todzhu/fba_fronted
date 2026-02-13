/**
 * 步骤参数配置定义
 * 定义每个分析步骤的参数元数据：类型、默认值、控件、提示信息
 */
import type { StepType } from './pipeline';

// 参数控件类型
export type ParamControlType = 'number' | 'select' | 'switch';

// 下拉选项
export interface SelectOption {
  label: string;
  value: string;
}

// 单个参数的配置
export interface ParamFieldConfig {
  key: string; // 参数键名
  label: string; // 显示标签
  tooltip: string; // 问号提示
  controlType: ParamControlType;
  defaultValue: boolean | number | string;
  advanced?: boolean; // 是否为高级参数

  // number 类型专用
  min?: number;
  max?: number;
  step?: number; // 步进值

  // select 类型专用
  options?: SelectOption[];
}

// 各步骤参数配置映射
export const STEP_PARAM_CONFIGS: Record<StepType, ParamFieldConfig[]> = {
  // ========== 步骤1：数据读取（参数在样本表格中配置，无额外参数） ==========
  data_load: [],

  // ========== 步骤2：质控过滤 ==========
  qc_filter: [
    {
      key: 'min_genes',
      label: '最低基因数',
      tooltip: '表达基因数低于此值的细胞将被过滤',
      controlType: 'number',
      defaultValue: 200,
      min: 0,
      max: 10_000,
      step: 50,
    },
    {
      key: 'max_genes',
      label: '最高基因数',
      tooltip: '表达基因数高于此值的细胞将被过滤（用于去除双细胞）',
      controlType: 'number',
      defaultValue: 5000,
      min: 500,
      max: 20_000,
      step: 100,
    },
    {
      key: 'max_mito_pct',
      label: '线粒体比例上限 (%)',
      tooltip:
        '线粒体基因占总表达比例超过此值的细胞将被过滤（高线粒体比例通常表示细胞受损）',
      controlType: 'number',
      defaultValue: 20,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: 'min_cells',
      label: '最少细胞数',
      tooltip: '表达该基因的细胞数低于此值的基因将被过滤',
      controlType: 'number',
      defaultValue: 3,
      min: 0,
      max: 100,
      step: 1,
      advanced: true,
    },
  ],

  // ========== 步骤3：数据预处理 ==========
  preprocessing: [
    {
      key: 'normalization_method',
      label: '归一化方法',
      tooltip: '用于消除细胞间测序深度差异的归一化算法',
      controlType: 'select',
      defaultValue: 'log_normalize',
      options: [
        { label: 'Log Normalize', value: 'log_normalize' },
        { label: 'SCTransform', value: 'sctransform' },
        { label: 'Scran', value: 'scran' },
      ],
    },
    {
      key: 'target_sum',
      label: '目标总和',
      tooltip: '归一化时将每个细胞的表达量缩放到此目标总和',
      controlType: 'number',
      defaultValue: 10_000,
      min: 1000,
      max: 100_000,
      step: 1000,
    },
    {
      key: 'n_top_genes',
      label: '高变基因数',
      tooltip: '筛选表达变异最大的 N 个基因，用于后续降维分析',
      controlType: 'number',
      defaultValue: 2000,
      min: 500,
      max: 10_000,
      step: 100,
    },
    {
      key: 'hvg_method',
      label: 'HVG 方法',
      tooltip: '高变基因 (Highly Variable Genes) 的筛选算法',
      controlType: 'select',
      defaultValue: 'seurat',
      options: [
        { label: 'Seurat', value: 'seurat' },
        { label: 'Cell Ranger', value: 'cell_ranger' },
        { label: 'Seurat v3', value: 'seurat_v3' },
      ],
      advanced: true,
    },
    {
      key: 'regress_out_mito',
      label: '回归线粒体',
      tooltip: '在数据缩放时是否回归掉线粒体基因的影响',
      controlType: 'switch',
      defaultValue: true,
      advanced: true,
    },
  ],

  // ========== 步骤4：降维可视化 ==========
  dim_reduce: [
    {
      key: 'n_pcs',
      label: '主成分数',
      tooltip: 'PCA 降维保留的主成分数量，通常选择包含大部分变异的前 N 个',
      controlType: 'number',
      defaultValue: 50,
      min: 5,
      max: 200,
      step: 5,
    },
    {
      key: 'visualization_method',
      label: '可视化方法',
      tooltip: '用于二维可视化的降维算法',
      controlType: 'select',
      defaultValue: 'umap',
      options: [
        { label: 'UMAP', value: 'umap' },
        { label: 't-SNE', value: 'tsne' },
      ],
    },
    {
      key: 'use_highly_variable',
      label: '仅用高变基因',
      tooltip: '是否仅使用筛选出的高变基因进行降维',
      controlType: 'switch',
      defaultValue: true,
    },
    {
      key: 'umap_min_dist',
      label: 'UMAP min_dist',
      tooltip: 'UMAP 最小距离参数，较小的值产生更紧密的聚类',
      controlType: 'number',
      defaultValue: 0.5,
      min: 0.01,
      max: 1,
      step: 0.05,
      advanced: true,
    },
  ],

  // ========== 步骤5：细胞聚类 ==========
  clustering: [
    {
      key: 'clustering_method',
      label: '聚类方法',
      tooltip: '基于图的无监督聚类算法',
      controlType: 'select',
      defaultValue: 'leiden',
      options: [
        { label: 'Leiden', value: 'leiden' },
        { label: 'Louvain', value: 'louvain' },
      ],
    },
    {
      key: 'resolution',
      label: '分辨率',
      tooltip: '聚类分辨率，值越大产生的聚类数越多。通常 0.3~1.5 之间',
      controlType: 'number',
      defaultValue: 0.5,
      min: 0.1,
      max: 3,
      step: 0.1,
    },
    {
      key: 'n_neighbors',
      label: '近邻数',
      tooltip: '构建近邻图时使用的近邻数量',
      controlType: 'number',
      defaultValue: 15,
      min: 2,
      max: 100,
      step: 1,
    },
    {
      key: 'random_state',
      label: '随机种子',
      tooltip: '用于结果可重复性的随机数种子',
      controlType: 'number',
      defaultValue: 42,
      min: 0,
      max: 99_999,
      step: 1,
      advanced: true,
    },
  ],

  // ========== 步骤6：细胞注释 ==========
  annotation: [
    {
      key: 'annotation_method',
      label: '注释方法',
      tooltip: '细胞类型注释的方法',
      controlType: 'select',
      defaultValue: 'marker_genes',
      options: [
        { label: 'Marker 基因', value: 'marker_genes' },
        { label: 'SingleR 自动注释', value: 'singler' },
        { label: 'CellTypist', value: 'celltypist' },
      ],
    },
    {
      key: 'marker_genes',
      label: 'Marker 基因',
      tooltip: '用逗号分隔的 Marker 基因列表，用于辅助细胞类型判别',
      controlType: 'select',
      defaultValue: 'CD3D,CD4,CD8A,MS4A1,CD14,FCGR3A,NKG7,PPBP',
      options: [], // 允许自由输入
    },
    {
      key: 'show_gene_scores',
      label: '显示基因评分',
      tooltip: '是否在结果中显示各基因的评分热图',
      controlType: 'switch',
      defaultValue: true,
      advanced: true,
    },
  ],
};

/**
 * 根据步骤类型获取默认参数值
 */
export function getDefaultParams(stepType: StepType): Record<string, unknown> {
  const configs = STEP_PARAM_CONFIGS[stepType];
  const params: Record<string, unknown> = {};
  for (const cfg of configs) {
    params[cfg.key] = cfg.defaultValue;
  }
  return params;
}
