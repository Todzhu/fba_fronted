/**
 * 单细胞分析流程类型定义
 * 6 步分析流程：数据读取 → 质控过滤 → 预处理 → 降维 → 聚类 → 注释
 */

// 步骤类型
export type StepType =
  | 'annotation' // 细胞注释
  | 'clustering' // 细胞聚类
  | 'data_load' // 数据读取
  | 'dim_reduce' // 降维可视化
  | 'preprocessing' // 数据预处理
  | 'qc_filter'; // 质控过滤

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
  sampleDict?: Record<string, string[]>; // 样本分组映射
  currentStep: number;
  steps: StepConfig[];
  createdAt: string;
  updatedAt: string;
}

// 步骤顺序
export const STEP_ORDER: StepType[] = [
  'data_load',
  'qc_filter',
  'preprocessing',
  'dim_reduce',
  'clustering',
  'annotation',
];

// 步骤标签
export const STEP_LABELS: Record<StepType, string> = {
  data_load: '数据读取',
  qc_filter: '质控过滤',
  preprocessing: '数据预处理',
  dim_reduce: '降维可视化',
  clustering: '细胞聚类',
  annotation: '细胞注释',
};

// 步骤描述
export const STEP_DESCRIPTIONS: Record<StepType, string> = {
  data_load: '导入原始数据文件或选择示例数据集',
  qc_filter: '过滤低质量细胞和基因',
  preprocessing: '归一化、高变基因筛选和数据缩放',
  dim_reduce: 'PCA 降维与 UMAP/t-SNE 可视化',
  clustering: '基于图的无监督细胞聚类',
  annotation: '根据 Marker 基因进行细胞类型注释',
};

// 步骤图标（使用 lucide 图标名称）
export const STEP_ICONS: Record<StepType, string> = {
  data_load: 'database',
  qc_filter: 'filter',
  preprocessing: 'settings',
  dim_reduce: 'scatter-chart',
  clustering: 'group',
  annotation: 'tag',
};
