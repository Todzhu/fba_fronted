/**
 * 分析流程 API
 * 对接后端 /api/v1/pipelines 端点
 */
import type {
  Pipeline,
  StepConfig,
  StepStatus,
} from '../views/biocloud/pipeline/types/pipeline';

import { requestClient } from '#/api/request';

// ========== 后端响应类型（snake_case，与后端 Schema 一致） ==========

/** 步骤响应（后端格式） */
interface ApiPipelineStep {
  id: number;
  pipeline_id: number;
  step_index: number;
  step_type: string;
  status: string;
  params: null | Record<string, unknown>;
  result: null | Record<string, unknown>;
  completed_at: null | string;
  created_time: null | string;
  updated_time: null | string;
}

/** 流程响应（后端格式） */
interface ApiPipeline {
  id: number;
  user_id: number;
  name: string;
  description: null | string;
  data_path: null | string;
  species: null | string;
  pipeline_type: string;
  sample_dict: null | Record<string, string[]>;
  current_step: number;
  status: string;
  steps: ApiPipelineStep[];
  created_time: null | string;
  updated_time: null | string;
}

/** 流程列表响应 */
interface ApiPipelineListResponse {
  items: ApiPipeline[];
  total: number;
}

/** 运行步骤响应 */
interface ApiRunStepResponse {
  task_id: string;
  step_index: number;
  step_type: string;
}

/** 步骤图表响应 */
interface ApiStepChartsResponse {
  charts: string[];
  tables: string[];
  stats: Record<string, unknown>;
}

// ========== 后端 → 前端数据转换 ==========

/** 将后端步骤数据转换为前端 StepConfig */
function toStepConfig(apiStep: ApiPipelineStep): StepConfig {
  return {
    stepType: apiStep.step_type as StepConfig['stepType'],
    status: apiStep.status as StepStatus,
    params: apiStep.params || {},
    result: apiStep.result
      ? {
        stats: (apiStep.result.stats as Record<string, unknown>) || {},
        charts: (apiStep.result.charts as string[]) || [],
        tables: (apiStep.result.tables as string[]) || [],
        completedAt: apiStep.completed_at || '',
      }
      : undefined,
    history: [],
  };
}

/** 将后端流程数据转换为前端 Pipeline */
function toPipeline(api: ApiPipeline): Pipeline {
  return {
    id: String(api.id),
    userId: String(api.user_id),
    name: api.name,
    description: api.description || undefined,
    dataPath: api.data_path || undefined,
    species: api.species || undefined,
    sampleDict: api.sample_dict || undefined,
    currentStep: api.current_step,
    steps: api.steps.map((s) => toStepConfig(s)),
    createdAt: api.created_time || new Date().toISOString(),
    updatedAt: api.updated_time || new Date().toISOString(),
  };
}

// ========== API 调用 ==========

/** 创建流程请求参数 */
export interface CreatePipelineParams {
  name: string;
  description?: string;
  dataPath?: string;
  species?: string;
  pipelineType?: string;
  sampleDict?: Record<string, string[]>;
}

/**
 * 创建分析流程
 */
export async function createPipeline(
  data: CreatePipelineParams,
): Promise<Pipeline> {
  const resp = await requestClient.post<ApiPipeline>('/api/v1/pipelines', {
    name: data.name,
    description: data.description,
    data_path: data.dataPath,
    species: data.species,
    pipeline_type: data.pipelineType || 'scrna',
    sample_dict: data.sampleDict,
  });
  return toPipeline(resp);
}

/**
 * 获取当前用户的流程列表
 */
export async function getPipelines(): Promise<Pipeline[]> {
  const resp =
    await requestClient.get<ApiPipelineListResponse>('/api/v1/pipelines');
  return resp.items.map((item) => toPipeline(item));
}

/**
 * 获取流程详情（含步骤数据）
 */
export async function getPipeline(id: string): Promise<Pipeline> {
  const resp = await requestClient.get<ApiPipeline>(`/api/v1/pipelines/${id}`);
  return toPipeline(resp);
}

/**
 * 删除流程
 */
export async function deletePipeline(id: string): Promise<void> {
  await requestClient.delete(`/api/v1/pipelines/${id}`);
}

// ========== 步骤执行 API ==========

/**
 * 运行分析步骤
 * @param pipelineId 流程 ID
 * @param stepIndex 步骤序号 (0-5)
 * @param params 步骤分析参数
 * @returns Celery 任务 ID 和步骤信息
 */
export async function runStep(
  pipelineId: string,
  stepIndex: number,
  params: Record<string, unknown> = {},
): Promise<{ stepIndex: number; stepType: string; taskId: string }> {
  const resp = await requestClient.post<ApiRunStepResponse>(
    `/api/v1/pipelines/${pipelineId}/steps/${stepIndex}/run`,
    { params },
  );
  return {
    taskId: resp.task_id,
    stepIndex: resp.step_index,
    stepType: resp.step_type,
  };
}

/**
 * 更新流程的样本分组映射
 * @param pipelineId 流程 ID
 * @param sampleDict 样本分组映射 {"组名": ["样本1", ...]}
 */
export async function updateSampleDict(
  pipelineId: string,
  sampleDict: Record<string, string[]>,
): Promise<void> {
  await requestClient.put(`/api/v1/pipelines/${pipelineId}/sample-dict`, {
    sample_dict: sampleDict,
  });
}

/**
 * 获取步骤图表结果
 * @param pipelineId 流程 ID
 * @param stepIndex 步骤序号
 * @returns 图表 URL 列表、表格列表和统计信息
 */
export async function getStepCharts(
  pipelineId: string,
  stepIndex: number,
): Promise<{
  charts: string[];
  stats: Record<string, unknown>;
  tables: string[];
}> {
  const resp = await requestClient.get<ApiStepChartsResponse>(
    `/api/v1/pipelines/${pipelineId}/steps/${stepIndex}/charts`,
  );
  return {
    charts: resp.charts,
    tables: resp.tables,
    stats: resp.stats,
  };
}

/**
 * 获取步骤运行日志
 * @param pipelineId 流程 ID
 * @param stepIndex 步骤序号
 * @returns 日志条目列表 [{time, level, message}, ...]
 */
export async function getStepLogs(
  pipelineId: string,
  stepIndex: number,
): Promise<{ level: string; message: string; time: string }[]> {
  try {
    const resp = await requestClient.get<
      { level: string; message: string; time: string }[]
    >(`/api/v1/pipelines/${pipelineId}/steps/${stepIndex}/logs`);
    return resp ?? [];
  } catch {
    // 日志获取失败时静默返回空数组，不影响主流程
    return [];
  }
}

// ========== 用户数据文件 API ==========

/** 文件节点（树形结构） */
export interface FileNode {
  key: string;
  title: string;
  path: string;
  isLeaf: boolean;
  type?: 'file' | 'folder';
  children?: FileNode[];
}

/** 用户文件记录（扁平） */
interface ApiUserFile {
  id: number;
  user_id: number;
  name: string;
  type: string; // file | folder
  size: number;
  parent_id: null | number;
  storage_path: null | string;
}

/** 样本信息 */
export interface SampleInfo {
  folderName: string;
  sampleName: string;
  group: string;
  enabled: boolean;
}

/**
 * 获取用户文件夹树（仅文件夹）
 * 对接 GET /api/v1/sys/my-data/folder-tree
 */
export async function getMyDataTree(): Promise<FileNode[]> {
  return await requestClient.get<FileNode[]>('/api/v1/sys/my-data/folder-tree');
}

/**
 * 获取指定文件夹下的子文件/夹列表（通过 storage_path）
 * 对接 GET /api/v1/sys/my-data/children-by-path?path=xxx
 */
export async function getFilesInFolder(
  storagePath: string,
): Promise<SampleInfo[]> {
  const items = await requestClient.get<ApiUserFile[]>(
    '/api/v1/sys/my-data/children-by-path',
    { params: { path: storagePath } },
  );
  // 只返回子文件夹作为样本
  return items
    .filter((f) => f.type === 'folder')
    .map((f) => ({
      folderName: f.name,
      sampleName: f.name,
      group: '',
      enabled: true,
    }));
}

/**
 * 获取文件夹的子项作为树节点（含文件，用于树懒加载）
 * 对接 GET /api/v1/sys/my-data/children-by-path?path=xxx
 */
export async function getFolderChildrenAsNodes(
  storagePath: string,
): Promise<FileNode[]> {
  const items = await requestClient.get<ApiUserFile[]>(
    '/api/v1/sys/my-data/children-by-path',
    { params: { path: storagePath } },
  );
  // 文件夹排前面，文件排后面
  const sorted = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  return sorted.map((f) => ({
    key: f.type === 'folder' ? String(f.id) : `file:${f.id}`,
    title: f.name,
    path: f.storage_path || `${storagePath}/${f.name}`,
    isLeaf: f.type === 'file',
    type: f.type as 'file' | 'folder',
  }));
}
