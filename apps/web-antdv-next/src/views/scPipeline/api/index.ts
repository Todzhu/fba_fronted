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
    data_path?: string;
    is_multi_sample?: boolean;
}

export interface UpdatePipelineData {
    name?: string;
    description?: string;
    species?: string;
    data_path?: string;
}

interface ApiResponse<T> {
    code: number;
    msg: string;
    data: T;
}

// ========== Pipeline API ==========

/** 创建分析项目 */
export async function createPipelineApi(data: CreatePipelineData) {
    const res = await requestClient.post<ApiResponse<{ id: number }>>(API_PREFIX, data);
    return res.data;
}

/** 获取项目列表 */
export async function listPipelinesApi() {
    const res = await requestClient.get<ApiResponse<PipelineState[]>>(API_PREFIX);
    return res.data;
}

/** 获取项目详情 */
export async function getPipelineApi(id: number | string) {
    const res = await requestClient.get<ApiResponse<PipelineState>>(`${API_PREFIX}/${id}`);
    return res.data;
}

/** 更新项目信息 */
export async function updatePipelineApi(id: number | string, data: UpdatePipelineData) {
    const res = await requestClient.put<ApiResponse<null>>(`${API_PREFIX}/${id}`, data);
    return res.data;
}

/** 删除项目 */
export async function deletePipelineApi(id: number | string) {
    const res = await requestClient.delete<ApiResponse<null>>(`${API_PREFIX}/${id}`);
    return res.data;
}

// ========== Step API ==========

/** 获取步骤详情 */
export async function getStepApi(pipelineId: number | string, stepIndex: number) {
    const res = await requestClient.get<ApiResponse<StepState>>(
        `${API_PREFIX}/${pipelineId}/step/${stepIndex}`
    );
    return res.data;
}

/** 执行分析步骤 */
export async function runStepApi(
    pipelineId: number | string,
    stepIndex: number,
    params: Record<string, unknown> = {}
) {
    const res = await requestClient.post<ApiResponse<{ message: string; step_id: number }>>(
        `${API_PREFIX}/${pipelineId}/step/${stepIndex}/run`,
        { params }
    );
    return res.data;
}
