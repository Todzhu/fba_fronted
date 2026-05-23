import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();

vi.mock('#/api/request', () => ({
  miniRequestClient: {
    get,
  },
  requestClient: {
    get,
    post,
    put,
  },
}));

describe('analysisTool compatibility behavior', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
  });

  it('maps legacy list query names to canonical analysis tool filters', async () => {
    const { fetchAnalysisToolList } = await import('./analysisTool');

    await fetchAnalysisToolList({
      category: '转录组',
      func_type: '差异分析',
      page: 2,
      page_size: 20,
      search: 'deg',
    });

    expect(get).toHaveBeenCalledWith(
      '/api/v1/sys/analysis-tools?page=2&size=20&search=deg&omics=%E8%BD%AC%E5%BD%95%E7%BB%84&func=%E5%B7%AE%E5%BC%82%E5%88%86%E6%9E%90',
    );
  });

  it('maps legacy manage query names to canonical cloud tool filters', async () => {
    const { fetchAnalysisToolManageList } = await import('./analysisTool');

    await fetchAnalysisToolManageList({
      category: '单细胞',
      name: 'cluster',
      page: 1,
      size: 10,
    });

    expect(get).toHaveBeenCalledWith('/api/v1/sys/cloud-tools', {
      params: {
        omics: '单细胞',
        page: 1,
        search: 'cluster',
        size: 10,
      },
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
});
