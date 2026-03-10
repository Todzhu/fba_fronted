/**
 * 步骤参数配置定义
 * 定义每个分析步骤的参数元数据：类型、默认值、控件、提示信息
 */
import type { StepType } from './pipeline';

// 参数控件类型
export type ParamControlType = 'number' | 'select' | 'switch' | 'text';

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
  group?: string; // 参数分组（如 '细胞过滤'、'基因过滤'）

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
      group: '细胞过滤',
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
      group: '细胞过滤',
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
      group: '细胞过滤',
    },
    {
      key: 'min_log10GenesPerUMI',
      label: '最小 log10GenesPerUMI',
      tooltip: '基因复杂度下限，低于此值的细胞可能是空液滴或低质量细胞',
      controlType: 'number',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.01,
      group: '细胞过滤',
    },
    {
      key: 'expected_doublet_rate',
      label: '期望双细胞率 (%)',
      tooltip:
        'Scrublet 模拟双细胞的期望比例。10x Genomics 平台通常为 0.5%~8%，取决于上样细胞数',
      controlType: 'number',
      defaultValue: 6,
      min: 0.1,
      max: 30,
      step: 0.5,
      group: '细胞过滤',
    },
    {
      key: 'threshold',
      label: 'Scrublet 阈值',
      tooltip:
        '双细胞得分阈值，高于此值的细胞被标记为双细胞。值越低越严格，通常 Scrublet 自动检测即可',
      controlType: 'number',
      defaultValue: 0.25,
      min: 0.05,
      max: 0.9,
      step: 0.05,
      group: '细胞过滤',
    },
  ],

  // ========== 步骤3：降维聚类（含预处理） ==========
  dim_cluster: [
    // --- 预处理 ---
    {
      key: 'target_sum',
      label: '归一化深度',
      tooltip: '每个细胞的总 UMI 计数缩放到此值后取对数。10000 为标准值',
      controlType: 'number',
      defaultValue: 10_000,
      min: 1000,
      max: 1_000_000,
      step: 1000,
      group: '预处理',
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
      group: '预处理',
    },
    {
      key: 'regress_out_mito',
      label: '回归线粒体',
      tooltip: '在数据缩放时是否回归掉线粒体基因的影响',
      controlType: 'switch',
      defaultValue: true,
      group: '预处理',
    },
    // --- 降维 ---
    {
      key: 'batch_remove',
      label: '批次校正',
      tooltip: '多样本数据建议使用 Harmony 消除批次效应',
      controlType: 'select',
      defaultValue: 'harmony',
      options: [
        { label: 'Harmony', value: 'harmony' },
        { label: 'BBKNN', value: 'bbknn' },
        { label: '无', value: 'none' },
      ],
      group: '降维聚类',
    },
    {
      key: 'n_pcs',
      label: '主成分数',
      tooltip: 'PCA 降维保留的主成分数量，通常选择包含大部分变异的前 N 个',
      controlType: 'number',
      defaultValue: 30,
      min: 5,
      max: 200,
      step: 5,
      group: '降维聚类',
    },
    {
      key: 'n_neighbors',
      label: '近邻数',
      tooltip: '构建近邻图时使用的近邻数量，影响 UMAP 和聚类',
      controlType: 'number',
      defaultValue: 20,
      min: 2,
      max: 100,
      step: 1,
      group: '降维聚类',
    },
    {
      key: 'umap_min_dist',
      label: 'UMAP min_dist',
      tooltip: 'UMAP 最小距离参数，较小的值产生更紧密的聚类',
      controlType: 'number',
      defaultValue: 0.3,
      min: 0.01,
      max: 1,
      step: 0.05,
      group: '降维聚类',
    },
    // --- 聚类 ---
    {
      key: 'resolution',
      label: '分辨率',
      tooltip: '聚类分辨率，值越大产生的聚类数越多。通常 0.3~1.5 之间',
      controlType: 'number',
      defaultValue: 0.8,
      min: 0.1,
      max: 3,
      step: 0.1,
      group: '降维聚类',
    },
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
      group: '降维聚类',
    },
  ],

  // ========== 步骤6：细胞注释 ==========
  annotation: [
    {
      key: 'annotation_method',
      label: '注释方式',
      tooltip: '选择细胞类型注释策略',
      controlType: 'select',
      defaultValue: 'panglaodb',
      options: [
        { label: 'PanglaoDB 自动注释', value: 'panglaodb' },
        { label: 'CellTypist 自动注释', value: 'celltypist' },
        { label: '纯手动注释', value: 'manual' },
      ],
    },
    {
      key: 'organism',
      label: '物种',
      tooltip: '样本来源物种，影响基因名匹配和参考数据库',
      controlType: 'select',
      defaultValue: 'human',
      options: [
        { label: 'Human', value: 'human' },
        { label: 'Mouse', value: 'mouse' },
      ],
    },
    {
      key: 'tissue_type',
      label: '组织类型',
      tooltip: '选择组织类型后会自动预填该组织的常用 Marker 基因',
      controlType: 'select',
      defaultValue: 'pbmc',
      options: [
        { label: 'PBMC（外周血）', value: 'pbmc' },
        { label: '肺组织', value: 'lung' },
        { label: '肝组织', value: 'liver' },
        { label: '脑组织', value: 'brain' },
        { label: '肿瘤组织', value: 'tumor' },
        { label: '肠组织', value: 'gut' },
        { label: '肾组织', value: 'kidney' },
        { label: '皮肤组织', value: 'skin' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      key: 'marker_genes',
      label: 'Marker 基因',
      tooltip: '用于辅助判断细胞类型的标志基因，逗号分隔。选择组织类型后自动预填',
      controlType: 'text',
      defaultValue: 'CD3D,CD3E,CD4,CD8A,CD8B,MS4A1,CD79A,CD14,LYZ,FCGR3A,NKG7,GNLY,PPBP,FCER1A',
    },
  ],

  // ========== 步骤5：亚群分析 ==========
  sub_annotation: [
    {
      key: 'target_cluster',
      label: '目标亚群',
      tooltip: '选择要进行亚群分析的细胞类型或聚类编号，如 "T cells" 或 "0,1,3"',
      controlType: 'select',
      defaultValue: '',
      options: [], // 动态填充
      group: '亚群选择',
    },
    {
      key: 'sub_n_top_genes',
      label: '高变基因数',
      tooltip: '亚群重新分析时筛选的高变基因数',
      controlType: 'number',
      defaultValue: 2000,
      min: 500,
      max: 10_000,
      step: 100,
      group: '重聚类',
    },
    {
      key: 'sub_resolution',
      label: '分辨率',
      tooltip: '亚群聚类分辨率，亚群分析通常需要更高的分辨率（0.5~2.0）',
      controlType: 'number',
      defaultValue: 0.8,
      min: 0.1,
      max: 3,
      step: 0.1,
      group: '重聚类',
    },
    {
      key: 'sub_n_neighbors',
      label: '近邻数',
      tooltip: '亚群分析的近邻数',
      controlType: 'number',
      defaultValue: 15,
      min: 2,
      max: 50,
      step: 1,
      group: '重聚类',
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
