import { requestClient } from '#/api/request';

import {
  getAnalysisToolList,
  getCloudToolListApi,
  type AnalysisToolListParams,
  type CloudToolListParams,
} from './analysis-tools';

export * from './analysis-tools';
export {
  createCloudToolApi as createAnalysisTool,
  deleteCloudToolApi as deleteAnalysisTool,
  getAnalysisToolCategories as fetchAnalysisToolCategories,
  getCloudToolApi as fetchAnalysisToolDetail,
  updateCloudToolApi as updateAnalysisTool,
} from './analysis-tools';
export type {
  CloudToolCreateParams as AnalysisToolCreateRequest,
  CloudToolUpdateParams as AnalysisToolUpdateRequest,
} from './analysis-tools';

export interface AnalysisToolQuery {
  page?: number;
  page_size?: number;
  category?: string;
  func_type?: string;
  search?: string;
}

export interface AnalysisToolManageQuery {
  page?: number;
  size?: number;
  name?: string;
  category?: string;
  type?: string;
}

export function fetchAnalysisToolList(params: AnalysisToolQuery = {}) {
  const mapped: AnalysisToolListParams = {
    func: params.func_type ? [params.func_type] : undefined,
    omics: params.category,
    page: params.page,
    search: params.search,
    size: params.page_size,
  };

  return getAnalysisToolList(mapped);
}

export function fetchAnalysisToolManageList(
  params: AnalysisToolManageQuery = {},
) {
  const mapped: CloudToolListParams = {
    omics: params.category,
    page: params.page,
    search: params.name,
    size: params.size,
  };

  return getCloudToolListApi(mapped);
}

export function fetchAnalysisToolFuncTypes() {
  return requestClient.get('/api/v1/biocloud/analysis_tool/func_types');
}

export function toggleAnalysisToolFavorite(
  tool_id: number,
  is_favorite: boolean,
) {
  return requestClient.post('/api/v1/biocloud/analysis_tool/favorite', {
    is_favorite,
    tool_id,
  });
}
