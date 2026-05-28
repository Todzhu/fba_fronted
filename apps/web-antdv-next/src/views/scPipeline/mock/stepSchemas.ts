/**
 * scVision 风格单细胞分析步骤参数定义
 */
import type { ParamSchema, StepDefinition, StepType } from '../types/pipeline';

const dataLoadSchema: ParamSchema = {
  type: 'object',
  properties: {
    file_source: {
      type: 'string',
      title: '数据来源',
      description: '选择 10x CellRanger 输出目录来源',
      enum: ['mydata', 'upload'],
      default: 'mydata',
      group: '数据设置',
    },
    input_format: {
      type: 'string',
      title: '数据格式',
      description: '当前流程优先支持 CellRanger filtered_feature_bc_matrix',
      enum: ['cellranger_10x'],
      default: 'cellranger_10x',
      group: '数据设置',
    },
  },
  order: ['file_source', 'input_format'],
};

const cellFilterSchema: ParamSchema = {
  type: 'object',
  properties: {
    min_genes: {
      type: 'integer',
      title: 'min_genes',
      description: '去除表达基因数低于该阈值的细胞',
      default: 200,
      minimum: 0,
      maximum: 5000,
      step: 1,
      widget: 'integer-stepper',
      group: '细胞过滤',
    },
    min_cells: {
      type: 'integer',
      title: 'min_cells',
      description: '去除低于该细胞数表达的基因',
      default: 10,
      minimum: 0,
      maximum: 2000,
      step: 1,
      widget: 'integer-stepper',
      group: '基因过滤',
    },
    pct_counts_mt: {
      type: 'integer',
      title: 'pct_counts_mt',
      description: '线粒体基因比例上限',
      default: 20,
      minimum: 0,
      maximum: 100,
      step: 1,
      widget: 'integer-stepper',
      group: '细胞过滤',
    },
    pct_counts_ribo: {
      type: 'integer',
      title: 'pct_counts_ribo',
      description: '核糖体基因比例上限',
      default: 30,
      minimum: 0,
      maximum: 100,
      step: 1,
      widget: 'integer-stepper',
      group: '细胞过滤',
    },
    max_genes: {
      type: 'integer',
      title: 'max_genes',
      description: '表达基因数上限，用于过滤疑似双细胞',
      default: 5000,
      minimum: 500,
      maximum: 10000,
      step: 1,
      widget: 'integer-stepper',
      group: '细胞过滤',
    },
    expected_doublet_rate: {
      type: 'integer',
      title: 'expected_doublet_rate (%)',
      description: 'Scrublet 期望双细胞比例',
      default: 5,
      minimum: 0,
      maximum: 100,
      step: 1,
      widget: 'integer-stepper',
      group: '双细胞过滤',
    },
  },
  order: [
    'min_genes',
    'min_cells',
    'pct_counts_mt',
    'pct_counts_ribo',
    'max_genes',
    'expected_doublet_rate',
  ],
};

const clusterSchema: ParamSchema = {
  type: 'object',
  properties: {
    cluster_method: {
      type: 'string',
      title: 'cluster_method',
      description: '图聚类算法',
      enum: ['louvain', 'leiden'],
      default: 'louvain',
      group: '聚类设置',
    },
    n_pcs: {
      type: 'integer',
      title: 'n_pcs',
      description: '用于邻域图构建的主成分数量',
      default: 10,
      minimum: 5,
      maximum: 50,
      step: 1,
      widget: 'integer-stepper',
      group: '降维设置',
    },
    n_neighbors: {
      type: 'integer',
      title: 'n_neighbors',
      description: '邻域图近邻数量',
      default: 20,
      minimum: 10,
      maximum: 50,
      step: 1,
      widget: 'integer-stepper',
      group: '聚类设置',
    },
    resolution: {
      type: 'number',
      title: 'resolution',
      description: '聚类分辨率',
      default: 0.8,
      minimum: 0.1,
      maximum: 1,
      step: 0.1,
      widget: 'number-stepper',
      group: '聚类设置',
    },
    batch_effect: {
      type: 'string',
      title: '批次校正',
      description: '多样本合并分析时选择是否去除批次效应',
      enum: ['none', 'bbknn', 'harmony'],
      default: 'none',
      group: '批次处理',
    },
  },
  order: ['cluster_method', 'n_pcs', 'n_neighbors', 'resolution', 'batch_effect'],
};

const markerGeneSchema: ParamSchema = {
  type: 'object',
  properties: {
    method: {
      type: 'string',
      title: 'rank_genes_groups_method',
      description: 'Marker Gene 计算方法',
      enum: ['wilcoxon', 't-test'],
      default: 'wilcoxon',
      group: '差异分析',
    },
    logfc: {
      type: 'number',
      title: 'log2fc',
      description: '差异基因 log fold change 过滤阈值',
      default: 1,
      minimum: 0,
      maximum: 10,
      step: 0.1,
      widget: 'number-stepper',
      group: '筛选阈值',
    },
    fdr: {
      type: 'number',
      title: 'fdr',
      description: '差异基因 FDR 过滤阈值',
      default: 0.05,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      widget: 'number-stepper',
      group: '筛选阈值',
    },
    pct: {
      type: 'number',
      title: 'pct',
      description: '基因在目标细胞群中的表达占比阈值',
      default: 0.25,
      minimum: 0,
      maximum: 1,
      step: 0.05,
      widget: 'number-stepper',
      group: '筛选阈值',
    },
  },
  order: ['method', 'logfc', 'fdr', 'pct'],
};

const cellAnnotationSchema: ParamSchema = {
  type: 'object',
  properties: {
    organism: {
      type: 'string',
      title: 'Organism',
      description: '样本物种',
      enum: ['human', 'mouse'],
      default: 'human',
      group: '注释设置',
    },
    tissue: {
      type: 'string',
      title: 'Tissue type',
      description: '组织类型，用于后续注释筛选',
      enum: ['All', 'bone', 'breast', 'lung', 'pbmc'],
      default: 'All',
      group: '注释设置',
    },
    database: {
      type: 'string',
      title: 'Database',
      description: '自动细胞注释参考数据库',
      enum: ['PanglaoDB', 'CellTypist'],
      default: 'PanglaoDB',
      group: '注释设置',
    },
  },
  order: ['organism', 'tissue', 'database'],
};

const reportSchema: ParamSchema = {
  type: 'object',
  properties: {
    project_id: {
      type: 'string',
      title: '项目编号',
      description: '报告中展示的项目编号',
      default: '',
      group: '报告信息',
    },
    project_title: {
      type: 'string',
      title: '项目名称',
      description: '报告标题',
      default: '',
      group: '报告信息',
    },
    customer_unit: {
      type: 'string',
      title: '客户单位',
      description: '报告客户单位',
      default: '',
      group: '报告信息',
    },
    customer_name: {
      type: 'string',
      title: '客户姓名',
      description: '报告客户姓名',
      default: '',
      group: '报告信息',
    },
  },
  order: ['project_id', 'project_title', 'customer_unit', 'customer_name'],
};

export const STEP_DEFINITIONS: Record<StepType, StepDefinition> = {
  data_load: {
    stepType: 'data_load',
    displayName: '数据导入',
    description: '选择单细胞CellRanger输出结果，维护样本分组，并同步生成原始 QC 结果',
    icon: 'mdi:database-import',
    paramSchema: dataLoadSchema,
  },
  cell_filter: {
    stepType: 'cell_filter',
    displayName: '细胞过滤',
    description: '按基因数、线粒体比例、核糖体比例和双细胞比例过滤低质量细胞',
    icon: 'mdi:filter-check',
    paramSchema: cellFilterSchema,
  },
  cluster: {
    stepType: 'cluster',
    displayName: '降维聚类',
    description: '标准化、高变基因筛选、PCA、UMAP/tSNE 和图聚类',
    icon: 'mdi:chart-scatter-plot',
    paramSchema: clusterSchema,
  },
  marker_gene: {
    stepType: 'marker_gene',
    displayName: 'Marker Gene',
    description: '识别每个 cluster 的特征差异表达基因',
    icon: 'mdi:dna',
    paramSchema: markerGeneSchema,
  },
  cell_annotation: {
    stepType: 'cell_annotation',
    displayName: '细胞注释',
    description: '基于 PanglaoDB 或 CellTypist 完成自动注释，并支持后续人工修订',
    icon: 'mdi:tag-text-outline',
    paramSchema: cellAnnotationSchema,
  },
  report: {
    stepType: 'report',
    displayName: '报告生成',
    description: '汇总分析结果，生成 HTML 报告和结果压缩包',
    icon: 'mdi:file-document-outline',
    paramSchema: reportSchema,
  },
};

export function getStepSchema(stepType: StepType): ParamSchema {
  return STEP_DEFINITIONS[stepType]?.paramSchema || dataLoadSchema;
}

export function getStepDefinition(stepType: StepType): StepDefinition {
  return STEP_DEFINITIONS[stepType] || STEP_DEFINITIONS.data_load;
}
