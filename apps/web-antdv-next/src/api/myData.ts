import {
  batchDeleteMyDataFiles,
  createMyDataFolder,
  deleteMyDataFile,
  getMyDataDownloadUrl,
  getMyDataFiles,
  uploadMyDataFile,
} from './my-data';
import type { FileItem, StorageStats } from './my-data';

export * from './my-data';

export interface UserFileItem extends FileItem {
  user_id: number;
  storage_path: null | string;
}

export interface FileListResponse {
  items: UserFileItem[];
  total: number;
}

export interface StorageStatsData extends StorageStats {}

export function getFiles(params?: {
  keyword?: string;
  page?: number;
  page_size?: number;
  parent_id?: number;
}): Promise<FileListResponse> {
  return getMyDataFiles(params) as Promise<FileListResponse>;
}

export function createFolder(data: {
  name: string;
  parent_id?: null | number;
}): Promise<UserFileItem> {
  return createMyDataFolder(data) as Promise<UserFileItem>;
}

export function uploadFile(
  file: File,
  parentId?: null | number,
): Promise<UserFileItem> {
  return uploadMyDataFile(file, parentId) as Promise<UserFileItem>;
}

export function deleteFile(fileId: number) {
  return deleteMyDataFile(fileId);
}

export function batchDelete(ids: number[]) {
  return batchDeleteMyDataFiles(ids);
}

export function getDownloadUrl(fileId: number): string {
  return getMyDataDownloadUrl(fileId);
}
