import type { StepType } from './pipeline';

export interface HelpSection {
    title: string;
    content: string; // 支持简单 HTML
}

export interface StepHelp {
    summary: string;
    sections: HelpSection[];
}

export const STEP_HELP_CONTENT: Record<StepType, StepHelp> = {
    data_load: {
        summary: '将原始单细胞测序数据读入分析系统，执行多样本合并，并智能计算所有的基础质控指标。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: `<div class="space-y-3 text-slate-600 leading-relaxed text-[13px]">
                  <p>本步骤的核心是将分散的原始测序文件整合成统一的单细胞对象 (AnnData)，并描绘细胞的初始质量画像：</p>
                  <ul class="ml-4 list-disc space-y-1.5 marker:text-blue-500">
                    <li><b class="text-slate-700">读取表达矩阵</b>：解析标准 10x Genomics 产物（<code class="px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[11px] text-rose-600 font-mono">matrix.mtx.gz</code> 等格式）。</li>
                    <li><b class="text-slate-700">多样本融合</b>：根据您填写的样本与分组元数据，无缝将多个数据集拼装。</li>
                    <li><b class="text-slate-700">量化质控水位</b>：自动统计 <span class="text-slate-800 font-medium">线粒体比例</span>、<span class="text-slate-800 font-medium">核糖体比例</span> 以及鉴别空液滴的 <span class="text-slate-800 font-medium">基因复杂度</span> (log10GenesPerUMI)。</li>
                  </ul>
                </div>`,
            },
            {
                title: '📊 如何配置表格',
                content: `<div class="space-y-3 text-slate-600 text-[13px]">
                  <div class="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100/60 shadow-sm">
                    <div class="flex items-center gap-1.5 mb-2">
                       <span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600">💡</span>
                       <b class="text-blue-800">填写指南</b>
                    </div>
                    <ul class="ml-5 list-decimal space-y-1.5 text-blue-700/80">
                      <li><b>数据路径</b>：指向包含三个核心文件的直接物理目录。</li>
                      <li><b>样本名称</b>：推荐使用简短的英文与数字组合，作为图表刻度的标签。</li>
                      <li><b>实验分组</b>：用于界定不同的生物学比较状态（如如 <code class="text-blue-600 font-mono text-[11px]">Control</code> / <code class="text-blue-600 font-mono text-[11px]">Treatment</code>），对后续靶向分析至关重要。</li>
                    </ul>
                  </div>
                </div>`,
            },
            {
                title: '📈 结果怎么看',
                content: `<div class="space-y-3 text-slate-600 leading-relaxed text-[13px]">
                  <p>运行完成后，右侧面板将输出直观的多维品控图表：</p>
                  <ul class="ml-4 list-disc space-y-1.5 marker:text-emerald-500">
                    <li><b class="text-slate-700">质控提琴图 (Violin Plot)</b>：对比观察各个样本的基因分布密度与极端离群点。</li>
                    <li><b class="text-slate-700">线粒体识别</b>：辅助您快速锁定由细胞器破裂导致的高线粒体死细胞群。</li>
                    <li><b class="text-slate-700">AI 智能算子推荐</b>：后台算法会基于 MAD 法则生成科学的异常剪裁阈值，并 <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-medium shadow-sm ring-1 ring-inset ring-emerald-200">无缝注入后续「质控过滤」环节</span> 供您参考。</li>
                  </ul>
                </div>`,
            },
        ],
    },

    qc_filter: {
        summary: '根据质量指标过滤低质量细胞和基因，去除双细胞（doublet），保留高质量数据用于下游分析。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: '通过设置基因数、线粒体比例、基因复杂度等阈值，过滤掉空液滴、死细胞、双细胞等低质量数据。这是单细胞分析中最关键的质控步骤。',
            },
            {
                title: '🔧 参数说明',
                content: `<div class="space-y-3">
          <div><b class="text-slate-700">细胞过滤</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>最低基因数</b> — 表达基因数低于此值的 barcode 可能是空液滴，建议 200~500</li>
            <li><b>最高基因数</b> — 表达基因数过高可能是双细胞，建议参考 MAD 推荐值</li>
            <li><b>线粒体比例上限</b> — 线粒体基因占比过高通常表示细胞破损。组织 10%~20%，PBMC 5%~10%</li>
            <li><b>log10GenesPerUMI</b> — 基因复杂度指标，过低可能是低质量细胞。通常 > 0.8</li>
          </ul>
          <div><b class="text-slate-700">基因过滤</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>最少细胞数</b> — 仅保留在至少 N 个细胞中表达的基因，去除噪声基因。通常设 3</li>
          </ul>
          <div><b class="text-slate-700">双细胞去除</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>期望双细胞率</b> — 取决于上样细胞数。10x 推荐：1000 细胞≈0.8%，10000 细胞≈8%</li>
            <li><b>Scrublet 阈值</b> — 双细胞评分阈值，越低越严格。0.25 为常用起点</li>
          </ul>
        </div>`,
            },
            {
                title: '💡 设置建议',
                content: '推荐值区间来自 MAD（中位数绝对偏差）方法：3×MAD（严格）到 5×MAD（宽松）。严格过滤保留更高质量细胞但数量减少，宽松过滤保留更多细胞但可能引入噪声。<br><br>建议首次使用推荐值运行，观察过滤后的 Violin 图和细胞数量，再根据需要微调。',
            },
            {
                title: '📈 结果怎么看',
                content: '过滤后会生成：<br>① 过滤后 Violin 图 — 确认异常值已去除<br>② Scrublet 双细胞评分分布图 — 查看双单细胞分隔是否清晰<br>③ 过滤前后细胞数对比 — 过滤掉的比例通常在 10%~30%',
            },
        ],
    },

    dim_cluster: {
        summary: '对过滤后的数据进行归一化、高变基因选择、PCA 降维、UMAP 可视化和无监督聚类。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: '完整的下游分析流程：<br>① <b>归一化</b>：消除不同细胞间测序深度差异<br>② <b>高变基因选择</b>：筛选信息量最大的基因<br>③ <b>PCA 降维</b>：捕获数据的主要变异方向<br>④ <b>批次校正</b>（Harmony，多样本时）：消除批次效应<br>⑤ <b>UMAP 可视化</b>：将高维数据映射到 2D<br>⑥ <b>聚类</b>：将相似细胞聚为同一群体<br>⑦ <b>Marker 基因分析</b>：找到每个群的特异性基因',
            },
            {
                title: '🔧 参数说明',
                content: `<div class="space-y-3">
          <div><b class="text-slate-700">预处理</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>高变基因数</b> — 通常 2000~3000，细胞数多可适当增加</li>
            <li><b>目标总和</b> — 归一化的缩放因子，标准值 10000</li>
            <li><b>回归线粒体</b> — 建议开启，消除线粒体基因对聚类的干扰</li>
          </ul>
          <div><b class="text-slate-700">降维</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>主成分数</b> — 通常 30~50，可通过肘部图选择拐点</li>
            <li><b>近邻数</b> — 影响 UMAP 和聚类。越大全局结构越好（15~30）</li>
            <li><b>UMAP min_dist</b> — 较小值（0.1~0.3）产生更紧密的簇，较大值（0.5+）更分散</li>
          </ul>
          <div><b class="text-slate-700">聚类</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>分辨率</b> — 核心参数。0.3~0.8 适合大多数场景，稀有细胞类型可提高到 1.0~1.5</li>
            <li><b>聚类方法</b> — Leiden（推荐，更稳定）或 Louvain</li>
          </ul>
        </div>`,
            },
            {
                title: '📈 结果怎么看',
                content: '① 高变基因图 — 确认筛选的基因分布合理<br>② PCA 方差比图 — 肘部拐点指示合适的主成分数<br>③ UMAP 图（按样本/分组着色）— 批次校正效果<br>④ UMAP 图（按聚类着色）— 细胞群分离是否清晰<br>⑤ Cluster 细胞比例柱状图 — 各 cluster 在不同样本中的分布',
            },
        ],
    },

    find_marker: {
        summary: '对聚类后的数据进行差异基因分析，找到各 Cluster 的标记基因（Marker genes）。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: '使用统计检验方法（Wilcoxon 或 t-test）比较每个 cluster 与其他所有 cluster 的基因表达差异，找出各 cluster 特异性高表达的基因（Marker 基因）。',
            },
            {
                title: '🔧 参数说明',
                content: `<div class="space-y-3">
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>检测方法</b> — Wilcoxon 秩和检验（推荐，非参数方法）或 t 检验</li>
            <li><b>Log2FC 阈值</b> — 差异倍数过滤，通常 ≥ 1（即 2 倍差异）</li>
            <li><b>FDR 阈值</b> — 校正后 P 值，通常 < 0.05</li>
            <li><b>表达比例阈值</b> — 基因在目标 cluster 中表达的细胞比例，通常 ≥ 0.25</li>
          </ul>
        </div>`,
            },
            {
                title: '📈 结果怎么看',
                content: '① Marker 基因排名图 — 各 cluster Top25 差异基因<br>② DotPlot — 每个 cluster Top3 基因的表达量和百分比<br>③ Heatmap — 每个 cluster Top10 基因的表达热图<br>④ 差异基因表 — 用于后续细胞注释',
            },
        ],
    },

    annotation: {
        summary: '结合标记基因和数据库，为每个 cluster 分配细胞类型标签。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: '通过差异基因分析（DEG）找到每个 cluster 的标记基因，结合已知的细胞类型 marker 进行注释。',
            },
            {
                title: '📈 结果怎么看',
                content: '① 标记基因气泡图/热图 — 确认每个 cluster 的特异性基因<br>② 注释后的 UMAP 图 — 查看细胞类型空间分布是否合理',
            },
        ],
    },

    sub_annotation: {
        summary: '选定感兴趣的细胞亚群，重新降维聚类并进行亚型注释，揭示更细粒度的细胞异质性。',
        sections: [
            {
                title: '🎯 这一步做什么',
                content: '从大类注释结果中提取指定的细胞亚群（如 T 细胞），对其重新进行：<br>① 高变基因筛选<br>② PCA 降维<br>③ UMAP 可视化<br>④ 重新聚类<br>⑤ Marker 基因分析<br>从而发现亚型（如 CD4+ T / CD8+ T / Treg / Th17 等）。',
            },
            {
                title: '🔧 参数说明',
                content: `<div class="space-y-3">
          <div><b class="text-slate-700">亚群选择</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>目标亚群</b> — 选择上一步注释的细胞类型名称，或用聚类编号指定</li>
          </ul>
          <div><b class="text-slate-700">重聚类</b></div>
          <ul class="ml-4 space-y-1.5 text-slate-600">
            <li><b>高变基因数</b> — 亚群分析通常使用 1500~2000</li>
            <li><b>分辨率</b> — 亚群分辨率通常比全局更高（0.5~2.0），以区分亚型</li>
            <li><b>近邻数</b> — 细胞数较少时可降低到 10~15</li>
          </ul>
        </div>`,
            },
            {
                title: '📈 结果怎么看',
                content: '① 亚群 UMAP 图 — 确认亚型分群是否清晰<br>② Marker 基因气泡图 — 验证各亚型的生物学标志<br>③ 亚型比例统计 — 观察各亚型在不同分组间的差异',
            },
        ],
    },
};
