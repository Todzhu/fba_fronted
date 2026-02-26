/**
 * 单细胞分析步骤参数 Schema 定义
 */
import type { ParamSchema, StepDefinition, StepType } from '../types/pipeline';

// ========== 数据读取 ==========
const dataLoadSchema: ParamSchema = {
  type: 'object',
  properties: {
    file_source: {
      type: 'string',
      title: '数据来源',
      description: '选择数据文件来源',
      enum: ['example', 'upload', 'mydata'],
      default: 'example',
      group: '基本设置',
    },
    example_dataset: {
      type: 'string',
      title: '示例数据集',
      description: '选择预置的示例数据集',
      enum: ['pbmc_3k', 'pbmc_10k', 'brain_1k'],
      default: 'pbmc_3k',
      group: '基本设置',
    },
  },
  order: ['file_source', 'example_dataset'],
};

// ========== 质控过滤 ==========
const qcFilterSchema: ParamSchema = {
  type: 'object',
  properties: {
    min_genes: {
      type: 'integer',
      title: '最少基因数',
      description: '每个细胞至少表达的基因数量',
      default: 200,
      minimum: 50,
      maximum: 1000,
      widget: 'slider',
      group: '细胞过滤',
    },
    max_genes: {
      type: 'integer',
      title: '最多基因数',
      description: '每个细胞最多表达的基因数量（过滤双细胞）',
      default: 5000,
      minimum: 1000,
      maximum: 10_000,
      widget: 'slider',
      group: '细胞过滤',
    },
    max_mito_pct: {
      type: 'number',
      title: '线粒体比例上限 (%)',
      description: '线粒体基因占比上限，用于过滤死亡细胞',
      default: 20,
      minimum: 1,
      maximum: 50,
      widget: 'slider',
      group: '细胞过滤',
    },
    min_cells: {
      type: 'integer',
      title: '最少细胞数',
      description: '每个基因至少在多少细胞中表达',
      default: 3,
      minimum: 1,
      maximum: 50,
      group: '基因过滤',
    },
  },
  order: ['min_genes', 'max_genes', 'max_mito_pct', 'min_cells'],
};

// ========== 降维聚类 ==========
const dimReduceSchema: ParamSchema = {
  type: 'object',
  properties: {
    n_pcs: {
      type: 'integer',
      title: '主成分数',
      description: 'PCA 使用的主成分数量',
      default: 50,
      minimum: 10,
      maximum: 100,
      widget: 'slider',
      group: 'PCA 设置',
    },
    use_highly_variable: {
      type: 'boolean',
      title: '仅使用高变基因',
      description: '是否只使用高变异基因进行降维',
      default: true,
      group: 'PCA 设置',
    },
    n_neighbors: {
      type: 'integer',
      title: '邻居数',
      description: '构建邻域图的邻居数量',
      default: 15,
      minimum: 5,
      maximum: 50,
      widget: 'slider',
      group: '聚类设置',
    },
    resolution: {
      type: 'number',
      title: '聚类分辨率',
      description: 'Leiden 聚类分辨率，值越大 cluster 越多',
      default: 0.5,
      minimum: 0.1,
      maximum: 2,
      widget: 'slider',
      group: '聚类设置',
    },
  },
  order: ['n_pcs', 'use_highly_variable', 'n_neighbors', 'resolution'],
};

// ========== 细胞注释 ==========
const annotationSchema: ParamSchema = {
  type: 'object',
  properties: {
    annotation_method: {
      type: 'string',
      title: '注释方法',
      description: '选择细胞类型注释方法',
      enum: ['marker_genes', 'reference', 'auto'],
      default: 'marker_genes',
      group: '注释设置',
    },
    marker_genes: {
      type: 'string',
      title: 'Marker 基因',
      description: '用于注释的标记基因列表，逗号分隔',
      default: 'CD3D,CD4,CD8A,MS4A1,CD14,FCGR3A,NKG7,PPBP',
      group: '注释设置',
    },
    show_gene_scores: {
      type: 'boolean',
      title: '显示基因评分',
      description: '是否在结果中显示各基因的评分热图',
      default: true,
      group: '输出设置',
    },
  },
  order: ['annotation_method', 'marker_genes', 'show_gene_scores'],
};

// ========== 步骤定义集合 ==========
export const STEP_DEFINITIONS: Record<StepType, StepDefinition> = {
  data_load: {
    stepType: 'data_load',
    displayName: '数据读取',
    description: '加载单细胞 RNA-seq 数据文件',
    icon: 'mdi:database-import',
    paramSchema: dataLoadSchema,
  },
  qc_filter: {
    stepType: 'qc_filter',
    displayName: '质控过滤',
    description: '过滤低质量细胞和基因',
    icon: 'mdi:filter-check',
    paramSchema: qcFilterSchema,
  },
  dim_reduce: {
    stepType: 'dim_reduce',
    displayName: '降维聚类',
    description: 'PCA 降维、UMAP 可视化和 Leiden 聚类',
    icon: 'mdi:chart-scatter-plot',
    paramSchema: dimReduceSchema,
  },
  annotation: {
    stepType: 'annotation',
    displayName: '细胞注释',
    description: '基于标记基因进行细胞类型注释',
    icon: 'mdi:tag-text',
    paramSchema: annotationSchema,
  },
};

export function getStepSchema(stepType: StepType): ParamSchema {
  return STEP_DEFINITIONS[stepType].paramSchema;
}

export function getStepDefinition(stepType: StepType): StepDefinition {
  return STEP_DEFINITIONS[stepType];
}
