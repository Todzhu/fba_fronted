import { requestClient } from '#/api/request';

export interface AnalysisTool {
  id: number;
  title: string;
  description: null | string;
  icon: null | string;
  color: null | string;
  omics_category: string;
  func_category: null | string;
  views: number;
  stars: number;
  status: number;
  sort: number;
  // 配置驱动字段
  input_schema: null | Record<string, unknown>;
  param_schema: null | Record<string, unknown>;
  output_config: null | Record<string, unknown>;
  runner_type: null | string;
  script_path: null | string;
  // 运行环境配置
  env_type: null | string;
  env_config: null | Record<string, unknown>;
  // 辅助功能配置
  guide_doc: null | string; // 使用指南文档（Markdown 或 URL）
  video_url: null | string; // 视频教程链接
  example_data: ExampleDataConfig[] | null; // 示例数据配置
  created_time: string;
  updated_time: null | string;
}

// 示例数据配置
export interface ExampleDataConfig {
  key: string; // 对应 input_schema 中的 file key
  name: string; // 示例数据名称
  url: string; // 下载/加载 URL
  description?: string; // 描述
}

export interface AnalysisToolListResponse {
  items: AnalysisTool[];
  total: number;
}

export interface AnalysisToolListParams {
  search?: string;
  omics?: string;
  func?: string[];
  page?: number;
  size?: number;
}

/**
 * 获取分析工具列表
 */
export async function getAnalysisToolList(params?: AnalysisToolListParams) {
  // 需要手动序列化 func 数组参数，FastAPI 期望 func=a&func=b 格式
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.append('page', String(params.page));
  }
  if (params?.size) {
    searchParams.append('size', String(params.size));
  }
  if (params?.search) {
    searchParams.append('search', params.search);
  }
  if (params?.omics) {
    searchParams.append('omics', params.omics);
  }
  if (params?.func && params.func.length > 0) {
    params.func.forEach((f) => searchParams.append('func', f));
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/v1/sys/analysis-tools?${queryString}`
    : '/api/v1/sys/analysis-tools';

  return requestClient.get<AnalysisToolListResponse>(url);
}

/**
 * 获取分析工具详情
 */
export async function getAnalysisTool(id: number) {
  return requestClient.get<AnalysisTool>(`/api/v1/sys/analysis-tools/${id}`);
}

export interface AnalysisToolCategories {
  omics: string[];
  func: string[];
}

/**
 * 获取分析工具分类列表
 */
export async function getAnalysisToolCategories() {
  return requestClient.get<AnalysisToolCategories>(
    '/api/v1/sys/analysis-tools/categories',
  );
}

// ========== 管理端 API ==========

export interface CloudToolCreateParams {
  title: string;
  omics_category: string;
  description?: null | string;
  icon?: null | string;
  color?: null | string;
  func_category?: null | string;
  status?: number;
  sort?: number;
  // 配置驱动字段
  input_schema?: null | Record<string, unknown>;
  param_schema?: null | Record<string, unknown>;
  output_config?: null | Record<string, unknown>;
  runner_type?: null | string;
  script_path?: null | string;
  // 运行环境配置
  env_type?: null | string;
  env_config?: null | Record<string, unknown>;
  // 辅助功能配置
  guide_doc?: null | string;
  video_url?: null | string;
  example_data?: ExampleDataConfig[] | null;
}

export interface CloudToolUpdateParams {
  title?: string;
  omics_category?: string;
  description?: null | string;
  icon?: null | string;
  color?: null | string;
  func_category?: null | string;
  status?: number;
  sort?: number;
  // 配置驱动字段
  input_schema?: null | Record<string, unknown>;
  param_schema?: null | Record<string, unknown>;
  output_config?: null | Record<string, unknown>;
  runner_type?: null | string;
  script_path?: null | string;
  // 运行环境配置
  env_type?: null | string;
  env_config?: null | Record<string, unknown>;
  // 辅助功能配置
  guide_doc?: null | string;
  video_url?: null | string;
  example_data?: ExampleDataConfig[] | null;
}

export interface CloudToolListParams {
  search?: string;
  omics?: string;
  status?: number;
  page?: number;
  size?: number;
}

/**
 * 获取云端工具列表（管理端）
 */
export async function getCloudToolListApi(params?: CloudToolListParams) {
  return requestClient.get<AnalysisToolListResponse>(
    '/api/v1/sys/cloud-tools',
    { params },
  );
}

/**
 * 获取云端工具详情（管理端）
 */
export async function getCloudToolApi(id: number) {
  return requestClient.get<AnalysisTool>(`/api/v1/sys/cloud-tools/${id}`);
}

/**
 * 创建云端工具
 */
export async function createCloudToolApi(data: CloudToolCreateParams) {
  return requestClient.post('/api/v1/sys/cloud-tools', data);
}

/**
 * 更新云端工具
 */
export async function updateCloudToolApi(
  id: number,
  data: CloudToolUpdateParams,
) {
  return requestClient.put(`/api/v1/sys/cloud-tools/${id}`, data);
}

/**
 * 删除云端工具
 */
export async function deleteCloudToolApi(id: number) {
  return requestClient.delete(`/api/v1/sys/cloud-tools/${id}`);
}

/**
 * 上传工具图标
 */
export async function uploadToolIconApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<{ url: string }>(
    '/api/v1/sys/files/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

// ========== 分析任务执行 API ==========

export interface ExecuteToolRequest {
  files: Record<string, null | number>;
  file_contents: Record<string, string>;
  params: Record<string, unknown>;
}

export interface ExecuteToolResponse {
  task_id: number;
  status: string;
  message: string;
}

export interface TaskStatusResponse {
  id: number;
  status: 'completed' | 'failed' | 'pending' | 'running';
  output_dir: null | string;
  error_message: null | string;
  created_at: string;
  started_at: null | string;
  completed_at: null | string;
}

/**
 * 执行分析工具
 */
export async function executeAnalysisTool(
  toolId: number,
  data: ExecuteToolRequest,
) {
  return requestClient.post<ExecuteToolResponse>(
    `/api/v1/sys/analysis-tools/${toolId}/execute`,
    data,
  );
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(taskId: number) {
  return requestClient.get<TaskStatusResponse>(
    `/api/v1/sys/analysis-tools/tasks/${taskId}`,
  );
}

/**
 * 获取任务结果文件 URL
 */
export function getTaskFileUrl(taskId: number, filePath: string) {
  return `/api/v1/sys/analysis-tools/tasks/${taskId}/files/${filePath}`;
}
