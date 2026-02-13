/**
 * 我的数据 API
 * 对接后端 /api/v1/sys/my-data 接口
 */
import { requestClient } from '#/api/request';

// ========== 类型定义 ==========

/** 后端文件记录 */
export interface UserFileItem {
  id: number;
  user_id: number;
  name: string;
  type: 'file' | 'folder';
  size: number;
  parent_id: null | number;
  storage_path: null | string;
  mime_type: null | string;
  created_time: null | string;
  updated_time: null | string;
}

/** 文件列表响应 */
export interface FileListResponse {
  items: UserFileItem[];
  total: number;
}

/** 存储统计 */
export interface StorageStatsData {
  file_count: number;
  folder_count: number;
  total_size: number;
}

// ========== API 方法 ==========

/**
 * 获取文件列表（分页 + 搜索）
 * GET /api/v1/sys/my-data/files
 */
export async function getFiles(params?: {
  keyword?: string;
  page?: number;
  page_size?: number;
  parent_id?: number;
}): Promise<FileListResponse> {
  return await requestClient.get<FileListResponse>(
    '/api/v1/sys/my-data/files',
    { params },
  );
}

/**
 * 新建文件夹
 * POST /api/v1/sys/my-data/folders
 */
export async function createFolder(data: {
  name: string;
  parent_id?: null | number;
}): Promise<UserFileItem> {
  return await requestClient.post<UserFileItem>(
    '/api/v1/sys/my-data/folders',
    data,
  );
}

/**
 * 上传文件
 * POST /api/v1/sys/my-data/upload
 */
export async function uploadFile(
  file: File,
  parentId?: null | number,
): Promise<UserFileItem> {
  const formData = new FormData();
  formData.append('file', file);
  const params: Record<string, string> = {};
  if (parentId !== null && parentId !== undefined) {
    params.parent_id = String(parentId);
  }
  return await requestClient.post<UserFileItem>(
    '/api/v1/sys/my-data/upload',
    formData,
    {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

/**
 * 删除文件/文件夹
 * DELETE /api/v1/sys/my-data/{file_id}
 */
export async function deleteFile(fileId: number): Promise<void> {
  await requestClient.delete(`/api/v1/sys/my-data/${fileId}`);
}

/**
 * 批量删除
 * DELETE /api/v1/sys/my-data/batch
 */
export async function batchDelete(ids: number[]): Promise<void> {
  await requestClient.delete('/api/v1/sys/my-data/batch', { data: { ids } });
}

/**
 * 获取下载 URL
 * GET /api/v1/sys/my-data/download/{file_id}
 */
export function getDownloadUrl(fileId: number): string {
  return `/api/v1/sys/my-data/download/${fileId}`;
}

/**
 * 获取存储统计
 * GET /api/v1/sys/my-data/storage-stats
 */
export async function getStorageStats(): Promise<StorageStatsData> {
  return await requestClient.get<StorageStatsData>(
    '/api/v1/sys/my-data/storage-stats',
  );
}
