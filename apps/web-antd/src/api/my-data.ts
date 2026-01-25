import { requestClient } from '#/api/request';

// ========== 类型定义 ==========

export interface FileItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  size: number;
  parent_id: null | number;
  mime_type: null | string;
  created_time: null | string;
  updated_time: null | string;
}

export interface FileListResponse {
  items: FileItem[];
  total: number;
}

// ========== API 路径 ==========
const BASE_URL = '/api/v1/sys/my-data';

// ========== 文件列表 API ==========

/**
 * 获取文件列表
 */
export async function getMyDataFiles(params?: {
  keyword?: string;
  parent_id?: number;
}) {
  // 过滤掉 undefined 值，防止发送无效参数
  const cleanParams = params
    ? Object.fromEntries(
        Object.entries(params).filter(
          ([_, v]) => v !== undefined && v !== null,
        ),
      )
    : undefined;
  return requestClient.get<FileListResponse>(`${BASE_URL}/files`, {
    params: cleanParams,
  });
}

// ========== 文件夹操作 ==========

/**
 * 新建文件夹
 */
export async function createMyDataFolder(data: {
  name: string;
  parent_id?: null | number;
}) {
  return requestClient.post<FileItem>(`${BASE_URL}/folders`, data);
}

// ========== 文件上传 ==========

/**
 * 上传文件（支持大文件，超时5分钟）
 */
export async function uploadMyDataFile(file: File, parentId?: null | number) {
  const formData = new FormData();
  formData.append('file', file);
  const params = parentId ? { parent_id: parentId } : undefined;
  return requestClient.post<FileItem>(`${BASE_URL}/upload`, formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300_000, // 5分钟超时
  });
}

// ========== 下载文件 ==========

/**
 * 获取文件下载链接
 */
export function getMyDataDownloadUrl(fileId: number): string {
  return `${BASE_URL}/download/${fileId}`;
}

/**
 * 下载文件
 */
export async function downloadMyDataFile(fileId: number) {
  return requestClient.get(`${BASE_URL}/download/${fileId}`, {
    responseType: 'blob',
  });
}

// ========== 文件操作 ==========

/**
 * 重命名文件/文件夹
 */
export async function renameMyDataFile(fileId: number, name: string) {
  return requestClient.put<FileItem>(`${BASE_URL}/${fileId}/rename`, { name });
}

/**
 * 移动文件/文件夹
 */
export async function moveMyDataFile(
  fileId: number,
  targetParentId: null | number,
) {
  return requestClient.put<FileItem>(`${BASE_URL}/${fileId}/move`, {
    target_parent_id: targetParentId,
  });
}

/**
 * 删除文件/文件夹
 */
export async function deleteMyDataFile(fileId: number) {
  return requestClient.delete(`${BASE_URL}/${fileId}`);
}

/**
 * 批量删除
 */
export async function batchDeleteMyDataFiles(ids: number[]) {
  return requestClient.delete(`${BASE_URL}/batch`, { data: { ids } });
}

// ========== 文件夹树 ==========

export interface FolderTreeNode extends FileItem {
  children?: FolderTreeNode[];
}

/**
 * 获取用户文件夹树（用于文件选择器）
 */
export async function getUserFolderTree(): Promise<FolderTreeNode[]> {
  return requestClient.get<FolderTreeNode[]>(`${BASE_URL}/tree`);
}
