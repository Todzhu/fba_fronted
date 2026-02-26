/**
 * 单细胞流程 Mock API
 * 模拟流程增删改查、步骤运行和结果生成
 */
import type { Pipeline, StepResult, StepType } from '../types/pipeline';

import { STEP_ORDER } from '../types/pipeline';
import { getDefaultParams } from '../types/stepParamConfigs';

// ========== Mock 结果生成 ==========

/** 根据步骤类型生成模拟结果 */
function generateMockResult(
  stepType: StepType,
  params: Record<string, unknown>,
): StepResult {
  const now = new Date().toISOString();

  switch (stepType) {
    case 'annotation': {
      const cellTypes = [
        'CD4+ T',
        'CD8+ T',
        'B Cell',
        'NK Cell',
        'Monocyte',
        'DC',
        'Platelet',
        'Unknown',
      ];
      const ctColors = [
        '#3B82F6',
        '#EF4444',
        '#10B981',
        '#F59E0B',
        '#8B5CF6',
        '#EC4899',
        '#06B6D4',
        '#F97316',
      ];

      return {
        stats: {
          n_cell_types: cellTypes.length,
          annotation_method:
            (params.annotation_method as string) || 'marker_genes',
        },
        charts: {
          annotated_umap: {
            title: { text: '细胞类型注释', left: 'center' },
            legend: { bottom: 0, type: 'scroll' },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'value', show: false },
            series: cellTypes.map((ct, i) => ({
              name: ct,
              type: 'scatter',
              data: Array.from(
                { length: 25 + Math.floor(Math.random() * 35) },
                () => [
                  (Math.random() - 0.5) * 20 + (i % 4) * 5 - 7.5,
                  (Math.random() - 0.5) * 20 + Math.floor(i / 4) * 8 - 4,
                ],
              ),
              symbolSize: 4,
              itemStyle: { color: ctColors[i] },
            })),
          },
        },
        completedAt: now,
      };
    }

    case 'clustering': {
      const clusterColors = [
        '#3B82F6',
        '#EF4444',
        '#10B981',
        '#F59E0B',
        '#8B5CF6',
        '#EC4899',
        '#06B6D4',
        '#F97316',
      ];
      const nClusters = 8;
      // 生成带聚类着色的 UMAP
      const clusterSeries = Array.from({ length: nClusters }, (_, i) => ({
        name: `Cluster ${i}`,
        type: 'scatter',
        data: Array.from(
          { length: 30 + Math.floor(Math.random() * 40) },
          () => [
            (Math.random() - 0.5) * 20 + (i % 4) * 5 - 7.5,
            (Math.random() - 0.5) * 20 + Math.floor(i / 4) * 8 - 4,
          ],
        ),
        symbolSize: 4,
        itemStyle: { color: clusterColors[i] },
      }));

      return {
        stats: {
          n_clusters: nClusters,
          algorithm: (params.clustering_method as string) || 'leiden',
          resolution: (params.resolution as number) || 0.5,
        },
        charts: {
          cluster_umap: {
            title: { text: 'UMAP 聚类结果', left: 'center' },
            legend: { bottom: 0, type: 'scroll' },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'value', show: false },
            series: clusterSeries,
          },
          cluster_bar: {
            title: { text: '各聚类细胞数', left: 'center' },
            xAxis: {
              type: 'category',
              data: Array.from({ length: nClusters }, (_, i) => `C${i}`),
            },
            yAxis: { type: 'value', name: '细胞数' },
            series: [
              {
                type: 'bar',
                data: Array.from({ length: nClusters }, () =>
                  Math.floor(200 + Math.random() * 300),
                ),
                itemStyle: {
                  color: (p: { dataIndex: number }) =>
                    clusterColors[p.dataIndex % clusterColors.length],
                },
              },
            ],
          },
        },
        completedAt: now,
      };
    }

    case 'data_load': {
      return {
        stats: {
          n_cells: 2700,
          n_genes: 32_738,
          dataset: (params.example_dataset as string) || 'custom',
          format: 'AnnData (.h5ad)',
        },
        charts: {},
        completedAt: now,
      };
    }

    case 'dim_reduce': {
      // 生成 UMAP 散点图（无聚类着色）
      const umapData = Array.from({ length: 300 }, () => [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      ]);

      return {
        stats: {
          n_pcs: (params.n_pcs as number) || 50,
          method: (params.visualization_method as string) || 'umap',
          variance_explained_top10: '45.3%',
        },
        charts: {
          umap: {
            title: { text: 'UMAP 降维可视化', left: 'center' },
            xAxis: { type: 'value', name: 'UMAP1', show: false },
            yAxis: { type: 'value', name: 'UMAP2', show: false },
            series: [
              {
                type: 'scatter',
                data: umapData,
                symbolSize: 4,
                itemStyle: { color: '#3B82F6', opacity: 0.6 },
              },
            ],
          },
        },
        completedAt: now,
      };
    }

    case 'preprocessing': {
      // 生成高变基因散点图数据
      const hvgData = Array.from({ length: 200 }, () => [
        Math.random() * 5,
        Math.random() * 3,
      ]);
      const hvgHighData = Array.from({ length: 50 }, () => [
        Math.random() * 3 + 2,
        Math.random() * 2 + 1.5,
      ]);

      return {
        stats: {
          normalization:
            (params.normalization_method as string) || 'log_normalize',
          target_sum: (params.target_sum as number) || 10_000,
          n_hvg: (params.n_top_genes as number) || 2000,
          n_genes_total: 32_738,
        },
        charts: {
          hvg_scatter: {
            title: { text: '高变基因筛选', left: 'center' },
            tooltip: { trigger: 'item' },
            xAxis: { type: 'value', name: '平均表达量', scale: true },
            yAxis: { type: 'value', name: '离散度', scale: true },
            series: [
              {
                name: '非高变基因',
                type: 'scatter',
                data: hvgData,
                symbolSize: 4,
                itemStyle: { color: '#CBD5E1' },
              },
              {
                name: '高变基因',
                type: 'scatter',
                data: hvgHighData,
                symbolSize: 6,
                itemStyle: { color: '#EF4444' },
              },
            ],
          },
        },
        completedAt: now,
      };
    }

    case 'qc_filter': {
      return {
        stats: {
          cells_before: 2700,
          cells_after: 2638,
          filtered_cells: 62,
          median_genes: 1200,
          median_counts: 4500,
        },
        charts: {
          violin: {
            title: { text: '质控指标分布', left: 'center' },
            xAxis: {
              type: 'category',
              data: ['n_genes', 'total_counts', 'pct_mito'],
            },
            yAxis: { type: 'value' },
            series: [
              {
                type: 'boxplot',
                data: [
                  [200, 800, 1200, 1800, 5000],
                  [500, 2500, 4500, 7000, 15_000],
                  [0, 1, 3, 5, 20],
                ],
              },
            ],
          },
        },
        completedAt: now,
      };
    }
  }
}

// ========== Mock 存储 ==========
const mockPipelines = new Map<string, Pipeline>();

// 初始化 Demo 数据
function seedMockData() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();

  const demoId = 'demo-pbmc-3k';
  mockPipelines.set(demoId, {
    id: demoId,
    name: 'PBMC 3K 示例分析',
    description: '人外周血单核细胞 3000 细胞单细胞 RNA-seq 分析',
    currentStep: 2,
    steps: [
      {
        stepType: 'data_load',
        status: 'completed',
        params: { file_source: 'example', example_dataset: 'pbmc_3k' },
        result: generateMockResult('data_load', { example_dataset: 'pbmc_3k' }),
        history: [],
      },
      {
        stepType: 'qc_filter',
        status: 'completed',
        params: {
          min_genes: 200,
          max_genes: 5000,
          max_mito_pct: 20,
          min_cells: 3,
        },
        result: generateMockResult('qc_filter', {
          min_genes: 200,
          max_mito_pct: 20,
        }),
        history: [],
      },
      {
        stepType: 'preprocessing',
        status: 'pending',
        params: {
          normalization_method: 'log_normalize',
          target_sum: 10_000,
          n_top_genes: 2000,
          hvg_method: 'seurat',
          regress_out_mito: true,
        },
        history: [],
      },
      {
        stepType: 'dim_reduce',
        status: 'pending',
        params: {
          n_pcs: 50,
          use_highly_variable: true,
          visualization_method: 'umap',
          umap_min_dist: 0.5,
        },
        history: [],
      },
      {
        stepType: 'clustering',
        status: 'pending',
        params: {
          clustering_method: 'leiden',
          resolution: 0.5,
          n_neighbors: 15,
          random_state: 42,
        },
        history: [],
      },
      {
        stepType: 'annotation',
        status: 'pending',
        params: {
          annotation_method: 'marker_genes',
          marker_genes: 'CD3D,CD4,CD8A,MS4A1,CD14,FCGR3A,NKG7,PPBP',
          show_gene_scores: true,
        },
        history: [],
      },
    ],
    createdAt: yesterday,
    updatedAt: now,
  });
}

seedMockData();

// ========== Mock API ==========

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 获取流程列表 */
export async function mockGetPipelines(): Promise<Pipeline[]> {
  await delay();
  return [...mockPipelines.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** 获取单个流程 */
export async function mockGetPipeline(id: string): Promise<null | Pipeline> {
  await delay();
  return mockPipelines.get(id) || null;
}

/** 创建新流程 */
export async function mockCreatePipeline(data: {
  dataPath?: string;
  description?: string;
  name: string;
  species?: string;
}): Promise<Pipeline> {
  await delay(500);
  const id = `pipeline-${Date.now()}`;
  const pipeline: Pipeline = {
    id,
    name: data.name,
    description: data.description,
    dataPath: data.dataPath,
    species: data.species,
    currentStep: 0,
    steps: STEP_ORDER.map((stepType) => ({
      stepType,
      status: 'pending' as const,
      params: getDefaultParams(stepType),
      history: [],
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockPipelines.set(id, pipeline);
  return pipeline;
}

/** 删除流程 */
export async function mockDeletePipeline(id: string): Promise<void> {
  await delay(200);
  mockPipelines.delete(id);
}

/** 运行某一步 */
export async function mockRunStep(
  pipelineId: string,
  stepIndex: number,
  params: Record<string, unknown>,
): Promise<StepResult> {
  await delay(1500); // 模拟运行时间

  const pipeline = mockPipelines.get(pipelineId);
  if (!pipeline) throw new Error('流程不存在');

  const step = pipeline.steps[stepIndex];
  if (!step) throw new Error('步骤不存在');

  // 生成结果
  const result = generateMockResult(step.stepType, params);

  // 更新步骤状态
  step.params = params;
  step.result = result;
  step.status = 'completed';

  // 如果有旧结果，推到历史
  if (step.history.length > 5) {
    step.history.shift();
  }

  // 推进 currentStep
  if (stepIndex >= pipeline.currentStep) {
    pipeline.currentStep = stepIndex + 1;
  }

  pipeline.updatedAt = new Date().toISOString();

  return result;
}
