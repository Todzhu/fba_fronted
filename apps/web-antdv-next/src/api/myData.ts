import type { FileItem, StorageStats } from './my-data';

export * from './my-data';
export {
  batchDeleteMyDataFiles as batchDelete,
  createMyDataFolder as createFolder,
  deleteMyDataFile as deleteFile,
  getMyDataDownloadUrl as getDownloadUrl,
  getMyDataFiles as getFiles,
  uploadMyDataFile as uploadFile,
} from './my-data';

export interface UserFileItem extends FileItem {
  user_id: number;
  storage_path: null | string;
}

export interface FileListResponse {
  items: UserFileItem[];
  total: number;
}

export interface StorageStatsData extends StorageStats {}
