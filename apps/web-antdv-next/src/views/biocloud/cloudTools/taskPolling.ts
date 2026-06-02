import type { TaskStatusResponse } from '#/api/analysis-tools';

type GetTaskStatus = (taskId: number) => Promise<TaskStatusResponse>;

interface PollTaskOptions {
  intervalMs?: number;
  maxRequestFailures?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pollTaskUntilDone(
  taskId: number,
  getStatus: GetTaskStatus,
  options: PollTaskOptions = {},
): Promise<TaskStatusResponse> {
  const intervalMs = options.intervalMs ?? 2000;
  const maxRequestFailures = options.maxRequestFailures ?? 3;
  let requestFailures = 0;

  while (true) {
    try {
      const status = await getStatus(taskId);
      requestFailures = 0;

      if (status.status === 'pending' || status.status === 'running') {
        await sleep(intervalMs);
        continue;
      }

      return status;
    } catch (error) {
      requestFailures += 1;
      if (requestFailures > maxRequestFailures) {
        throw error;
      }
      await sleep(intervalMs);
    }
  }
}
