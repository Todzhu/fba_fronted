/**
 * 单细胞分析流程类型定义
 * 6 步分析流程：数据读取 → 质控过滤 → 降维聚类 → 特征基因 → 细胞注释 → 亚群分析
 */

// 步骤类型
export type StepType =
  | 'annotation' // 细胞注释
  | 'data_load' // 数据读取
  | 'dim_cluster' // 降维聚类（含预处理）
  | 'find_marker' // 特征基因
  | 'qc_filter' // 质控过滤
  | 'sub_annotation'; // 亚群分析

// 步骤状态
export type StepStatus = 'completed' | 'error' | 'pending' | 'running';

// 步骤配置
export interface StepConfig {
  stepType: StepType;
  status: StepStatus;
  params: Record<string, unknown>;
  result?: StepResult;
  history: StepResult[];
}

// 步骤结果
export interface StepResult {
  stats: Record<string, unknown>;
  charts: string[]; // 图表文件相对路径列表
  tables: string[]; // 表格文件相对路径列表
  completedAt: string;
}

// 流程定义
export interface Pipeline {
  id: string;
  userId: string; // 用户 ID（用于构建静态资源 URL）
  name: string;
  description?: string;
  dataPath?: string; // 创建时选择的数据文件夹路径
  species?: string; // 样本物种
  sampleDict?: Record<string, { folder: string; name: string }[]>; // 样本分组映射
  currentStep: number;
  steps: StepConfig[];
  createdAt: string;
  updatedAt: string;
}

// 步骤顺序
export const STEP_ORDER: StepType[] = [
  'data_load',
  'qc_filter',
  'dim_cluster',
  'find_marker',
  'annotation',
  'sub_annotation',
];

// 步骤标签
export const STEP_LABELS: Record<string, string> = {
  data_load: '数据读取',
  qc_filter: '质控过滤',
  dim_cluster: '降维聚类',
  find_marker: '特征基因',
  annotation: '细胞注释',
  sub_annotation: '亚群分析',
};

// 步骤描述
export const STEP_DESCRIPTIONS: Record<string, string> = {
  data_load: '导入原始数据文件或选择示例数据集',
  qc_filter: '过滤低质量细胞和基因',
  dim_cluster: '归一化、降维可视化与无监督聚类',
  find_marker: '差异基因分析，找到各 Cluster 特征基因',
  annotation: '根据 Marker 基因进行细胞类型注释',
  sub_annotation: '选定亚群重新降维聚类与亚型注释',
};

// 步骤图标（使用 lucide 图标名称）
export const STEP_ICONS: Record<string, string> = {
  data_load: 'database',
  qc_filter: 'filter',
  dim_cluster: 'scatter-chart',
  find_marker: 'dna',
  annotation: 'tag',
  sub_annotation: 'zoom-in',
};
