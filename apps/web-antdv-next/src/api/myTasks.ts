/**
 * 我的任务 API
 * 与后端 /api/v1/sys/analysis-tools/tasks 端点交互
 */
import { requestClient } from './request';

// ========== 类型定义 ==========

export interface TaskItem {
  id: number;
  status: 'completed' | 'failed' | 'pending' | 'running';
  task_name: null | string;
  tool_name: null | string;
  tool_id: number;
  progress: number;
  output_dir: null | string;
  error_message: null | string;
  input_params: null | Record<string, unknown>;
  input_files: null | Record<string, string>;
  created_at: string;
  started_at: null | string;
  completed_at: null | string;
}

export interface TaskListResponse {
  items: TaskItem[];
  total: number;
  page: number;
  page_size: number;
}

// ========== API 路径 ==========

const BASE_URL = '/api/v1/sys/analysis-tools';

// ========== API 函数 ==========

/**
 * 获取任务列表
 */
export async function getMyTasks(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}) {
  const cleanParams = params
    ? Object.fromEntries(
        Object.entries(params).filter(
          ([_, v]) => v !== undefined && v !== null,
        ),
      )
    : undefined;
  return requestClient.get<TaskListResponse>(`${BASE_URL}/tasks`, {
    params: cleanParams,
  });
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(taskId: number) {
  return requestClient.get<TaskItem>(`${BASE_URL}/tasks/${taskId}`);
}

/**
 * 删除单个任务
 */
export async function deleteTask(taskId: number) {
  return requestClient.delete(`${BASE_URL}/tasks/${taskId}`);
}

/**
 * 批量删除任务
 */
export async function batchDeleteTasks(ids: number[]) {
  // 后端使用 Query 参数接收多个 ids，格式：?ids=1&ids=2&ids=3
  const queryString = ids.map((id) => `ids=${id}`).join('&');
  return requestClient.delete(`${BASE_URL}/tasks/batch?${queryString}`);
}

/**
 * 更新任务名称
 */
export async function updateTaskName(taskId: number, taskName: string) {
  return requestClient.put(`${BASE_URL}/tasks/${taskId}`, null, {
    params: { task_name: taskName },
  });
}
