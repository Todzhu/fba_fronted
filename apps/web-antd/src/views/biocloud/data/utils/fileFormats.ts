/**
 * 生信文件格式识别工具库
 * 支持 30+ 种常见生物信息学文件格式的自动检测与分类
 */

// 文件格式分类
export type FileCategory =
  | 'alignment' // 比对文件
  | 'annotation' // 注释文件
  | 'archive' // 压缩包
  | 'expression' // 表达矩阵
  | 'image' // 图片
  | 'other' // 其他
  | 'quality' // 质控报告
  | 'sequence' // 序列文件
  | 'variant'; // 变异文件

// 文件格式信息
export interface FileFormatInfo {
  /** 分类 */
  category: FileCategory;
  /** 颜色 */
  color: string;
  /** 描述 */
  description: string;
  /** 扩展名标签 */
  label: string;
}

// 分类元数据
const CATEGORY_META: Record<FileCategory, { color: string; label: string }> = {
  sequence: { label: '序列', color: '#3B82F6' }, // 蓝色
  alignment: { label: '比对', color: '#8B5CF6' }, // 紫色
  expression: { label: '表达矩阵', color: '#10B981' }, // 绿色
  annotation: { label: '注释', color: '#F59E0B' }, // 黄色
  variant: { label: '变异', color: '#EF4444' }, // 红色
  quality: { label: '质控', color: '#06B6D4' }, // 青色
  image: { label: '图片', color: '#EC4899' }, // 粉色
  archive: { label: '压缩', color: '#6B7280' }, // 灰色
  other: { label: '其他', color: '#94A3B8' }, // 浅灰
};

/** 复合扩展名映射（优先匹配） */
const COMPOUND_EXTENSIONS: Record<string, FileFormatInfo> = {
  'fastq.gz': {
    label: 'FASTQ.GZ',
    category: 'sequence',
    color: '#3B82F6',
    description: '压缩的 FASTQ 测序读段',
  },
  'fq.gz': {
    label: 'FQ.GZ',
    category: 'sequence',
    color: '#3B82F6',
    description: '压缩的 FASTQ 测序读段',
  },
  'fa.gz': {
    label: 'FA.GZ',
    category: 'sequence',
    color: '#2563EB',
    description: '压缩的 FASTA 序列',
  },
  'fasta.gz': {
    label: 'FASTA.GZ',
    category: 'sequence',
    color: '#2563EB',
    description: '压缩的 FASTA 序列',
  },
  'vcf.gz': {
    label: 'VCF.GZ',
    category: 'variant',
    color: '#EF4444',
    description: '压缩的变异调用文件',
  },
  'tar.gz': {
    label: 'TAR.GZ',
    category: 'archive',
    color: '#6B7280',
    description: '归档压缩包',
  },
  'bed.gz': {
    label: 'BED.GZ',
    category: 'annotation',
    color: '#F59E0B',
    description: '压缩的基因组区间文件',
  },
};

/** 简单扩展名映射 */
const SIMPLE_EXTENSIONS: Record<string, FileFormatInfo> = {
  // 序列文件
  fastq: {
    label: 'FASTQ',
    category: 'sequence',
    color: '#3B82F6',
    description: 'FASTQ 测序读段',
  },
  fq: {
    label: 'FQ',
    category: 'sequence',
    color: '#3B82F6',
    description: 'FASTQ 测序读段',
  },
  fasta: {
    label: 'FASTA',
    category: 'sequence',
    color: '#2563EB',
    description: 'FASTA 序列',
  },
  fa: {
    label: 'FA',
    category: 'sequence',
    color: '#2563EB',
    description: 'FASTA 序列',
  },
  fna: {
    label: 'FNA',
    category: 'sequence',
    color: '#2563EB',
    description: '核酸 FASTA 序列',
  },
  faa: {
    label: 'FAA',
    category: 'sequence',
    color: '#1D4ED8',
    description: '蛋白质 FASTA 序列',
  },

  // 比对文件
  bam: {
    label: 'BAM',
    category: 'alignment',
    color: '#8B5CF6',
    description: '二进制比对文件',
  },
  sam: {
    label: 'SAM',
    category: 'alignment',
    color: '#7C3AED',
    description: '文本比对文件',
  },
  cram: {
    label: 'CRAM',
    category: 'alignment',
    color: '#6D28D9',
    description: '压缩比对文件',
  },
  bai: {
    label: 'BAI',
    category: 'alignment',
    color: '#A78BFA',
    description: 'BAM 索引文件',
  },

  // 表达矩阵
  h5ad: {
    label: 'H5AD',
    category: 'expression',
    color: '#10B981',
    description: 'AnnData 单细胞矩阵',
  },
  h5: {
    label: 'H5',
    category: 'expression',
    color: '#059669',
    description: 'HDF5 数据文件',
  },
  hdf5: {
    label: 'HDF5',
    category: 'expression',
    color: '#059669',
    description: 'HDF5 数据文件',
  },
  loom: {
    label: 'LOOM',
    category: 'expression',
    color: '#047857',
    description: 'Loom 单细胞数据',
  },
  mtx: {
    label: 'MTX',
    category: 'expression',
    color: '#34D399',
    description: '稀疏矩阵 (10x)',
  },
  csv: {
    label: 'CSV',
    category: 'expression',
    color: '#6EE7B7',
    description: '逗号分隔值文件',
  },
  tsv: {
    label: 'TSV',
    category: 'expression',
    color: '#6EE7B7',
    description: '制表符分隔值文件',
  },
  txt: {
    label: 'TXT',
    category: 'expression',
    color: '#A7F3D0',
    description: '文本数据文件',
  },

  // 注释文件
  gtf: {
    label: 'GTF',
    category: 'annotation',
    color: '#F59E0B',
    description: '基因转录注释',
  },
  gff: {
    label: 'GFF',
    category: 'annotation',
    color: '#D97706',
    description: '通用注释格式',
  },
  gff3: {
    label: 'GFF3',
    category: 'annotation',
    color: '#D97706',
    description: '通用注释格式 v3',
  },
  bed: {
    label: 'BED',
    category: 'annotation',
    color: '#B45309',
    description: '基因组区间文件',
  },

  // 变异文件
  vcf: {
    label: 'VCF',
    category: 'variant',
    color: '#EF4444',
    description: '变异调用文件',
  },
  maf: {
    label: 'MAF',
    category: 'variant',
    color: '#DC2626',
    description: '突变注释格式',
  },
  bcf: {
    label: 'BCF',
    category: 'variant',
    color: '#B91C1C',
    description: '二进制变异文件',
  },

  // 质控
  html: {
    label: 'HTML',
    category: 'quality',
    color: '#06B6D4',
    description: '质控报告',
  },
  json: {
    label: 'JSON',
    category: 'quality',
    color: '#0891B2',
    description: 'JSON 数据文件',
  },

  // 图片
  png: {
    label: 'PNG',
    category: 'image',
    color: '#EC4899',
    description: 'PNG 图片',
  },
  jpg: {
    label: 'JPG',
    category: 'image',
    color: '#EC4899',
    description: 'JPEG 图片',
  },
  jpeg: {
    label: 'JPEG',
    category: 'image',
    color: '#EC4899',
    description: 'JPEG 图片',
  },
  svg: {
    label: 'SVG',
    category: 'image',
    color: '#DB2777',
    description: 'SVG 矢量图',
  },
  pdf: {
    label: 'PDF',
    category: 'image',
    color: '#BE185D',
    description: 'PDF 文档',
  },
  tiff: {
    label: 'TIFF',
    category: 'image',
    color: '#D946EF',
    description: 'TIFF 图片',
  },

  // 压缩包
  gz: {
    label: 'GZ',
    category: 'archive',
    color: '#6B7280',
    description: 'Gzip 压缩文件',
  },
  zip: {
    label: 'ZIP',
    category: 'archive',
    color: '#6B7280',
    description: 'ZIP 压缩包',
  },
  tar: {
    label: 'TAR',
    category: 'archive',
    color: '#6B7280',
    description: 'TAR 归档',
  },
  rar: {
    label: 'RAR',
    category: 'archive',
    color: '#6B7280',
    description: 'RAR 压缩包',
  },
  '7z': {
    label: '7Z',
    category: 'archive',
    color: '#6B7280',
    description: '7-Zip 压缩包',
  },

  // 代码/脚本
  py: {
    label: 'PY',
    category: 'other',
    color: '#94A3B8',
    description: 'Python 脚本',
  },
  r: { label: 'R', category: 'other', color: '#94A3B8', description: 'R 脚本' },
  rmd: {
    label: 'RMD',
    category: 'other',
    color: '#94A3B8',
    description: 'R Markdown',
  },
  sh: {
    label: 'SH',
    category: 'other',
    color: '#94A3B8',
    description: 'Shell 脚本',
  },
  ipynb: {
    label: 'IPYNB',
    category: 'other',
    color: '#94A3B8',
    description: 'Jupyter Notebook',
  },
};

/**
 * 检测文件格式
 * 优先匹配复合扩展名（如 .fastq.gz），再匹配简单扩展名
 */
export function detectFileFormat(filename: string): FileFormatInfo {
  const lower = filename.toLowerCase();

  // 先尝试复合扩展名
  for (const [ext, info] of Object.entries(COMPOUND_EXTENSIONS)) {
    if (lower.endsWith(`.${ext}`)) {
      return info;
    }
  }

  // 再尝试简单扩展名
  const parts = lower.split('.');
  const ext = parts.pop() || '';
  if (ext && ext in SIMPLE_EXTENSIONS) {
    return SIMPLE_EXTENSIONS[ext] as FileFormatInfo;
  }

  // 默认
  return {
    label: ext ? ext.toUpperCase() : 'FILE',
    category: 'other',
    color: '#94A3B8',
    description: '未知文件类型',
  };
}

/**
 * 获取分类的显示标签
 */
export function getCategoryLabel(category: FileCategory): string {
  return CATEGORY_META[category]?.label || '其他';
}

/**
 * 获取分类的颜色
 */
export function getCategoryColor(category: FileCategory): string {
  return CATEGORY_META[category]?.color || '#94A3B8';
}

/**
 * 统计文件列表的分类分布
 */
export function getCategoryStats(
  filenames: string[],
): { category: FileCategory; color: string; count: number; label: string }[] {
  const counts = new Map<FileCategory, number>();
  for (const name of filenames) {
    const info = detectFileFormat(name);
    counts.set(info.category, (counts.get(info.category) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([cat, count]) => ({
      category: cat,
      label: getCategoryLabel(cat),
      color: getCategoryColor(cat),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 生信格式的扩展名列表（用于上传验证） */
export const BIOINFORMATICS_EXTENSIONS = [
  ...Object.keys(SIMPLE_EXTENSIONS),
  ...Object.keys(COMPOUND_EXTENSIONS),
];
