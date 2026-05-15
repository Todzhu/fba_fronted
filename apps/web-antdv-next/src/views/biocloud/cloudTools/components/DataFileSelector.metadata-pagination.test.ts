import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const componentPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'DataFileSelector.vue',
);

describe('DataFileSelector metadata table pagination', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('keeps the metadata summary table paginated', () => {
    expect(source).not.toContain(':pagination="false"');
    expect(source).toContain(':pagination="metadataTablePagination"');
    expect(source).toContain("pageSizeOptions: ['8', '15', '30']");
  });

  it('requires platform selection for RDS/H5AD binary inputs', () => {
    expect(source).toContain('const MANAGED_BINARY_EXTENSIONS = new Set');
    expect(source).toContain('const requiresPlatformFileSelection');
    expect(source).not.toContain("import { uploadMyDataFile } from '#/api/my-data';");
    expect(source).not.toContain('const uploadedFile = await uploadMyDataFile(file);');
    expect(source).not.toContain('handleBinaryImportForKey');
    expect(source).not.toContain('fileData.fileUrl = URL.createObjectURL(file);');
  });
});
