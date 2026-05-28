/**
 * 单细胞分析流程类型定义
 */

// ========== 步骤类型枚举 ==========
export type StepType =
  | 'data_load'       // ① 数据导入
  | 'cell_filter'     // ② 细胞过滤
  | 'cluster'         // ③ 降维聚类
  | 'marker_gene'     // ④ Marker Gene
  | 'cell_annotation' // ⑤ 细胞注释
  | 'report';         // ⑥ 报告生成

export const STEP_ORDER: StepType[] = [
  'data_load',
  'cell_filter',
  'cluster',
  'marker_gene',
  'cell_annotation',
  'report',
];

export const STEP_LABELS: Record<StepType, string> = {
  data_load: '数据导入',
  cell_filter: '细胞过滤',
  cluster: '降维聚类',
  marker_gene: 'Marker Gene',
  cell_annotation: '细胞注释',
  report: '报告生成',
};

// 主流程步骤默认不跳过；高级工具在主流程完成后单独开放
export const SKIPPABLE_STEPS: StepType[] = [];

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
  /** 输出文件 */
  files?: Array<{ name: string; path: string; type?: string }>;
  /** 运行日志 */
  logs?: string[];
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
  errorMessage?: string;
  history: StepExecution[];
}

// ========== 流程状态 ==========
export type PipelineStatus = 'created' | 'running' | 'in_progress' | 'paused' | 'completed' | 'error';

export interface PipelineState {
  id: string;
  name: string;
  description?: string;
  dataPath?: string;
  species?: string;
  metadata?: Record<string, unknown>;
  samples?: Array<{
    folderName: string;
    sampleName: string;
    group: string;
    enabled: boolean;
  }>;
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
  step?: number;
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
