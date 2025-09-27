import { requestClient } from './request'

export interface AnalysisToolQuery {
  page?: number
  page_size?: number
  category?: string
  func_type?: string
  search?: string
}

export function fetchAnalysisToolList(params: AnalysisToolQuery) {
  return requestClient.post('/biocloud/analysis_tool/list', params)
}

export function fetchAnalysisToolCategories() {
  return requestClient.get('/biocloud/analysis_tool/categories');
}

export function toggleAnalysisToolFavorite(tool_id: number, is_favorite: boolean) {
  return requestClient.post('/biocloud/analysis_tool/favorite', { tool_id, is_favorite });
} 