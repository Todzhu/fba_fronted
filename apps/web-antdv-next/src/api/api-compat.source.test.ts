import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readApiFile = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('api compatibility modules', () => {
  it('keeps myData as a compatibility module with legacy aliases', () => {
    const source = readApiFile('./myData.ts');
    expect(source).toContain("export * from './my-data';");
    expect(source).toContain('getMyDataFiles as getFiles');
    expect(source).toContain('createMyDataFolder as createFolder');
    expect(source).toContain('uploadMyDataFile as uploadFile');
    expect(source).toContain('batchDeleteMyDataFiles as batchDelete');
    expect(source).toContain('getMyDataDownloadUrl as getDownloadUrl');
    expect(source).toContain('interface UserFileItem extends FileItem');
    expect(source).toContain('user_id: number');
    expect(source).toContain('storage_path: null | string');
    expect(source).toContain('interface FileListResponse');
    expect(source).toContain('interface StorageStatsData extends StorageStats');
  });

  it('keeps cloudTools myData as a compatibility module with legacy aliases', () => {
    const source = readApiFile('./cloudTools/myData.ts');
    expect(source).toContain("export * from '../my-data';");
    expect(source).toContain('interface UserFile extends FileItem');
    expect(source).toContain('user_id: number');
    expect(source).toContain('storage_path: null | string');
    expect(source).toContain('interface UserFileListResult');
    expect(source).toContain('createMyDataFolder as createFolder');
    expect(source).toContain('uploadMyDataFile as uploadFile');
    expect(source).toContain('getMyDataDownloadUrl as getDownloadUrl');
    expect(source).toContain('deleteMyDataFile as deleteFile');
    expect(source).toContain('function renameFile');
    expect(source).toContain('function moveFile');
    expect(source).toContain('function batchDeleteFiles');
  });

  it('keeps analysisTool as a compatibility module with legacy aliases', () => {
    const source = readApiFile('./analysisTool.ts');
    expect(source).toContain("export * from './analysis-tools';");
    expect(source).toContain('getAnalysisToolCategories as fetchAnalysisToolCategories');
    expect(source).toContain('getCloudToolApi as fetchAnalysisToolDetail');
    expect(source).toContain('deleteCloudToolApi as deleteAnalysisTool');
    expect(source).toContain('function fetchAnalysisToolList');
    expect(source).toContain('function fetchAnalysisToolManageList');
    expect(source).toContain('function createAnalysisTool');
    expect(source).toContain('function updateAnalysisTool');
    expect(source).toContain('function fetchAnalysisToolFuncTypes');
    expect(source).toContain('function toggleAnalysisToolFavorite');
  });
});
