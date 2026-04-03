import { requestClient } from '#/api/request';
import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const BASE_URL = '/api/v1/bioclaw';

// ========== Agent ==========

export interface Agent {
  id: number;
  user_id: number;
  workspace_path: string;
  openclaw_agent_id: string | null;
  status: number;
  model_provider: string;
  reasoning_level: string;
  created_time: string;
}

export async function getMyAgent() {
  return requestClient.get<Agent>(`${BASE_URL}/agents/me`);
}

// ========== Project ==========

export interface Project {
  id: number;
  name: string;
  description: string | null;
  workspace_subpath: string;
  agent_id: number;
  status: number;
  thread_count?: number;
  file_count?: number;
  created_time: string;
  updated_time: string | null;
}

export async function getProjects() {
  return requestClient.get<Project[]>(`${BASE_URL}/projects`);
}

export async function createProject(data: { name: string; description?: string }) {
  return requestClient.post<Project>(`${BASE_URL}/projects`, data);
}

export async function updateProject(
  projectId: number,
  data: { name?: string; description?: string },
) {
  return requestClient.put(`${BASE_URL}/projects/${projectId}`, data);
}

export async function deleteProject(projectId: number) {
  return requestClient.delete(`${BASE_URL}/projects/${projectId}`);
}

// ========== Thread ==========

export interface Thread {
  id: number;
  project_id: number;
  title: string;
  openclaw_session_id: string | null;
  status: string;
  created_time: string;
  updated_time: string | null;
}

export async function getThreads(projectId: number) {
  return requestClient.get<Thread[]>(`${BASE_URL}/projects/${projectId}/threads`);
}

export async function createThread(projectId: number, title: string = '新对话') {
  return requestClient.post<Thread>(`${BASE_URL}/projects/${projectId}/threads`, {
    title,
  });
}

export async function updateThread(
  threadId: number,
  data: { title?: string; status?: string },
) {
  return requestClient.put(`${BASE_URL}/threads/${threadId}`, data);
}

// ========== Message ==========

export interface Message {
  id: number;
  thread_id: number;
  role: 'assistant' | 'system' | 'user';
  content: string;
  message_type: string;
  metadata_json: string | null;
  created_time: string;
}

export async function getMessages(threadId: number) {
  return requestClient.get<Message[]>(`${BASE_URL}/threads/${threadId}/messages`);
}

// ========== Chat (SSE) ==========

/**
 * 发送对话消息并获取 SSE 流式响应。
 * 返回原生 Response 对象，由调用方处理 ReadableStream。
 */
export async function streamChat(
  threadId: number,
  message: string,
  options: {
    files?: string[];
    model_provider?: string;
    reasoning_level?: string;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  // SSE 流需要原生 fetch（requestClient 无法处理流式响应）
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;

  const response = await fetch(`${apiURL}${BASE_URL}/chat/${threadId}`, {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      files: options.files?.length ? options.files : undefined,
      model_provider: options.model_provider,
      reasoning_level: options.reasoning_level,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    let errReason = errText;
    try {
      const errObj = JSON.parse(errText);
      errReason = errObj.msg || errObj.error || errText;
    } catch {
      // ignore parse error
    }
    throw new Error(`HTTP ${response.status}: ${errReason}`);
  }

  return response;
}

// ========== Workspace Files ==========

export interface WorkspaceFileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  updated_time: string;
  parent_id?: number | null;
}

export interface WorkspaceFilesResponse {
  items: WorkspaceFileItem[];
  total: number;
}

export async function getWorkspaceFiles(projectId: number, keyword?: string) {
  return requestClient.get<WorkspaceFilesResponse>(
    `${BASE_URL}/projects/${projectId}/workspace/files`,
    { params: { keyword } },
  );
}

/**
 * 清除项目工作区缓存（使用 POST 替代 DELETE+body）
 */
export async function deleteWorkspaceFiles(projectId: number, files: string[]) {
  return requestClient.post(
    `${BASE_URL}/projects/${projectId}/workspace/files/delete`,
    { files },
  );
}

/**
 * 一键固化至云盘
 */
export async function syncWorkspaceFilesToCloud(
  projectId: number,
  files: string[],
  targetParentId?: number | null,
) {
  return requestClient.post(`${BASE_URL}/projects/${projectId}/workspace/files/sync`, {
    files,
    target_parent_id: targetParentId,
  });
}
