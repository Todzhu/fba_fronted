import type { StepType } from './pipeline';

export interface HelpSection {
  title: string;
  content: string; // 支持简单 HTML
}

export interface StepHelp {
  summary: string;
  sections: HelpSection[];
}

const inlineCode =
  'rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700';

const noteBox =
  'rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-[13px] leading-relaxed text-blue-800';

export const STEP_HELP_CONTENT: Record<StepType, StepHelp> = {
  data_load: {
    summary:
      '读取用户选择的数据目录，将多个样本合并为原始 AnnData 对象，并计算后续质控会用到的基础指标。',
    sections: [
      {
        title: '这一步做什么',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>系统会按样本表读取原始单细胞数据，并为每个细胞写入 <code class="${inlineCode}">sample</code> 和 <code class="${inlineCode}">group</code> 信息。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">支持格式</b>：10x mtx 目录、CellRanger <code class="${inlineCode}">outs/filtered_feature_bc_matrix</code>、10x <code class="${inlineCode}">.h5</code>、以及 <code class="${inlineCode}">.h5ad</code>。</li>
            <li><b class="text-slate-700">样本合并</b>：多个样本会合并为一个原始 AnnData，用样本名和实验分组保留来源信息。</li>
            <li><b class="text-slate-700">质控指标</b>：计算基因数、UMI 总数、线粒体比例、核糖体比例和 <code class="${inlineCode}">log10GenesPerUMI</code>。</li>
          </ul>
        </div>`,
      },
      {
        title: '表格怎么填',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <div class="${noteBox}">
            数据目录来自创建流程时选择的文件夹。表格中的每一行对应目录下的一个样本子目录或样本文件。
          </div>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">Sample</b>：实际数据目录或文件名，通常不需要改动。</li>
            <li><b class="text-slate-700">Sample Name</b>：显示在图表和结果表中的样本名，建议用短英文、数字或下划线。</li>
            <li><b class="text-slate-700">Group</b>：实验分组，如 <code class="${inlineCode}">Control</code>、<code class="${inlineCode}">Treatment</code>、<code class="${inlineCode}">Tumor</code>、<code class="${inlineCode}">Normal</code>。后续按组拆分 UMAP 和比例图会使用它。</li>
          </ul>
        </div>`,
      },
      {
        title: '结果怎么看',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>完成后会生成原始对象 <code class="${inlineCode}">adata_raw.h5ad</code>、细胞特征表和原始质控图。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
            <li><b class="text-slate-700">orig_violin 图</b>：查看每个样本的基因数、UMI 总数和线粒体比例分布。</li>
            <li><b class="text-slate-700">异常样本</b>：如果某个样本整体基因数过低、线粒体比例明显偏高，建议先检查原始数据质量。</li>
            <li><b class="text-slate-700">all_cell_features_raw.xls</b>：保存每个细胞的原始质控指标，可用于后续阈值判断。</li>
          </ul>
        </div>`,
      },
    ],
  },

  qc_filter: {
    summary:
      '基于原始质控指标过滤低质量细胞、异常 barcode 和预测双细胞，输出用于下游分析的过滤后数据。',
    sections: [
      {
        title: '这一步做什么',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>系统读取上一步的 <code class="${inlineCode}">adata_raw.h5ad</code>，按阈值过滤细胞和基因，并使用 Scrublet 预测双细胞。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li>过滤基因数过低或过高的细胞。</li>
            <li>过滤线粒体比例过高、UMI 总数过高或复杂度过低的细胞。</li>
            <li>基因至少需要在 10 个细胞中表达，该值目前由后端固定。</li>
            <li>Scrublet 会按样本分别评估双细胞，并移除预测为双细胞的细胞。</li>
          </ul>
        </div>`,
      },
      {
        title: '参数怎么设',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">最低基因数</b>：低于该值的细胞会被移除，常用起点为 200。</li>
            <li><b class="text-slate-700">最高基因数</b>：高于该值的细胞会被移除，可帮助排除双细胞或异常高复杂度 barcode。</li>
            <li><b class="text-slate-700">线粒体比例上限</b>：高线粒体比例常见于受损细胞。组织样本可从 10%~20% 起步，PBMC 往往更严格。</li>
            <li><b class="text-slate-700">最小 log10GenesPerUMI</b>：衡量基因复杂度，低于 0.8 往往提示低质量细胞或空液滴。</li>
            <li><b class="text-slate-700">期望双细胞率</b>：按上样细胞数估计，10x 数据常见范围约 0.5%~8%。</li>
            <li><b class="text-slate-700">Scrublet 阈值</b>：高于该分数会标记为双细胞。阈值越低越严格，默认 0.25 可作为起点。</li>
          </ul>
        </div>`,
      },
      {
        title: '结果怎么看',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>完成后会生成 <code class="${inlineCode}">adata_filtered.h5ad</code>，作为降维聚类的输入。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
            <li><b class="text-slate-700">filtered_violin 图</b>：确认极端低基因数、高基因数和高线粒体细胞是否已减少。</li>
            <li><b class="text-slate-700">scrublet_score_distribution</b>：多样本时用于查看双细胞分数分布和阈值切分情况。</li>
            <li><b class="text-slate-700">过滤比例</b>：过滤比例过高时，优先检查阈值是否过严或原始样本是否质量异常。</li>
            <li><b class="text-slate-700">all_cell_features_filtered.xls</b>：保存过滤后的细胞元数据和双细胞预测信息。</li>
          </ul>
        </div>`,
      },
    ],
  },

  dim_cluster: {
    summary:
      '对过滤后的数据进行归一化、高变基因筛选、PCA、批次校正、UMAP 可视化和无监督聚类。',
    sections: [
      {
        title: '这一步做什么',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>系统读取 <code class="${inlineCode}">adata_filtered.h5ad</code>，构建用于观察细胞群结构的降维和聚类结果。</p>
          <ol class="ml-4 list-decimal space-y-1.5 marker:text-blue-500">
            <li>按目标深度归一化并进行 log1p 转换。</li>
            <li>筛选高变基因，保留主要生物学变异信号。</li>
            <li>回归总 UMI 数，按配置选择是否回归线粒体比例。</li>
            <li>进行 PCA，并可选择 Harmony、BBKNN 或不做批次校正。</li>
            <li>构建近邻图、计算 UMAP，并使用 Leiden 或 Louvain 聚类。</li>
          </ol>
        </div>`,
      },
      {
        title: '参数怎么设',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">归一化深度</b>：每个细胞总 UMI 缩放到该值，默认 10000。</li>
            <li><b class="text-slate-700">高变基因数</b>：默认 2000。细胞类型复杂或数据量较大时可适当增加。</li>
            <li><b class="text-slate-700">批次校正</b>：多样本数据默认 Harmony；如果样本差异本身是生物学分组，需结合 UMAP 谨慎判断。</li>
            <li><b class="text-slate-700">主成分数</b>：默认 30，可结合 PCA 方差图调整。</li>
            <li><b class="text-slate-700">近邻数</b>：影响 UMAP 和聚类。数值小更强调局部结构，数值大更平滑。</li>
            <li><b class="text-slate-700">UMAP min_dist</b>：越小簇越紧凑，越大簇间过渡更平缓。</li>
            <li><b class="text-slate-700">分辨率</b>：越大 cluster 越多。默认 0.8，想拆分更细的亚群可提高。</li>
          </ul>
        </div>`,
      },
      {
        title: '结果怎么看',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>完成后会生成 <code class="${inlineCode}">adata_clustered.h5ad</code>，后续特征基因和细胞注释都会使用它。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
            <li><b class="text-slate-700">highly_variable_genes</b>：查看高变基因筛选是否正常。</li>
            <li><b class="text-slate-700">pca_variance_ratio</b>：观察主成分解释度是否快速下降。</li>
            <li><b class="text-slate-700">umap_sample</b>：检查样本之间是否存在明显批次分离。</li>
            <li><b class="text-slate-700">umap_cluster</b>：查看 cluster 是否清晰、是否过分碎裂或过度合并。</li>
            <li><b class="text-slate-700">cluster_proportion_barplot</b>：比较各样本中 cluster 的比例差异。</li>
          </ul>
        </div>`,
      },
    ],
  },

  find_marker: {
    summary:
      '基于聚类结果寻找各 cluster 的特征基因，输出差异基因表、排名图、DotPlot 和 Heatmap。',
    sections: [
      {
        title: '这一步做什么',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>系统读取 <code class="${inlineCode}">adata_clustered.h5ad</code>，以 cluster 为分组做差异表达分析。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li>对每个 cluster 与其它细胞进行比较，计算基因排名和统计显著性。</li>
            <li>按 Log2FC、FDR 和表达比例阈值筛选候选 Marker 基因。</li>
            <li>将每个 cluster 的结果分别保存，并生成全量汇总表。</li>
          </ul>
        </div>`,
      },
      {
        title: '参数怎么设',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">检测方法</b>：Wilcoxon 更稳健，t 检验速度较快。</li>
            <li><b class="text-slate-700">Log2FC 阈值</b>：越大越强调高表达差异，默认 1。</li>
            <li><b class="text-slate-700">FDR 阈值</b>：校正后 P 值阈值，默认 0.05。</li>
            <li><b class="text-slate-700">表达比例阈值</b>：基因需在目标 cluster 中达到指定表达细胞比例，默认 0.25。</li>
          </ul>
        </div>`,
      },
      {
        title: '结果怎么看',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>完成后会生成 <code class="${inlineCode}">adata_marker.h5ad</code> 和 <code class="${inlineCode}">marker_genes</code> 目录。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
            <li><b class="text-slate-700">rank_genes_groups</b>：查看每个 cluster 排名前 25 的候选 Marker。</li>
            <li><b class="text-slate-700">dotplot_top5_marker_gene</b>：同时观察表达强度和表达细胞比例。</li>
            <li><b class="text-slate-700">heatmap_top10_marker_gene</b>：比较不同 cluster 的 Top Marker 表达模式。</li>
            <li><b class="text-slate-700">all_cluster_marker.xls</b>：汇总所有通过阈值过滤的 Marker，可辅助人工注释。</li>
          </ul>
        </div>`,
      },
    ],
  },

  annotation: {
    summary:
      '基于聚类结果和参考数据库或手动映射，为每个 cluster 添加细胞类型标签，并输出注释后的 h5ad。',
    sections: [
      {
        title: '这一步做什么',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>系统读取 <code class="${inlineCode}">adata_clustered.h5ad</code>，为每个 cluster 生成细胞类型标签。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">PanglaoDB</b>：基于已知 marker 做富集评分，并按 cluster 分配细胞类型。</li>
            <li><b class="text-slate-700">CellTypist</b>：使用参考模型预测细胞类型，并按 cluster 汇总。</li>
            <li><b class="text-slate-700">手动注释</b>：如果已人工确认 cluster 类型，可直接提交 cluster 到 cell type 的映射。</li>
          </ul>
        </div>`,
      },
      {
        title: '参数怎么设',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
            <li><b class="text-slate-700">注释方式</b>：自动注释适合作为初稿，最终建议结合 Marker 基因图和文献人工复核。</li>
            <li><b class="text-slate-700">物种</b>：选择 human 或 mouse。mouse 数据会在注释时临时转为大写基因名以匹配数据库。</li>
            <li><b class="text-slate-700">组织背景</b>：CellTypist 模型具有适用范围；如果组织类型不匹配，优先参考 Marker 基因和手动注释。</li>
          </ul>
        </div>`,
      },
      {
        title: '结果怎么看',
        content: `<div class="space-y-3 text-[13px] leading-relaxed text-slate-600">
          <p>完成后会生成 <code class="${inlineCode}">adata_annotated.h5ad</code>，可保存到「我的数据」继续用于其它工具。</p>
          <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
            <li><b class="text-slate-700">umap_dimplot_celltype</b>：按细胞类型着色，查看注释后的空间分布。</li>
            <li><b class="text-slate-700">umap_cluster_celltype</b>：对照原始 cluster，确认一个 cluster 是否被合理标注。</li>
            <li><b class="text-slate-700">celltype_proportion_barplot</b>：比较不同样本中的细胞类型比例。</li>
            <li><b class="text-slate-700">annotation_dict.json</b>：保存 cluster 到 cell type 的对应关系，便于复核和复用。</li>
          </ul>
        </div>`,
      },
    ],
  },
};
