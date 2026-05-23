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

  it('does not expose unsupported article status values', () => {
    const dataSource = read('views/system/tutorials/data.ts');
    const drawerSource = read(
      'views/system/tutorials/components/ArticleEditorDrawer.vue',
    );

    expect(dataSource).not.toContain('value: 2');
    expect(dataSource).not.toContain('已下线');
    expect(drawerSource).toContain('normalizeArticleStatus');
  });

  it('guards async article edit loads against stale responses', () => {
    const source = read(
      'views/system/tutorials/components/ArticleEditorDrawer.vue',
    );

    expect(source).toContain('articleLoadToken');
    expect(source).toContain('props.open');
    expect(source).toContain('props.articleId !== requestedArticleId');
  });

  it('keeps full category options separate from filtered rows', () => {
    const source = read('views/system/tutorials/index.vue');

    expect(source).toContain('loadCategoryOptions');
    expect(source).toContain('loadCategoryRows');
    expect(source).toContain('await loadCategoryOptions()');
    expect(source).toContain('await loadCategoryRows()');
  });

  it('shows local upload failure feedback', () => {
    const source = read(
      'views/system/tutorials/components/ArticleEditorDrawer.vue',
    );

    expect(source).toContain('message.error');
    expect(source).toContain('封面上传失败');
    expect(source).toContain('附件上传失败');
  });
});
