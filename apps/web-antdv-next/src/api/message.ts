import { requestClient } from '#/api/request';

export interface UserMessage {
  id: number;
  title: string;
  content: string;
  msg_type: 'task_completed' | 'task_failed';
  is_read: boolean;
  related_id: null | number;
  created_time: string;
}

export interface UserMessageListResponse {
  items: UserMessage[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * 获取用户消息列表
 */
export async function getMessageList(params?: {
  page?: number;
  size?: number;
}) {
  return requestClient.get<UserMessageListResponse>('/api/v1/sys/messages', {
    params,
  });
}

/**
 * 获取未读消息数
 */
export async function getUnreadCount() {
  return requestClient.get<UnreadCountResponse>(
    '/api/v1/sys/messages/unread-count',
  );
}

/**
 * 标记消息为已读
 */
export async function markAsRead(msgId: number) {
  return requestClient.put(`/api/v1/sys/messages/${msgId}/read`);
}

/**
 * 全部标记已读
 */
export async function markAllAsRead() {
  return requestClient.put<{ count: number }>('/api/v1/sys/messages/read-all');
}

/**
 * 清空所有消息
 */
export async function clearAllMessages() {
  return requestClient.delete<{ count: number }>('/api/v1/sys/messages/clear');
}
