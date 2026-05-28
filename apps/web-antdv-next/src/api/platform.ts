import { requestClient } from '#/api/request';

export interface PlatformStatusSummary {
  level: 'busy' | 'high' | 'normal';
  cpu_percent: number;
  memory_percent: number;
  running_tasks: number;
  pending_tasks: number;
  message: string;
}

export async function getPlatformStatusSummary() {
  return requestClient.get<PlatformStatusSummary>(
    '/api/v1/sys/platform/status-summary',
  );
}
