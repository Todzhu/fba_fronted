/**
 * 单细胞分析 Mock API
 * 模拟后端状态机，管理流程生命周期
 */
import type {
    CreatePipelineResponse,
    PipelineState,
    RunStepResponse,
    StepExecution,
    StepState,
    StepType,
} from '../types/pipeline';

import { STEP_ORDER } from '../types/pipeline';
import { getStepSchema } from './stepSchemas';
import { generateMockResult } from './mockResults';

// ========== 模拟延迟 ==========
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ========== 本地状态存储 ==========
const mockPipelines: Map<string, PipelineState> = new Map();

// ========== 辅助函数 ==========
function generateId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createInitialSteps(): StepState[] {
    return STEP_ORDER.map((stepType) => {
        const schema = getStepSchema(stepType);
        const defaultParams: Record<string, unknown> = {};

        // 从 schema 中提取默认值
        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                if (prop.default !== undefined) {
                    defaultParams[key] = prop.default;
                }
            }
        }

        return {
            stepType,
            status: 'pending',
            params: defaultParams,
            history: [],
        };
    });
}

// ========== Mock API ==========

/**
 * 创建新流程
 */
export async function createPipeline(
    name?: string,
    metadata?: {
        dataPath?: string;
        species?: string;
        description?: string;
    },
): Promise<CreatePipelineResponse> {
    await delay(300);

    const id = generateId();
    const now = new Date();

    const pipeline: PipelineState = {
        id,
        name: name || `分析任务 ${now.toLocaleString('zh-CN')}`,
        description: metadata?.description,
        dataPath: metadata?.dataPath,
        species: metadata?.species,
        currentStep: 0,
        steps: createInitialSteps(),
        createdAt: now,
        updatedAt: now,
    };

    mockPipelines.set(id, pipeline);

    return { pipeline };
}

/**
 * 获取流程状态
 */
export async function getPipeline(id: string): Promise<PipelineState | null> {
    await delay(100);
    return mockPipelines.get(id) || null;
}

/**
 * 获取所有流程列表
 */
export async function listPipelines(): Promise<PipelineState[]> {
    await delay(200);
    return Array.from(mockPipelines.values()).sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
}

/**
 * 执行流程步骤
 */
export async function runStep(
    pipelineId: string,
    stepType: StepType,
    params: Record<string, unknown>,
): Promise<RunStepResponse> {
    const pipeline = mockPipelines.get(pipelineId);
    if (!pipeline) {
        return { success: false, error: '流程不存在' };
    }

    const stepIndex = STEP_ORDER.indexOf(stepType);
    if (stepIndex === -1) {
        return { success: false, error: '无效的步骤类型' };
    }

    const step = pipeline.steps[stepIndex];
    if (!step) {
        return { success: false, error: '步骤不存在' };
    }

    // 检查前置步骤是否完成
    if (stepIndex > 0) {
        const prevStep = pipeline.steps[stepIndex - 1];
        if (prevStep && prevStep.status !== 'completed') {
            return { success: false, error: '请先完成前置步骤' };
        }
    }

    // 更新步骤状态为运行中
    step.status = 'running';
    step.params = { ...step.params, ...params };
    pipeline.updatedAt = new Date();

    // 模拟执行延迟 (1-3秒)
    const execTime = 1000 + Math.random() * 2000;
    await delay(execTime);

    // 生成模拟结果
    const result = generateMockResult(stepType, step.params);

    // 创建执行记录
    const execution: StepExecution = {
        id: generateExecutionId(),
        params: { ...step.params },
        result,
        executedAt: new Date(),
    };

    // 更新步骤状态
    step.status = 'completed';
    step.result = result;
    step.history.push(execution);

    // 更新流程当前步骤
    if (stepIndex >= pipeline.currentStep) {
        pipeline.currentStep = stepIndex + 1;
    }
    pipeline.updatedAt = new Date();

    return { success: true, result };
}

/**
 * 获取步骤历史记录
 */
export async function getStepHistory(
    pipelineId: string,
    stepType: StepType,
): Promise<StepExecution[]> {
    await delay(100);

    const pipeline = mockPipelines.get(pipelineId);
    if (!pipeline) {
        return [];
    }

    const stepIndex = STEP_ORDER.indexOf(stepType);
    const step = pipeline.steps[stepIndex];

    return step?.history || [];
}

/**
 * 更新步骤参数（不执行）
 */
export async function updateStepParams(
    pipelineId: string,
    stepType: StepType,
    params: Record<string, unknown>,
): Promise<boolean> {
    await delay(50);

    const pipeline = mockPipelines.get(pipelineId);
    if (!pipeline) return false;

    const stepIndex = STEP_ORDER.indexOf(stepType);
    const step = pipeline.steps[stepIndex];
    if (!step) return false;

    step.params = { ...step.params, ...params };
    pipeline.updatedAt = new Date();

    return true;
}

/**
 * 更新流程基本信息
 */
export async function updatePipeline(
    id: string,
    name: string,
    metadata?: {
        dataPath?: string;
        species?: string;
        description?: string;
    },
): Promise<boolean> {
    await delay(100);

    const pipeline = mockPipelines.get(id);
    if (!pipeline) return false;

    pipeline.name = name;
    pipeline.updatedAt = new Date();
    if (metadata) {
        (pipeline as any).metadata = metadata;
    }

    return true;
}

/**
 * 删除流程
 */
export async function deletePipeline(id: string): Promise<boolean> {
    await delay(100);
    return mockPipelines.delete(id);
}

/**
 * 用于开发：预填充一些示例流程
 */
export function seedMockData(): void {
    const demoId = 'demo_pipeline_001';
    if (mockPipelines.has(demoId)) return;

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    mockPipelines.set(demoId, {
        id: demoId,
        name: 'PBMC 3K 示例分析',
        currentStep: 2,
        steps: [
            {
                stepType: 'data_load',
                status: 'completed',
                params: { file_source: 'example', example_dataset: 'pbmc_3k' },
                result: generateMockResult('data_load', {}),
                history: [],
            },
            {
                stepType: 'qc_filter',
                status: 'completed',
                params: { min_genes: 200, max_genes: 5000, max_mito_pct: 20, min_cells: 3 },
                result: generateMockResult('qc_filter', { min_genes: 200, max_mito_pct: 20 }),
                history: [],
            },
            {
                stepType: 'dim_reduce',
                status: 'pending',
                params: { n_pcs: 50, use_highly_variable: true, n_neighbors: 15, resolution: 0.5 },
                history: [],
            },
            {
                stepType: 'annotation',
                status: 'pending',
                params: { annotation_method: 'marker_genes', marker_genes: 'CD3D,CD4,CD8A,MS4A1,CD14,FCGR3A,NKG7,PPBP', show_gene_scores: true },
                history: [],
            },
        ],
        createdAt: yesterday,
        updatedAt: now,
    });
}

// 初始化示例数据
seedMockData();
