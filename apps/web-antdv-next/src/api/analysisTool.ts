import { requestClient } from '#/api/request';

import {
  createCloudToolApi,
  getAnalysisToolList,
  getCloudToolListApi,
  updateCloudToolApi,
  type AnalysisToolListParams,
  type CloudToolCreateParams,
  type CloudToolListParams,
  type CloudToolUpdateParams,
} from './analysis-tools';

export * from './analysis-tools';
export {
  deleteCloudToolApi as deleteAnalysisTool,
  getAnalysisToolCategories as fetchAnalysisToolCategories,
  getCloudToolApi as fetchAnalysisToolDetail,
} from './analysis-tools';

export interface AnalysisTool {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  category?: string;
  type?: string;
  views: number;
  likes: number;
  is_favorite: boolean;
  created_time?: string;
  updated_time?: string;
}

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

export interface AnalysisToolCreateRequest {
  name: string;
  description?: string;
  image_url?: string;
  category?: string;
  type?: string;
  views?: number;
  likes?: number;
  is_favorite?: boolean;
}

export interface AnalysisToolUpdateRequest {
  name?: string;
  description?: string;
  image_url?: string;
  category?: string;
  type?: string;
  views?: number;
  likes?: number;
  is_favorite?: boolean;
}

function mapLegacyToolPayload(
  data: AnalysisToolCreateRequest | AnalysisToolUpdateRequest,
): CloudToolCreateParams | CloudToolUpdateParams {
  const mapped: CloudToolCreateParams | CloudToolUpdateParams = {};

  if (data.name !== undefined) {
    mapped.title = data.name;
  }
  if (data.description !== undefined) {
    mapped.description = data.description;
  }
  if (data.image_url !== undefined) {
    mapped.icon = data.image_url;
  }
  if (data.category !== undefined) {
    mapped.omics_category = data.category;
  }
  if (data.type !== undefined) {
    mapped.func_category = data.type;
  }

  return mapped;
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

export function createAnalysisTool(data: AnalysisToolCreateRequest) {
  return createCloudToolApi(mapLegacyToolPayload(data) as CloudToolCreateParams);
}

export function updateAnalysisTool(
  id: number,
  data: AnalysisToolUpdateRequest,
) {
  return updateCloudToolApi(id, mapLegacyToolPayload(data));
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
