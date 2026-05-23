import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();

vi.mock('#/api/request', () => ({
  miniRequestClient: {
    get,
  },
  requestClient: {
    get,
    delete: del,
    post,
    put,
  },
}));

describe('analysisTool compatibility behavior', () => {
  beforeEach(() => {
    get.mockReset();
    del.mockReset();
    post.mockReset();
    put.mockReset();
  });

  it('maps legacy list query names to canonical analysis tool filters', async () => {
    const { fetchAnalysisToolList } = await import('./analysisTool');

    get.mockResolvedValueOnce({
      items: [
        {
          created_time: '2026-01-01',
          description: 'desc',
          func_category: '差异分析',
          icon: '/tool.png',
          id: 1,
          omics_category: '转录组',
          stars: 7,
          title: 'DEG',
          updated_time: null,
          views: 99,
        },
      ],
      total: 1,
    });

    const result = await fetchAnalysisToolList({
      category: '转录组',
      func_type: '差异分析',
      page: 2,
      page_size: 20,
      search: 'deg',
    });

    expect(get).toHaveBeenCalledWith(
      '/api/v1/sys/analysis-tools?page=2&size=20&search=deg&omics=%E8%BD%AC%E5%BD%95%E7%BB%84&func=%E5%B7%AE%E5%BC%82%E5%88%86%E6%9E%90',
    );
    expect(result.items[0]).toMatchObject({
      category: '转录组',
      image_url: '/tool.png',
      is_favorite: false,
      likes: 7,
      name: 'DEG',
      type: '差异分析',
    });
  });

  it('maps legacy manage query names to canonical cloud tool filters', async () => {
    const { fetchAnalysisToolManageList } = await import('./analysisTool');

    get.mockResolvedValueOnce({
      items: [],
      total: 0,
    });

    await fetchAnalysisToolManageList({
      category: '单细胞',
      name: 'cluster',
      page: 1,
      size: 10,
    });

    expect(get).toHaveBeenCalledWith('/api/v1/sys/cloud-tools', {
      params: {
        func_category: undefined,
        omics: '单细胞',
        page: 1,
        search: 'cluster',
        size: 10,
      },
    });
  });

  it('maps legacy manage type to supported cloud tool filters', async () => {
    const { fetchAnalysisToolManageList } = await import('./analysisTool');

    get.mockResolvedValueOnce({
      items: [
        { func_category: '差异分析', id: 1, title: 'DEG' },
        { func_category: '富集分析', id: 2, title: 'GO' },
      ],
      total: 2,
    });

    const result = await fetchAnalysisToolManageList({
      type: '差异分析',
    });

    expect(get).toHaveBeenCalledWith('/api/v1/sys/cloud-tools', {
      params: {
        func_category: '差异分析',
        omics: undefined,
        page: undefined,
        search: undefined,
        size: undefined,
      },
    });
    expect(result).toMatchObject({
      items: [
        { id: 1, type: '差异分析' },
        { id: 2, type: '富集分析' },
      ],
      total: 2,
    });
  });

  it('keeps legacy func type and favorite endpoints when no canonical API exists', async () => {
    const { fetchAnalysisToolFuncTypes, toggleAnalysisToolFavorite } =
      await import('./analysisTool');

    await fetchAnalysisToolFuncTypes();
    await toggleAnalysisToolFavorite(12, true);

    expect(get).toHaveBeenCalledWith(
      '/api/v1/biocloud/analysis_tool/func_types',
    );
    expect(post).toHaveBeenCalledWith('/api/v1/biocloud/analysis_tool/favorite', {
      is_favorite: true,
      tool_id: 12,
    });
  });

  it('maps legacy create and update payloads to canonical cloud tool fields', async () => {
    const { createAnalysisTool, updateAnalysisTool } =
      await import('./analysisTool');

    await createAnalysisTool({
      category: '转录组',
      description: 'desc',
      image_url: '/tool.png',
      is_favorite: true,
      likes: 8,
      name: 'DEG',
      type: '差异分析',
      views: 99,
    });
    await updateAnalysisTool(5, {
      category: '单细胞',
      image_url: '/new.png',
      name: 'Cluster',
      type: '聚类',
    });

    expect(post).toHaveBeenCalledWith('/api/v1/sys/cloud-tools', {
      description: 'desc',
      func_category: '差异分析',
      icon: '/tool.png',
      omics_category: '转录组',
      title: 'DEG',
    });
    expect(put).toHaveBeenCalledWith('/api/v1/sys/cloud-tools/5', {
      icon: '/new.png',
      omics_category: '单细胞',
      title: 'Cluster',
      func_category: '聚类',
    });
  });

  it('maps legacy detail responses and remembered favorite state to legacy analysis tool fields', async () => {
    const { fetchAnalysisToolDetail, toggleAnalysisToolFavorite } =
      await import('./analysisTool');

    get.mockResolvedValueOnce({
      created_time: '2026-01-01',
      description: 'detail',
      func_category: '聚类',
      icon: '/cluster.png',
      id: 5,
      omics_category: '单细胞',
      stars: 3,
      title: 'Cluster',
      updated_time: '2026-01-02',
      views: 11,
    });

    await toggleAnalysisToolFavorite(5, true);
    const result = await fetchAnalysisToolDetail(5);

    expect(post).toHaveBeenCalledWith('/api/v1/biocloud/analysis_tool/favorite', {
      is_favorite: true,
      tool_id: 5,
    });
    expect(get).toHaveBeenCalledWith('/api/v1/sys/cloud-tools/5');
    expect(result).toMatchObject({
      category: '单细胞',
      image_url: '/cluster.png',
      is_favorite: true,
      likes: 3,
      name: 'Cluster',
      type: '聚类',
    });
  });

  it('maps legacy cloudTools myData wrapper payloads to canonical file APIs', async () => {
    const { batchDeleteFiles, moveFile, renameFile } = await import(
      './cloudTools/myData'
    );

    await renameFile(3, { name: 'renamed.txt' });
    await moveFile(4, { target_parent_id: 9 });
    await batchDeleteFiles({ ids: [1, 2, 3] });

    expect(put).toHaveBeenCalledWith('/api/v1/sys/my-data/3/rename', {
      name: 'renamed.txt',
    });
    expect(put).toHaveBeenCalledWith('/api/v1/sys/my-data/4/move', {
      target_parent_id: 9,
    });
    expect(del).toHaveBeenCalledWith('/api/v1/sys/my-data/batch', {
      data: { ids: [1, 2, 3] },
    });
  });

  it('keeps root myData delete wrappers resolving to undefined', async () => {
    const { batchDelete, deleteFile } = await import('./myData');
    del.mockResolvedValue({ ok: true });

    await expect(deleteFile(7)).resolves.toBeUndefined();
    await expect(batchDelete([7, 8])).resolves.toBeUndefined();

    expect(del).toHaveBeenCalledWith('/api/v1/sys/my-data/7');
    expect(del).toHaveBeenCalledWith('/api/v1/sys/my-data/batch', {
      data: { ids: [7, 8] },
    });
  });
});
