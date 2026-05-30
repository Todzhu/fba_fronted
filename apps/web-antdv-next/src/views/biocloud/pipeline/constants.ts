import { MapPin, Microscope } from 'lucide-vue-next';

export const PIPELINE_TYPES = [
  {
    id: 'scrna',
    title: '单细胞转录组分析流程',
    subtitle: 'Single-cell RNA-seq Analysis',
    description:
      '一站式单细胞分析的云端流程。涵盖基础分析、高级分析等多个内容，包括质控过滤、标准化、降维聚类、细胞注释等完整分析步骤。',
    fullDescription:
      '单细胞RNA测序（Single-cell RNA-sequencing, scRNA-seq）是一种在单个细胞水平上进行RNA高通量测序和解析的前沿技术。这项技术使得我们能够探索不同细胞之间的基因表达差异，即使在看起来相同的细胞群中，个体细胞的转录组也存在明显的差异。\n\n与传统的Bulk RNA测序不同，单细胞RNA测序可以避免因细胞混合而导致的平均化，揭示单个细胞的独特基因表达特征。通过单细胞测序，我们不仅可以获得单个细胞的遗传信息，还能够深入了解细胞间的异质性。',
    features: [
      '支持 10x Genomics、DNBelab C4 等主流平台数据',
      '自动化质控过滤，智能阈值推荐',
      '多种标准化和批次校正方法',
      '高效降维 (PCA/UMAP/t-SNE) 与聚类分析',
      '基于参考数据库的自动细胞注释',
      '交互式可视化结果展示',
    ],
    tags: ['scRNA-seq', '10x Genomics', 'DNBelab C4', 'multi samples'],
    category: 'single-cell',
    icon: Microscope,
    previewImage: '/images/pipeline/scRNA_pipeline.png',
    gradientFrom: '#3B82F6',
    gradientTo: '#1D4ED8',
    available: true,
  },
  {
    id: 'scrna_subcluster',
    title: '单细胞亚群细分流程',
    subtitle: 'Single-cell Subcluster Analysis',
    description:
      '从已注释 h5ad 出发，选择一个或多个细胞大类，进行多分辨率亚群聚类、Marker 基因筛选和后续亚群注释。',
    fullDescription:
      '单细胞亚群细分适用于已经完成大类细胞注释的数据。流程读取 h5ad 中的 cell_type 信息，支持合并多个目标细胞大类后重新进行高变基因筛选、PCA、批次校正、UMAP 和 Leiden 聚类，并为多个 resolution 同时输出 marker 结果。',
    features: [
      '读取已注释 h5ad 的 cell_type 信息',
      '支持一个或多个细胞大类合并细分',
      '支持 Harmony、BBKNN 或无批次校正',
      '一次运行多个 Leiden resolution',
      '为每个 resolution 输出 UMAP 和 Marker 基因',
      '支持选择最终 resolution 后进行亚群注释',
    ],
    tags: ['subcluster', 'h5ad', 'multi resolution'],
    category: 'single-cell',
    icon: Microscope,
    previewImage: '/images/pipeline/scRNA_subcluster.png',
    gradientFrom: '#0EA5E9',
    gradientTo: '#0369A1',
    available: true,
  },
  {
    id: 'spatial',
    title: '空间转录组分析流程',
    subtitle: 'Spatial Transcriptomics Analysis',
    description:
      '空间转录组学分析云端流程。支持 Xenium、Visium HD、CosMix 等主流平台，实现空间基因表达可视化、空间聚类与细胞互作分析。',
    fullDescription:
      '空间转录组学（Spatial Transcriptomics）是将基因表达信息与组织空间位置信息结合的革命性技术。该技术能够在保持组织结构完整性的同时，解析每个空间位置的基因表达谱，从而揭示细胞在组织微环境中的功能和相互作用。\n\n本流程支持多种主流空间转录组学平台的数据分析，提供从数据预处理到空间可视化的完整解决方案。',
    features: [
      '支持 Xenium、Visium HD、CosMix 等平台',
      '组织图像与基因表达联合分析',
      '空间自相关分析与热点检测',
      '空间可变基因鉴定',
      '细胞类型反卷积与空间映射',
      '细胞通讯与空间互作网络分析',
    ],
    tags: ['Xenium', 'Visium HD', 'CosMix'],
    category: 'spatial',
    icon: MapPin,
    previewImage: '/images/pipeline/spatial_pipeline.png',
    gradientFrom: '#059669',
    gradientTo: '#047857',
    available: false,
  },
] as const;

export const SPECIES_OPTIONS = [
  { value: 'human', label: '人类 (Homo sapiens)' },
  { value: 'mouse', label: '小鼠 (Mus musculus)' },
  { value: 'rat', label: '大鼠 (Rattus norvegicus)' },
  { value: 'zebrafish', label: '斑马鱼 (Danio rerio)' },
  { value: 'drosophila', label: '果蝇 (Drosophila melanogaster)' },
  { value: 'other', label: '其他' },
] as const;

export const STATUS_STYLES = {
  pending: { label: '待运行', dot: 'bg-slate-300', text: 'text-slate-500' },
  running: { label: '运行中', dot: 'bg-blue-500', text: 'text-blue-600' },
  completed: {
    label: '已完成',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
  error: { label: '失败', dot: 'bg-red-500', text: 'text-red-600' },
} as const;
