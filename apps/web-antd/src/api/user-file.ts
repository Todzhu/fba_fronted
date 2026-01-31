import { requestClient } from '#/api/request';

// ========== 类型定义 ==========

export interface UserFolder {
  id: number;
  parent_id: null | number;
  name: string;
  path: string;
  created_time: string;
  children?: UserFolder[];
}

export interface UserFile {
  id: number;
  user_id: number;
  folder_id: null | number;
  name: string;
  original_name: string;
  path: string;
  storage_path: null | string;
  size: number;
  mime_type: null | string;
  is_example: boolean;
  created_time: string;
  updated_time: null | string;
}

export interface FileListResponse {
  items: UserFile[];
  total: number;
}

export interface FileListParams {
  folder_id?: null | number;
  page?: number;
  size?: number;
}

// ========== 文件夹 API ==========

/**
 * 获取文件夹树
 */
export async function getFolderTree() {
  return requestClient.get<UserFolder[]>('/api/v1/sys/my-data/folders');
}

/**
 * 创建文件夹
 */
export async function createFolder(data: {
  name: string;
  parent_id?: null | number;
}) {
  return requestClient.post<UserFolder>('/api/v1/sys/my-data/folders', data);
}

/**
 * 重命名文件夹
 */
export async function renameFolder(id: number, name: string) {
  return requestClient.put<UserFolder>(`/api/v1/sys/my-data/folders/${id}`, {
    name,
  });
}

/**
 * 删除文件夹
 */
export async function deleteFolder(id: number) {
  return requestClient.delete(`/api/v1/sys/my-data/folders/${id}`);
}

// ========== 文件 API ==========

/**
 * 获取文件列表
 */
export async function getFileList(params?: FileListParams) {
  return requestClient.get<FileListResponse>('/api/v1/sys/my-data/files', {
    params,
  });
}

/**
 * 上传文件
 */
export async function uploadFile(file: File, folderId?: null | number) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId !== undefined && folderId !== null) {
    formData.append('folder_id', String(folderId));
  }
  return requestClient.post<UserFile>('/api/v1/sys/my-data/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 5 * 60 * 1000, // 5分钟超时，支持大文件上传
  });
}

/**
 * 删除文件
 */
export async function deleteFile(id: number) {
  return requestClient.delete(`/api/v1/sys/my-data/${id}`);
}

/**
 * 重命名文件
 */
export async function renameFile(id: number, name: string) {
  return requestClient.put<UserFile>(`/api/v1/sys/my-data/${id}/rename`, {
    name,
  });
}
