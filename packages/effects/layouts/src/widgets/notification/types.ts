interface NotificationItem {
  id: number | string;
  avatar: string;
  date: string;
  isRead?: boolean;
  message: string;
  title: string;
<<<<<<< HEAD
  // 扩展字段：用于跳转
  id?: number;
  relatedId?: number | null;
  msgType?: 'task_completed' | 'task_failed';
=======
  /**
   * 跳转链接，可以是路由路径或完整 URL
   * @example '/dashboard' 或 'https://example.com'
   */
  link?: string;
  query?: Record<string, any>;
  state?: Record<string, any>;
>>>>>>> 2dc386e36c052781dda586acbd26bb782d5627f2
}

export type { NotificationItem };
