import { requestClient } from './request'

export interface AnalysisToolQuery {
  page?: number
  page_size?: number
  category?: string
  func_type?: string
  search?: string
}

export interface AnalysisToolManageQuery {
  page?: number
  size?: number
  name?: string
  category?: string
  type?: string
}

export interface AnalysisTool {
  id: number
  name: string
  description?: string
  image_url?: string
  category?: string
  type?: string
  views: number
  likes: number
  is_favorite: boolean
  created_time?: string
  updated_time?: string
}

export interface AnalysisToolCreateRequest {
  name: string
  description?: string
  image_url?: string
  category?: string
  type?: string
  views?: number
  likes?: number
  is_favorite?: boolean
}

export interface AnalysisToolUpdateRequest {
  name?: string
  description?: string
  image_url?: string
  category?: string
  type?: string
  views?: number
  likes?: number
  is_favorite?: boolean
}

export function fetchAnalysisToolList(params: AnalysisToolQuery) {
  return requestClient.post('/api/v1/biocloud/analysis_tool/list', params)
}

export function fetchAnalysisToolCategories() {
  return requestClient.get('/api/v1/biocloud/analysis_tool/categories');
}

export function fetchAnalysisToolFuncTypes() {
  return requestClient.get('/api/v1/biocloud/analysis_tool/func_types');
}

export function toggleAnalysisToolFavorite(tool_id: number, is_favorite: boolean) {
  return requestClient.post('/api/v1/biocloud/analysis_tool/favorite', { tool_id, is_favorite });
}

// 管理功能API
export function fetchAnalysisToolManageList(params: AnalysisToolManageQuery) {
  return requestClient.post('/api/v1/biocloud/analysis_tool/manage/list', params);
}

export function fetchAnalysisToolDetail(id: number) {
  return requestClient.get(`/api/v1/biocloud/analysis_tool/manage/${id}`);
}

export function createAnalysisTool(data: AnalysisToolCreateRequest) {
  return requestClient.post('/api/v1/biocloud/analysis_tool/manage', data);
}

export function updateAnalysisTool(id: number, data: AnalysisToolUpdateRequest) {
  return requestClient.put(`/api/v1/biocloud/analysis_tool/manage/${id}`, data);
}

export function deleteAnalysisTool(id: number) {
  return requestClient.delete(`/api/v1/biocloud/analysis_tool/manage/${id}`);
}