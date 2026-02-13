/**
 * 数据管理 Mock API
 * 在后端 API 就绪前，提供前端独立可用的模拟数据层
 */

// ========== 类型定义 ==========
export interface MockFileItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  size: number;
  parent_id: null | number;
  mime_type: null | string;
  created_time: string;
  updated_time: string;
}

export interface MockFileListResponse {
  items: MockFileItem[];
  total: number;
}

export interface StorageStatsData {
  fileCount: number;
  folderCount: number;
  totalSize: number;
  filenames: string[];
}

// ========== 模拟数据存储 ==========
let nextId = 100;
const _now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86_400_000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172_800_000).toISOString();
const weekAgo = new Date(Date.now() - 604_800_000).toISOString();

// 预填充的生信文件数据
const mockFiles: MockFileItem[] = [
  // 根目录文件夹
  {
    id: 1,
    name: 'scRNA-seq_PBMC',
    type: 'folder',
    size: 0,
    parent_id: null,
    mime_type: null,
    created_time: weekAgo,
    updated_time: yesterday,
  },
  {
    id: 2,
    name: 'Bulk_RNA_analysis',
    type: 'folder',
    size: 0,
    parent_id: null,
    mime_type: null,
    created_time: weekAgo,
    updated_time: twoDaysAgo,
  },
  {
    id: 3,
    name: 'reference_genomes',
    type: 'folder',
    size: 0,
    parent_id: null,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 4,
    name: 'results',
    type: 'folder',
    size: 0,
    parent_id: null,
    mime_type: null,
    created_time: twoDaysAgo,
    updated_time: yesterday,
  },

  // 根目录文件
  {
    id: 10,
    name: 'sample_metadata.csv',
    type: 'file',
    size: 45_200,
    parent_id: null,
    mime_type: 'text/csv',
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 11,
    name: 'analysis_pipeline.py',
    type: 'file',
    size: 12_800,
    parent_id: null,
    mime_type: 'text/x-python',
    created_time: twoDaysAgo,
    updated_time: yesterday,
  },
  {
    id: 12,
    name: 'README.md',
    type: 'file',
    size: 3400,
    parent_id: null,
    mime_type: 'text/markdown',
    created_time: weekAgo,
    updated_time: twoDaysAgo,
  },

  // scRNA-seq_PBMC 文件夹下
  {
    id: 20,
    name: 'pbmc_3k_raw.h5ad',
    type: 'file',
    size: 156_000_000,
    parent_id: 1,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 21,
    name: 'pbmc_3k_filtered.h5ad',
    type: 'file',
    size: 89_000_000,
    parent_id: 1,
    mime_type: null,
    created_time: twoDaysAgo,
    updated_time: twoDaysAgo,
  },
  {
    id: 22,
    name: 'barcodes.tsv.gz',
    type: 'file',
    size: 28_000,
    parent_id: 1,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 23,
    name: 'features.tsv.gz',
    type: 'file',
    size: 256_000,
    parent_id: 1,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 24,
    name: 'matrix.mtx.gz',
    type: 'file',
    size: 12_500_000,
    parent_id: 1,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 25,
    name: 'cellranger_report.html',
    type: 'file',
    size: 1_200_000,
    parent_id: 1,
    mime_type: 'text/html',
    created_time: twoDaysAgo,
    updated_time: twoDaysAgo,
  },

  // Bulk_RNA_analysis 文件夹下
  {
    id: 30,
    name: 'sample1_R1.fastq.gz',
    type: 'file',
    size: 2_400_000_000,
    parent_id: 2,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 31,
    name: 'sample1_R2.fastq.gz',
    type: 'file',
    size: 2_350_000_000,
    parent_id: 2,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 32,
    name: 'sample2_R1.fastq.gz',
    type: 'file',
    size: 2_100_000_000,
    parent_id: 2,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 33,
    name: 'counts_matrix.csv',
    type: 'file',
    size: 8_500_000,
    parent_id: 2,
    mime_type: 'text/csv',
    created_time: twoDaysAgo,
    updated_time: twoDaysAgo,
  },
  {
    id: 34,
    name: 'deseq2_results.tsv',
    type: 'file',
    size: 1_200_000,
    parent_id: 2,
    mime_type: null,
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 35,
    name: 'aligned_sample1.bam',
    type: 'file',
    size: 3_800_000_000,
    parent_id: 2,
    mime_type: null,
    created_time: twoDaysAgo,
    updated_time: twoDaysAgo,
  },
  {
    id: 36,
    name: 'aligned_sample1.bam.bai',
    type: 'file',
    size: 2_800_000,
    parent_id: 2,
    mime_type: null,
    created_time: twoDaysAgo,
    updated_time: twoDaysAgo,
  },

  // reference_genomes 文件夹下
  {
    id: 40,
    name: 'hg38.fa.gz',
    type: 'file',
    size: 900_000_000,
    parent_id: 3,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 41,
    name: 'gencode.v44.annotation.gtf',
    type: 'file',
    size: 45_000_000,
    parent_id: 3,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },
  {
    id: 42,
    name: 'dbsnp_155.vcf.gz',
    type: 'file',
    size: 680_000_000,
    parent_id: 3,
    mime_type: null,
    created_time: weekAgo,
    updated_time: weekAgo,
  },

  // results 文件夹下
  {
    id: 50,
    name: 'umap_clusters.png',
    type: 'file',
    size: 450_000,
    parent_id: 4,
    mime_type: 'image/png',
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 51,
    name: 'volcano_plot.svg',
    type: 'file',
    size: 120_000,
    parent_id: 4,
    mime_type: 'image/svg+xml',
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 52,
    name: 'marker_genes.csv',
    type: 'file',
    size: 85_000,
    parent_id: 4,
    mime_type: 'text/csv',
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 53,
    name: 'qc_report.html',
    type: 'file',
    size: 2_400_000,
    parent_id: 4,
    mime_type: 'text/html',
    created_time: yesterday,
    updated_time: yesterday,
  },
  {
    id: 54,
    name: 'differential_expression.pdf',
    type: 'file',
    size: 3_200_000,
    parent_id: 4,
    mime_type: 'application/pdf',
    created_time: yesterday,
    updated_time: yesterday,
  },
];

// ========== 模拟延迟 ==========
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== Mock API 方法 ==========

/**
 * 获取文件列表（模拟分页和搜索）
 */
export async function mockGetFiles(params?: {
  keyword?: string;
  page?: number;
  page_size?: number;
  parent_id?: number;
}): Promise<MockFileListResponse> {
  await delay();

  let filtered = [...mockFiles];

  // 按 parent_id 过滤
  const parentId = params?.parent_id ?? null;
  filtered = filtered.filter((f) =>
    parentId === null ? f.parent_id === null : f.parent_id === parentId,
  );

  // 关键词搜索
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter((f) => f.name.toLowerCase().includes(kw));
  }

  // 文件夹排前面
  filtered.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return 0;
  });

  // 分页
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? 20;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total: filtered.length };
}

/**
 * 新建文件夹
 */
export async function mockCreateFolder(data: {
  name: string;
  parent_id?: null | number;
}): Promise<MockFileItem> {
  await delay();
  const folder: MockFileItem = {
    id: nextId++,
    name: data.name,
    type: 'folder',
    size: 0,
    parent_id: data.parent_id ?? null,
    mime_type: null,
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString(),
  };
  mockFiles.push(folder);
  return folder;
}

/**
 * 上传文件（模拟）
 */
export async function mockUploadFile(
  file: File,
  parentId?: null | number,
): Promise<MockFileItem> {
  await delay(800);
  const newFile: MockFileItem = {
    id: nextId++,
    name: file.name,
    type: 'file',
    size: file.size,
    parent_id: parentId ?? null,
    mime_type: file.type || null,
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString(),
  };
  mockFiles.push(newFile);
  return newFile;
}

/**
 * 删除文件/文件夹
 */
export async function mockDeleteFile(fileId: number): Promise<void> {
  await delay(200);
  const index = mockFiles.findIndex((f) => f.id === fileId);
  if (index !== -1) {
    // 如果是文件夹，递归删除子文件
    const item = mockFiles[index];
    if (item && item.type === 'folder') {
      const childIds = mockFiles
        .filter((f) => f.parent_id === fileId)
        .map((f) => f.id);
      for (const childId of childIds) {
        await mockDeleteFile(childId);
      }
    }
    mockFiles.splice(
      mockFiles.findIndex((f) => f.id === fileId),
      1,
    );
  }
}

/**
 * 批量删除
 */
export async function mockBatchDelete(ids: number[]): Promise<void> {
  await delay(300);
  for (const id of ids) {
    await mockDeleteFile(id);
  }
}

/**
 * 获取存储统计信息
 */
export async function mockGetStorageStats(): Promise<StorageStatsData> {
  await delay(200);
  const files = mockFiles.filter((f) => f.type === 'file');
  const folders = mockFiles.filter((f) => f.type === 'folder');
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const filenames = files.map((f) => f.name);

  return {
    fileCount: files.length,
    folderCount: folders.length,
    totalSize,
    filenames,
  };
}

/**
 * 模拟下载 URL
 */
export function mockGetDownloadUrl(fileId: number): string {
  return `#mock-download-${fileId}`;
}
