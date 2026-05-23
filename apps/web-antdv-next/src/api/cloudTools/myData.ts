import {
  batchDeleteMyDataFiles,
  createMyDataFolder,
  deleteMyDataFile,
  getMyDataDownloadUrl,
  getMyDataFiles as getCanonicalMyDataFiles,
  moveMyDataFile,
  renameMyDataFile,
  uploadMyDataFile,
} from '../my-data';
import type { FileItem } from '../my-data';

export * from '../my-data';
export interface UserFile extends FileItem {
  user_id: number;
  storage_path: null | string;
}
export interface UserFileListResult {
  items: UserFile[];
  total: number;
}
export type UserFolderCreateParams = {
  name: string;
  parent_id?: null | number;
};
export type UserFileRenameParams = {
  name: string;
};
export type UserFileMoveParams = {
  target_parent_id: null | number;
};
export type UserFileBatchDeleteParams = {
  ids: number[];
};

export function getMyDataFiles(params?: {
  keyword?: string;
  parent_id?: null | number;
}): Promise<UserFileListResult> {
  return getCanonicalMyDataFiles({
    keyword: params?.keyword,
    parent_id: params?.parent_id ?? undefined,
  }) as Promise<UserFileListResult>;
}

export function createFolder(
  data: UserFolderCreateParams,
): Promise<UserFile> {
  return createMyDataFolder(data) as Promise<UserFile>;
}

export function uploadFile(
  file: File,
  parentId?: null | number,
): Promise<UserFile> {
  return uploadMyDataFile(file, parentId) as Promise<UserFile>;
}

export function getDownloadUrl(fileId: number): string {
  return getMyDataDownloadUrl(fileId);
}

export function renameFile(fileId: number, data: UserFileRenameParams) {
  return renameMyDataFile(fileId, data.name);
}

export function moveFile(fileId: number, data: UserFileMoveParams) {
  return moveMyDataFile(fileId, data.target_parent_id);
}

export function batchDeleteFiles(data: UserFileBatchDeleteParams) {
  return batchDeleteMyDataFiles(data.ids);
}

export function deleteFile(fileId: number) {
  return deleteMyDataFile(fileId);
}
