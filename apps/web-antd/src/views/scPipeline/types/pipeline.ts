/**
 * 单细胞分析流程类型定义
 */

// ========== 步骤类型枚举 ==========
export type StepType =
  | 'data_load'      // ① 数据导入
  | 'qc_filter'      // ② 质控过滤
  | 'normalize'      // ③ 标准化
  | 'merge'          // ④ 多样本合并
  | 'batch_correct'  // ⑤ 批次校正
  | 'dim_reduce'     // ⑥ 降维/聚类
  | 'annotation'     // ⑦ 细胞注释
  | 'diff_expr'      // ⑧ 差异分析
  | 'enrichment'     // ⑨ 富集分析
  | 'advanced';      // ⑩ 高级分析

export const STEP_ORDER: StepType[] = [
  'data_load',
  'qc_filter',
  'normalize',
  'merge',
  'batch_correct',
  'dim_reduce',
  'annotation',
  'diff_expr',
  'enrichment',
  'advanced',
];

export const STEP_LABELS: Record<StepType, string> = {
  data_load: '数据导入',
  qc_filter: '质控过滤',
  normalize: '标准化',
  merge: '多样本合并',
  batch_correct: '批次校正',
  dim_reduce: '降维/聚类',
  annotation: '细胞注释',
  diff_expr: '差异分析',
  enrichment: '富集分析',
  advanced: '高级分析',
};

// 可跳过的步骤（单样本分析时跳过）
export const SKIPPABLE_STEPS: StepType[] = ['merge', 'batch_correct', 'advanced'];

// ========== 步骤状态 ==========
export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

// ========== 结果类型 ==========
export interface StepResult {
  /** 统计数据 */
  stats?: Record<string, number | string>;
  /** 图表配置 (ECharts options) */
  charts?: Record<string, object>;
  /** 图片路径 */
  images?: Record<string, string>;
  /** 表格数据 */
  tables?: Record<string, { columns: string[]; data: Record<string, unknown>[] }>;
  /** 消息提示 */
  message?: string;
}

// ========== 步骤执行记录 ==========
export interface StepExecution {
  id: string;
  params: Record<string, unknown>;
  result: StepResult;
  executedAt: Date;
}

// ========== 步骤状态 ==========
export interface StepState {
  stepType: StepType;
  status: StepStatus;
  params: Record<string, unknown>;
  result?: StepResult;
  history: StepExecution[];
}

// ========== 流程状态 ==========
export type PipelineStatus = 'created' | 'running' | 'paused' | 'completed';

export interface PipelineState {
  id: string;
  name: string;
  description?: string;
  dataPath?: string;
  species?: string;
  currentStep: number;
  status?: PipelineStatus;
  isMultiSample?: boolean;
  steps: StepState[];
  createdAt: Date;
  updatedAt: Date;
}

// ========== 参数 Schema ==========
export interface ParamSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  widget?: string;
  group?: string;
}

export interface ParamSchema {
  type: 'object';
  properties: Record<string, ParamSchemaProperty>;
  order?: string[];
}

// ========== 步骤定义 ==========
export interface StepDefinition {
  stepType: StepType;
  displayName: string;
  description: string;
  icon: string;
  paramSchema: ParamSchema;
}

// ========== API 响应类型 ==========
export interface CreatePipelineResponse {
  pipeline: PipelineState;
}

export interface RunStepResponse {
  success: boolean;
  result?: StepResult;
  error?: string;
}
