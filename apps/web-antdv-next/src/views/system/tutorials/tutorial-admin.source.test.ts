import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf-8');

describe('tutorial admin source', () => {
  it('uses article and category cms APIs', () => {
    const source = read('views/system/tutorials/index.vue');
    expect(source).toContain('getAdminTutorialArticles');
    expect(source).toContain('getAdminTutorialCategories');
    expect(source).toContain('publishAdminTutorialArticle');
    expect(source).toContain('deleteAdminTutorialArticle');
  });

  it('provides markdown editor and upload integration', () => {
    const source = read(
      'views/system/tutorials/components/ArticleEditorDrawer.vue',
    );
    expect(source).toContain('MarkdownEditor');
    expect(source).toContain('uploadTutorialFile');
    expect(source).toContain('content_markdown');
  });
});
