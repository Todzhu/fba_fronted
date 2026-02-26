/**
 * 我的数据 API
 */
import { requestClient } from '#/api/request';

// ========== 类型定义 ==========
export interface UserFile {
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

export interface UserFileListResult {
  items: UserFile[];
  total: number;
}

export interface UserFolderCreateParams {
  name: string;
  parent_id?: null | number;
}

export interface UserFileRenameParams {
  name: string;
}

export interface UserFileMoveParams {
  target_parent_id: null | number;
}

export interface UserFileBatchDeleteParams {
  ids: number[];
}

// ========== API 函数 ==========

/**
 * 获取文件列表
 */
export async function getMyDataFiles(params?: {
  keyword?: string;
  parent_id?: null | number;
}) {
  return requestClient.get<UserFileListResult>('/sys/my-data/files', {
    params,
  });
}

/**
 * 创建文件夹
 */
export async function createFolder(data: UserFolderCreateParams) {
  return requestClient.post<UserFile>('/sys/my-data/folders', data);
}

/**
 * 上传文件
 */
export async function uploadFile(file: File, parentId?: null | number) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<UserFile>('/sys/my-data/upload', formData, {
    params: parentId ? { parent_id: parentId } : undefined,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 下载文件
 */
export function getDownloadUrl(fileId: number) {
  return `/api/v1/sys/my-data/download/${fileId}`;
}

/**
 * 重命名文件/文件夹
 */
export async function renameFile(fileId: number, data: UserFileRenameParams) {
  return requestClient.put<UserFile>(`/sys/my-data/${fileId}/rename`, data);
}

/**
 * 移动文件/文件夹
 */
export async function moveFile(fileId: number, data: UserFileMoveParams) {
  return requestClient.put<UserFile>(`/sys/my-data/${fileId}/move`, data);
}

/**
 * 删除文件/文件夹
 */
export async function deleteFile(fileId: number) {
  return requestClient.delete(`/sys/my-data/${fileId}`);
}

/**
 * 批量删除
 */
export async function batchDeleteFiles(data: UserFileBatchDeleteParams) {
  return requestClient.delete('/sys/my-data/batch', { data });
}
