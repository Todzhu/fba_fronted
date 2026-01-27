/**
 * 单细胞分析流程类型定义
 */

// ========== 步骤类型枚举 ==========
export type StepType = 'data_load' | 'qc_filter' | 'dim_reduce' | 'annotation';

export const STEP_ORDER: StepType[] = [
  'data_load',
  'qc_filter',
  'dim_reduce',
  'annotation',
];

export const STEP_LABELS: Record<StepType, string> = {
  data_load: '数据读取',
  qc_filter: '质控过滤',
  dim_reduce: '降维聚类',
  annotation: '细胞注释',
};

// ========== 步骤状态 ==========
export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

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
export interface PipelineState {
  id: string;
  name: string;
  description?: string;
  dataPath?: string;
  species?: string;
  currentStep: number;
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
