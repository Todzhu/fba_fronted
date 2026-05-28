/**
 * scPipeline API 模块
 */
import { requestClient } from '#/api/request';
import type { PipelineState, StepState } from '../types/pipeline';

const API_PREFIX = '/api/v1/sc-pipeline';

// ========== 类型定义 ==========

export interface CreatePipelineData {
    name: string;
    description?: string;
    species?: string;
    tissue?: string;
    project_id?: string;
    data_path?: string;
    is_multi_sample?: boolean;
}

export interface UpdatePipelineData {
    name?: string;
    description?: string;
    species?: string;
    data_path?: string;
}

export interface SourceProjectSample {
    sample: string;
    path: string;
    matrix_path: string;
    valid: boolean;
    missing_files: string[];
    has_metrics_summary: boolean;
    has_web_summary: boolean;
}

export interface SourceProject {
    project_id: string;
    path: string;
    sample_count: number;
    valid_sample_count: number;
    valid: boolean;
    samples: SourceProjectSample[];
}

export interface MarkerDictItem {
    cell_type: string;
    organism: string;
    markers: string[];
}

// ========== Pipeline API ==========

/** 创建分析项目 */
export async function createPipelineApi(data: CreatePipelineData) {
    return requestClient.post<{ id: number }>(API_PREFIX, data);
}

/** 获取项目列表 */
export async function listPipelinesApi() {
    return requestClient.get<PipelineState[]>(API_PREFIX);
}

/** 获取项目详情 */
export async function getPipelineApi(id: number | string) {
    return requestClient.get<PipelineState>(`${API_PREFIX}/${id}`);
}

/** 更新项目信息 */
export async function updatePipelineApi(id: number | string, data: UpdatePipelineData) {
    return requestClient.put<null>(`${API_PREFIX}/${id}`, data);
}

/** 删除项目 */
export async function deletePipelineApi(id: number | string) {
    return requestClient.delete<null>(`${API_PREFIX}/${id}`);
}

/** 获取服务器上的可用 CellRanger 项目 */
export async function listSourceProjectsApi() {
    return requestClient.get<SourceProject[]>(`${API_PREFIX}/source-projects`);
}

/** 获取常见细胞类型 Marker */
export async function getMarkerDictApi(organism?: string) {
    return requestClient.get<MarkerDictItem[]>(`${API_PREFIX}/marker-dict`, {
        params: organism ? { organism } : {},
    });
}

// ========== Step API ==========

/** 获取步骤详情 */
export async function getStepApi(pipelineId: number | string, stepIndex: number) {
    return requestClient.get<StepState>(`${API_PREFIX}/${pipelineId}/step/${stepIndex}`);
}

/** 执行分析步骤 */
export async function runStepApi(
    pipelineId: number | string,
    stepIndex: number,
    params: Record<string, unknown> = {}
) {
    return requestClient.post<{ message: string; step_id: number }>(
        `${API_PREFIX}/${pipelineId}/step/${stepIndex}/run`,
        { params }
    );
}
