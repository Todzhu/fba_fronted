import { describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();

vi.mock('#/api/request', () => ({
  requestClient: { delete: del, get, post, put },
}));

describe('tutorial api', () => {
  it('uses public endpoints for anonymous tutorial browsing', async () => {
    const api = await import('./tutorials');
    await api.getTutorialCategories();
    await api.getTutorialArticles({ search: 'single cell', category_id: 2 });
    await api.getTutorialArticle('scanpy-basic');
    await api.increaseTutorialView(9);
    expect(get).toHaveBeenCalledWith('/api/v1/tutorials/categories');
    expect(get).toHaveBeenCalledWith('/api/v1/tutorials/articles', {
      params: { category_id: 2, search: 'single cell' },
    });
    expect(get).toHaveBeenCalledWith('/api/v1/tutorials/articles/scanpy-basic');
    expect(post).toHaveBeenCalledWith('/api/v1/tutorials/articles/9/view');
  });

  it('uses admin endpoints for cms maintenance', async () => {
    const api = await import('./tutorials');
    await api.getAdminTutorialArticles({ status: 1 });
    await api.createAdminTutorialArticle({
      title: 'T',
      slug: 't',
      content_markdown: '# T',
      status: 0,
    });
    await api.updateAdminTutorialArticle(3, { title: 'T2' });
    await api.publishAdminTutorialArticle(3);
    await api.deleteAdminTutorialArticle(3);
    expect(get).toHaveBeenCalledWith('/api/v1/sys/tutorials/articles', {
      params: { status: 1 },
    });
    expect(post).toHaveBeenCalledWith('/api/v1/sys/tutorials/articles', {
      content_markdown: '# T',
      slug: 't',
      status: 0,
      title: 'T',
    });
    expect(put).toHaveBeenCalledWith('/api/v1/sys/tutorials/articles/3', {
      title: 'T2',
    });
    expect(put).toHaveBeenCalledWith('/api/v1/sys/tutorials/articles/3/publish');
    expect(del).toHaveBeenCalledWith('/api/v1/sys/tutorials/articles/3');
  });
});
