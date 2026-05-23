import {
  batchDeleteMyDataFiles,
  moveMyDataFile,
  renameMyDataFile,
} from '../my-data';

export * from '../my-data';
export {
  createMyDataFolder as createFolder,
  deleteMyDataFile as deleteFile,
  getMyDataDownloadUrl as getDownloadUrl,
  uploadMyDataFile as uploadFile,
} from '../my-data';
export type {
  FileItem as UserFile,
  FileListResponse as UserFileListResult,
} from '../my-data';
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

export function renameFile(fileId: number, data: UserFileRenameParams) {
  return renameMyDataFile(fileId, data.name);
}

export function moveFile(fileId: number, data: UserFileMoveParams) {
  return moveMyDataFile(fileId, data.target_parent_id);
}

export function batchDeleteFiles(data: UserFileBatchDeleteParams) {
  return batchDeleteMyDataFiles(data.ids);
}
