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
    expect(source).toContain('FileItem as UserFileItem');
    expect(source).toContain('StorageStats as StorageStatsData');
  });

  it('keeps cloudTools myData as a compatibility module with legacy aliases', () => {
    const source = readApiFile('./cloudTools/myData.ts');
    expect(source).toContain("export * from '../my-data';");
    expect(source).toContain('FileItem as UserFile');
    expect(source).toContain('FileListResponse as UserFileListResult');
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
    expect(source).toContain('getAnalysisToolList as fetchAnalysisToolList');
    expect(source).toContain('getAnalysisToolCategories as fetchAnalysisToolCategories');
    expect(source).toContain('getCloudToolListApi as fetchAnalysisToolManageList');
    expect(source).toContain('getCloudToolApi as fetchAnalysisToolDetail');
    expect(source).toContain('createCloudToolApi as createAnalysisTool');
    expect(source).toContain('deleteCloudToolApi as deleteAnalysisTool');
  });
});
