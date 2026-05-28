/**
 * 单细胞主流程模拟结果数据
 */
import type { StepResult, StepType } from '../types/pipeline';

export function generateMockResult(
  stepType: StepType,
  params: Record<string, unknown>,
): StepResult {
  switch (stepType) {
    case 'data_load':
      return {
        stats: {
          total_cells: 2700,
          total_genes: 32738,
          sample_count: 2,
          group_count: 2,
        },
        tables: {
          samples: {
            columns: ['样本名称', '样本分组', '细胞数'],
            data: [
              { 样本名称: 'NC', 样本分组: 'control', 细胞数: 1320 },
              { 样本名称: 'PA', 样本分组: 'case', 细胞数: 1380 },
            ],
          },
        },
        images: {
          'QC violin': '/mock/sc-pipeline/orig_nCount_nFeature_voilon.png',
          'QC scatter': '/mock/sc-pipeline/orig_nCount_nFeature_scatter.png',
        },
        files: [
          { name: 'raw.h5ad', path: '/mock/sc-pipeline/raw.h5ad', type: 'h5ad' },
          { name: 'qc.h5ad', path: '/mock/sc-pipeline/qc.h5ad', type: 'h5ad' },
          { name: 'all_cell_features_raw.xls', path: '/mock/sc-pipeline/all_cell_features_raw.xls' },
        ],
        message: '数据导入和原始数据质控完成，已生成样本分组表、raw.h5ad 和 02-Data_QC 质控结果。',
      };
    case 'cell_filter':
      return {
        stats: {
          cells_before: 2700,
          cells_after: 2385,
          genes_before: 32738,
          genes_after: 18642,
          max_genes: Number(params.max_genes ?? 7000),
          total_counts: Number(params.total_counts ?? 25_000),
          pct_counts_mt: String(params.pct_counts_mt ?? 20),
          pct_counts_ribo: String(params.pct_counts_ribo ?? 30),
          doublet_rate: Number(params.doublet_rate ?? 5),
          doublet_score: Number(params.doublet_score ?? 0.25),
        },
        images: {
          'Filtered violin': '/mock/sc-pipeline/filtered_nCount_nFeature_voilon.png',
          'Filtered scatter': '/mock/sc-pipeline/filtered_nCount_nFeature_scatter.png',
        },
        files: [{ name: 'filtered.h5ad', path: '/mock/sc-pipeline/filtered.h5ad', type: 'h5ad' }],
        message: '细胞过滤完成，低质量细胞和疑似双细胞已剔除。',
      };
    case 'cluster':
      return {
        stats: {
          cluster_method: String(params.cluster_method ?? 'louvain'),
          n_pcs: Number(params.n_pcs ?? 10),
          n_neighbors: Number(params.n_neighbors ?? 20),
          resolution: Number(params.resolution ?? 0.8),
          cluster_count: 8,
        },
        tables: {
          cluster_cells_statistics: {
            columns: ['Cluster', 'NC', 'PA', 'Total'],
            data: [
              { Cluster: '0', NC: 290, PA: 320, Total: 610 },
              { Cluster: '1', NC: 260, PA: 280, Total: 540 },
              { Cluster: '2', NC: 180, PA: 210, Total: 390 },
            ],
          },
        },
        images: {
          UMAP: '/mock/sc-pipeline/umap_dimplot.png',
          TSNE: '/mock/sc-pipeline/tsne_dimplot.png',
          PCA: '/mock/sc-pipeline/pca_sample.png',
        },
        files: [{ name: 'cluster.h5ad', path: '/mock/sc-pipeline/cluster.h5ad', type: 'h5ad' }],
        message: '降维聚类完成，已生成 UMAP、tSNE、PCA 和 cluster 统计结果。',
      };
    case 'marker_gene':
      return {
        stats: {
          method: String(params.method ?? 'wilcoxon'),
          logfc: Number(params.logfc ?? 1),
          fdr: Number(params.fdr ?? 0.05),
          marker_count: 326,
        },
        tables: {
          top_markers: {
            columns: ['cluster', 'Symbol', 'logfoldchanges', 'pvals_adj'],
            data: [
              { cluster: '0', Symbol: 'CD3D', logfoldchanges: 2.31, pvals_adj: 0.0001 },
              { cluster: '1', Symbol: 'MS4A1', logfoldchanges: 2.04, pvals_adj: 0.0003 },
              { cluster: '2', Symbol: 'LYZ', logfoldchanges: 1.86, pvals_adj: 0.0005 },
            ],
          },
        },
        images: {
          Dotplot: '/mock/sc-pipeline/dotplot_top3_marker_gene.png',
          Heatmap: '/mock/sc-pipeline/heatmap_top10_marker_gene.png',
        },
        files: [{ name: 'all_cluster_marker.xls', path: '/mock/sc-pipeline/all_cluster_marker.xls' }],
        message: 'Marker Gene 分析完成，已输出各 cluster 差异基因表。',
      };
    case 'cell_annotation':
      return {
        stats: {
          database: String(params.database ?? 'PanglaoDB'),
          organism: String(params.organism ?? 'human'),
          cell_type_count: 6,
        },
        tables: {
          celltype_statistics: {
            columns: ['cell_type', 'NC', 'PA'],
            data: [
              { cell_type: 'T cells', NC: 450, PA: 520 },
              { cell_type: 'B cells', NC: 210, PA: 240 },
              { cell_type: 'Monocytes', NC: 360, PA: 330 },
            ],
          },
        },
        images: {
          'UMAP CellType': '/mock/sc-pipeline/umap_cluster_celltype.png',
          'Cell proportion': '/mock/sc-pipeline/celltype_proportion_sample.png',
        },
        files: [{ name: 'result.h5ad', path: '/mock/sc-pipeline/result.h5ad', type: 'h5ad' }],
        message: '细胞注释完成，已生成细胞类型结果和最终 h5ad 文件。',
      };
    case 'report':
      return {
        stats: {
          report_pages: 1,
          archive_files: 1,
        },
        files: [
          { name: 'report.html', path: '/mock/sc-pipeline/report.html', type: 'html' },
          { name: 'sc_pipeline_results.zip', path: '/mock/sc-pipeline/sc_pipeline_results.zip', type: 'zip' },
        ],
        message: '报告生成完成，可预览 HTML 报告并下载结果压缩包。',
      };
    default:
      return { message: '未知步骤类型' };
  }
}
