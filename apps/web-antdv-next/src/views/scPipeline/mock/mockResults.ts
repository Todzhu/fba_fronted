/**
 * 单细胞分析模拟结果数据
 */
import type { StepResult, StepType } from '../types/pipeline';

/**
 * 生成数据读取步骤的模拟结果
 */
export function generateDataLoadResult(
    _params: Record<string, unknown>,
): StepResult {
    return {
        stats: {
            n_cells: 2700,
            n_genes: 32738,
            dataset: 'PBMC 3K (10x Genomics)',
            format: 'h5ad',
        },
        message: '数据加载成功！检测到 2,700 个细胞和 32,738 个基因。',
    };
}

/**
 * 生成质控过滤步骤的模拟结果
 */
export function generateQcFilterResult(
    params: Record<string, unknown>,
): StepResult {
    const minGenes = (params.min_genes as number) || 200;
    const maxMitoPct = (params.max_mito_pct as number) || 20;
    const filteredCells = Math.floor(2700 * (0.85 + Math.random() * 0.1));
    const filteredGenes = Math.floor(32738 * (0.6 + Math.random() * 0.1));

    return {
        stats: {
            n_cells_before: 2700,
            n_cells_after: filteredCells,
            n_genes_before: 32738,
            n_genes_after: filteredGenes,
            cells_removed: 2700 - filteredCells,
            genes_removed: 32738 - filteredGenes,
        },
        charts: {
            qc_violin: {
                title: { text: '质控指标分布', left: 'center' },
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                xAxis: {
                    type: 'category',
                    data: ['n_genes', 'n_counts', 'pct_mito'],
                },
                yAxis: { type: 'value' },
                series: [
                    {
                        name: '过滤前',
                        type: 'boxplot',
                        data: [
                            [100, 200, 500, 2000, 5000],
                            [500, 2000, 5000, 15000, 40000],
                            [0, 2, 5, 15, 40],
                        ],
                    },
                    {
                        name: '过滤后',
                        type: 'boxplot',
                        data: [
                            [minGenes, 400, 800, 1800, 4500],
                            [1000, 3000, 6000, 12000, 35000],
                            [0, 1, 3, 10, maxMitoPct],
                        ],
                    },
                ],
            },
        },
        message: `过滤完成！保留 ${filteredCells} 个细胞和 ${filteredGenes} 个基因。`,
    };
}

/**
 * 生成降维聚类步骤的模拟结果
 */
export function generateDimReduceResult(
    params: Record<string, unknown>,
): StepResult {
    const nPcs = (params.n_pcs as number) || 50;
    const resolution = (params.resolution as number) || 0.5;
    const nClusters = Math.min(Math.max(3, Math.round(resolution * 10)), 15);

    // 生成 UMAP 散点图数据
    const umapData: number[][] = [];
    const clusterColors = [
        '#1f77b4',
        '#ff7f0e',
        '#2ca02c',
        '#d62728',
        '#9467bd',
        '#8c564b',
        '#e377c2',
        '#7f7f7f',
        '#bcbd22',
        '#17becf',
        '#aec7e8',
        '#ffbb78',
        '#98df8a',
        '#ff9896',
        '#c5b0d5',
    ];

    for (let cluster = 0; cluster < nClusters; cluster++) {
        const centerX = (Math.random() - 0.5) * 20;
        const centerY = (Math.random() - 0.5) * 20;
        const nPoints = Math.floor(100 + Math.random() * 200);

        for (let i = 0; i < nPoints; i++) {
            umapData.push([
                centerX + (Math.random() - 0.5) * 5,
                centerY + (Math.random() - 0.5) * 5,
                cluster,
            ]);
        }
    }

    return {
        stats: {
            n_pcs_used: nPcs,
            n_clusters: nClusters,
            resolution_used: resolution,
        },
        charts: {
            umap: {
                title: { text: 'UMAP 聚类结果', left: 'center' },
                tooltip: {
                    trigger: 'item',
                    formatter: (p: { data: number[] }) => `Cluster ${p.data[2]}`,
                },
                xAxis: { type: 'value', name: 'UMAP1', scale: true },
                yAxis: { type: 'value', name: 'UMAP2', scale: true },
                series: Array.from({ length: nClusters }, (_, i) => ({
                    name: `Cluster ${i}`,
                    type: 'scatter',
                    symbolSize: 4,
                    data: umapData.filter((d) => d[2] === i),
                    itemStyle: { color: clusterColors[i % clusterColors.length] },
                })),
                legend: {
                    type: 'scroll',
                    bottom: 0,
                    data: Array.from({ length: nClusters }, (_, i) => `Cluster ${i}`),
                },
            },
        },
        tables: {
            cluster_stats: {
                columns: ['Cluster', '细胞数', '占比 (%)'],
                data: Array.from({ length: nClusters }, (_, i) => {
                    const count = umapData.filter((d) => d[2] === i).length;
                    return {
                        Cluster: `Cluster ${i}`,
                        细胞数: count,
                        '占比 (%)': ((count / umapData.length) * 100).toFixed(1),
                    };
                }),
            },
        },
        message: `聚类完成！使用 ${nPcs} 个主成分，识别出 ${nClusters} 个细胞群。`,
    };
}

/**
 * 生成细胞注释步骤的模拟结果
 */
export function generateAnnotationResult(
    params: Record<string, unknown>,
): StepResult {
    const markerGenesStr = (params.marker_genes as string) || '';
    const markerGenes = markerGenesStr.split(',').map((g) => g.trim());

    const cellTypes = [
        { name: 'CD4+ T cells', markers: ['CD3D', 'CD4'], count: 450, color: '#1f77b4' },
        { name: 'CD8+ T cells', markers: ['CD3D', 'CD8A'], count: 320, color: '#ff7f0e' },
        { name: 'B cells', markers: ['MS4A1'], count: 280, color: '#2ca02c' },
        { name: 'CD14+ Monocytes', markers: ['CD14'], count: 380, color: '#d62728' },
        { name: 'CD16+ Monocytes', markers: ['FCGR3A'], count: 150, color: '#9467bd' },
        { name: 'NK cells', markers: ['NKG7'], count: 210, color: '#8c564b' },
        { name: 'Megakaryocytes', markers: ['PPBP'], count: 50, color: '#e377c2' },
        { name: 'Other', markers: [], count: 160, color: '#7f7f7f' },
    ];

    // UMAP with annotation
    const umapData: { x: number; y: number; type: string; color: string }[] = [];
    cellTypes.forEach((ct, idx) => {
        const centerX = (idx % 4) * 8 - 12;
        const centerY = Math.floor(idx / 4) * 8 - 4;
        for (let i = 0; i < ct.count; i++) {
            umapData.push({
                x: centerX + (Math.random() - 0.5) * 6,
                y: centerY + (Math.random() - 0.5) * 6,
                type: ct.name,
                color: ct.color,
            });
        }
    });

    return {
        stats: {
            n_cell_types: cellTypes.length,
            marker_genes_used: markerGenes.length,
            annotation_method: params.annotation_method || 'marker_genes',
        },
        charts: {
            annotated_umap: {
                title: { text: '细胞类型注释结果', left: 'center' },
                tooltip: { trigger: 'item', formatter: (p: { data: { type: string } }) => p.data.type },
                xAxis: { type: 'value', name: 'UMAP1', scale: true },
                yAxis: { type: 'value', name: 'UMAP2', scale: true },
                series: cellTypes.map((ct) => ({
                    name: ct.name,
                    type: 'scatter',
                    symbolSize: 4,
                    data: umapData
                        .filter((d) => d.type === ct.name)
                        .map((d) => ({ value: [d.x, d.y], type: d.type })),
                    itemStyle: { color: ct.color },
                })),
                legend: { type: 'scroll', bottom: 0 },
            },
        },
        tables: {
            cell_types: {
                columns: ['细胞类型', '标记基因', '细胞数', '占比 (%)'],
                data: cellTypes.map((ct) => ({
                    细胞类型: ct.name,
                    标记基因: ct.markers.join(', ') || '-',
                    细胞数: ct.count,
                    '占比 (%)': ((ct.count / 2000) * 100).toFixed(1),
                })),
            },
        },
        message: `注释完成！识别出 ${cellTypes.length} 种细胞类型。`,
    };
}

/**
 * 根据步骤类型生成模拟结果
 */
export function generateMockResult(
    stepType: StepType,
    params: Record<string, unknown>,
): StepResult {
    switch (stepType) {
        case 'data_load':
            return generateDataLoadResult(params);
        case 'qc_filter':
            return generateQcFilterResult(params);
        case 'dim_reduce':
            return generateDimReduceResult(params);
        case 'annotation':
            return generateAnnotationResult(params);
        default:
            return { message: '未知步骤类型' };
    }
}
