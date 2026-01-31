interface NotificationItem {
  avatar: string;
  date: string;
  isRead?: boolean;
  message: string;
  title: string;
  // 扩展字段：用于跳转
  id?: number;
  relatedId?: null | number;
  msgType?: 'task_completed' | 'task_failed';
}

export type { NotificationItem };
