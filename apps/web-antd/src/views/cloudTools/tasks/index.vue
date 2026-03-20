<script lang="ts" setup>
/**
 * 任务中心 - 查看和管理所有分析任务
 */
import type { TaskStatusResponse } from '#/api/analysis-tools';

import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';
import { useAppConfig } from '@vben/hooks';

import { Icon } from '@iconify/vue';
import {
  Badge,
  Button,
  Drawer,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { deleteTask, deleteTasksBatch, getTaskList, updateTaskName } from '#/api/analysis-tools';

const router = useRouter();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// 状态
const loading = ref(false);
const tasks = ref<TaskStatusResponse[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const statusFilter = ref<string | undefined>(undefined);
const selectedRowKeys = ref<number[]>([]);

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 状态颜色映射
const statusConfig: Record<
  string,
  { color: string; icon: string; text: string }
> = {
  pending: { color: 'default', icon: 'mdi:clock-outline', text: '等待中' },
  running: { color: 'processing', icon: 'mdi:loading', text: '运行中' },
  completed: { color: 'success', icon: 'mdi:check-circle', text: '已完成' },
  failed: { color: 'error', icon: 'mdi:alert-circle', text: '失败' },
};

// 表格列定义
const columns = [
  { title: '任务名称', dataIndex: 'task_name', key: 'task_name', ellipsis: true, width: 200 },
  { title: '工具', dataIndex: 'tool_name', key: 'tool_name', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '进度', dataIndex: 'progress', key: 'progress', width: 150 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '完成时间', dataIndex: 'completed_at', key: 'completed_at', width: 180 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' as const },
];

// 格式化时间
const formatTime = (time: null | string) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

// 加载任务列表
const fetchTasks = async () => {
  loading.value = true;
  try {
    const res = await getTaskList({
      status: statusFilter.value,
      page: page.value,
      page_size: pageSize.value,
    });
    tasks.value = res.items;
    total.value = res.total;
  } catch (error) {
    console.error('获取任务列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 查看任务结果
const viewTask = (task: TaskStatusResponse) => {
  router.push({
    path: `/analysis/tool/${task.tool_id}`,
    query: { task_id: String(task.id), task_name: task.task_name || undefined },
  });
};

// 进入任务详情页
const goToTaskDetail = (task: TaskStatusResponse) => {
  router.push({ name: 'TaskDetail', params: { taskId: String(task.id) } });
};

// 删除单个任务
const handleDelete = async (task: TaskStatusResponse) => {
  try {
    await deleteTask(task.id);
    message.success('删除成功');
    fetchTasks();
  } catch {
    message.error('删除失败');
  }
};

// 批量删除
const handleBatchDelete = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的任务');
    return;
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedRowKeys.value.length} 个任务吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteTasksBatch(selectedRowKeys.value);
        message.success(`成功删除 ${selectedRowKeys.value.length} 个任务`);
        selectedRowKeys.value = [];
        fetchTasks();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

// 表格选择
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (number | string)[]) => {
    selectedRowKeys.value = keys.map(k => Number(k));
  },
}));

// 分页变化
const handleTableChange = (paginationInfo: any) => {
  page.value = paginationInfo.current || 1;
  pageSize.value = paginationInfo.pageSize || 20;
  fetchTasks();
};

// 状态筛选变化
const handleStatusChange = (value: any) => {
  statusFilter.value = value as string | undefined;
  page.value = 1;
  fetchTasks();
};

// 手动刷新
const handleRefresh = () => { fetchTasks(); };

// 更新任务名称
const handleTaskNameChange = async (taskId: number, newName: string) => {
  if (!newName.trim()) { message.warning('任务名称不能为空'); return; }
  try {
    await updateTaskName(taskId, newName.trim());
    message.success('名称已更新');
    const task = tasks.value.find(t => t.id === taskId);
    if (task) task.task_name = newName.trim();
  } catch {
    message.error('更新失败');
  }
};

// ========== 日志弹窗 ==========
const logModalVisible = ref(false);
const currentLogTask = ref<TaskStatusResponse | null>(null);
const logContent = ref('');
const logLoading = ref(false);
let logPollTimer: ReturnType<typeof setInterval> | null = null;
const logContainerRef = ref<HTMLElement | null>(null);

// 读取日志文件
const fetchLog = async (taskId: number) => {
  try {
    const accessStore = useAccessStore();
    const token = accessStore.accessToken;
    const url = `${apiURL}/api/v1/sys/analysis-tools/tasks/${taskId}/files/run.log`;
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (resp.ok) {
      logContent.value = await resp.text();
      await nextTick();
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }
    } else if (resp.status === 404) {
      logContent.value = '日志文件尚未生成，任务可能还在排队中...';
    } else {
      logContent.value = `读取日志失败 (HTTP ${resp.status})`;
    }
  } catch (e: any) {
    logContent.value = `读取日志出错: ${e?.message || e}`;
  }
};

// 打开日志弹窗
const viewTaskLog = (task: TaskStatusResponse) => {
  currentLogTask.value = task;
  logContent.value = '';
  logLoading.value = true;
  logModalVisible.value = true;
  fetchLog(task.id).finally(() => { logLoading.value = false; });

  // running 状态下轮询
  if (task.status === 'running' || task.status === 'pending') {
    logPollTimer = setInterval(() => {
      fetchLog(task.id);
      fetchTasks().then(() => {
        const updated = tasks.value.find(t => t.id === task.id);
        if (updated) {
          currentLogTask.value = updated;
          if (updated.status !== 'running' && updated.status !== 'pending') {
            stopLogPoll();
          }
        }
      });
    }, 3000);
  }
};

const stopLogPoll = () => {
  if (logPollTimer) { clearInterval(logPollTimer); logPollTimer = null; }
};

// 弹窗关闭时停止轮询
watch(logModalVisible, (visible) => { if (!visible) stopLogPoll(); });

// 是否有运行中的任务
const hasRunningTasks = computed(() =>
  tasks.value.some((t) => t.status === 'running' || t.status === 'pending'),
);

const startAutoRefresh = () => {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    if (hasRunningTasks.value) fetchTasks();
  }, 10000);
};

const stopAutoRefresh = () => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
};

onMounted(() => { fetchTasks(); startAutoRefresh(); });
onActivated(() => { fetchTasks(); });
onUnmounted(() => { stopAutoRefresh(); stopLogPoll(); });
</script>

<template>
  <Page auto-content-height class="task-center">
    <div class="header">
      <h1 class="title">
        <Icon icon="mdi:clipboard-list-outline" class="title-icon" />
        任务中心
      </h1>
      <Space>
        <Button v-if="selectedRowKeys.length > 0" danger @click="handleBatchDelete">
          <Icon icon="mdi:delete-outline" />
          删除选中 ({{ selectedRowKeys.length }})
        </Button>
        <Select v-model:value="statusFilter" placeholder="筛选状态" allow-clear style="width: 140px" @change="handleStatusChange">
          <Select.Option value="pending">等待中</Select.Option>
          <Select.Option value="running">运行中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="failed">失败</Select.Option>
        </Select>
        <Button @click="handleRefresh">
          <Icon icon="mdi:refresh" /> 刷新
        </Button>
      </Space>
    </div>

    <div class="content">
      <Table
        :columns="columns" :data-source="tasks" :loading="loading"
        :pagination="{ current: page, pageSize, total, showSizeChanger: true, showQuickJumper: true, showTotal: (t: number) => `共 ${t} 条` }"
        :row-selection="rowSelection" :scroll="{ x: 1100 }" row-key="id" size="middle" @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task_name'">
            <a class="task-name-link" @click="goToTaskDetail(record as TaskStatusResponse)">
              {{ record.task_name || `任务 #${record.id}` }}
            </a>
          </template>
          <template v-else-if="column.key === 'tool_name'">
            <Tag color="blue">{{ record.tool_name || '未知工具' }}</Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Badge :status="statusConfig[record.status]?.color as any" :text="statusConfig[record.status]?.text" />
          </template>
          <template v-else-if="column.key === 'progress'">
            <Progress v-if="record.status === 'running'" :percent="record.progress" size="small" status="active" />
            <Progress v-else-if="record.status === 'completed'" :percent="100" size="small" status="success" />
            <Progress v-else-if="record.status === 'failed'" :percent="record.progress || 0" size="small" status="exception" />
            <span v-else class="text-gray-400">-</span>
          </template>
          <template v-else-if="column.key === 'created_at'">{{ formatTime(record.created_at) }}</template>
          <template v-else-if="column.key === 'completed_at'">{{ formatTime(record.completed_at) }}</template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Tooltip title="查看结果">
                <Button type="link" size="small" :disabled="record.status !== 'completed'" @click="viewTask(record as TaskStatusResponse)">
                  <Icon icon="mdi:eye-outline" style="font-size: 18px" />
                </Button>
              </Tooltip>
              <Tooltip title="查看日志">
                <Button type="link" size="small" @click="viewTaskLog(record as TaskStatusResponse)">
                  <Icon icon="mdi:file-document-outline" style="font-size: 18px" />
                </Button>
              </Tooltip>
              <Popconfirm title="确定要删除此任务吗？" ok-text="删除" cancel-text="取消" @confirm="handleDelete(record as TaskStatusResponse)">
                <Tooltip title="删除">
                  <Button type="link" size="small" danger>
                    <Icon icon="mdi:delete-outline" style="font-size: 18px" />
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </div>

    <!-- 日志抽屉 -->
    <Drawer
      v-model:visible="logModalVisible"
      :title="`任务日志 - ${currentLogTask?.task_name || '任务 #' + currentLogTask?.id}`"
      placement="right" width="600" :body-style="{ padding: '16px', display: 'flex', flexDirection: 'column' }"
    >
      <div class="log-status-bar">
        <Badge v-if="currentLogTask" :status="statusConfig[currentLogTask.status]?.color as any" :text="statusConfig[currentLogTask.status]?.text" />
        <span v-if="currentLogTask?.status === 'running'" class="log-live-badge">
          <span class="live-dot" /> 实时日志
        </span>
      </div>

      <div ref="logContainerRef" class="log-terminal">
        <div v-if="logLoading" class="log-loading">
          <Icon icon="mdi:loading" class="loading-icon" />
          <span>正在加载日志...</span>
        </div>
        <pre v-else class="log-pre">{{ logContent || '暂无日志输出' }}</pre>
      </div>

      <div class="log-meta">
        <span><strong>创建：</strong>{{ formatTime(currentLogTask?.created_at ?? null) }}</span>
        <span v-if="currentLogTask?.started_at"><strong>开始：</strong>{{ formatTime(currentLogTask?.started_at) }}</span>
        <span v-if="currentLogTask?.completed_at"><strong>完成：</strong>{{ formatTime(currentLogTask?.completed_at) }}</span>
      </div>
    </Drawer>
  </Page>
</template>

<style scoped>
.task-center { padding: 24px; background: #f5f7fa; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.title { display: flex; gap: 12px; align-items: center; margin: 0; font-size: 24px; font-weight: 600; color: #1f2937; }
.title-icon { font-size: 28px; color: var(--primary-color); }
.content { padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 10%); }

.task-name-link {
  display: inline-block; max-width: 200px; overflow: hidden;
  font-weight: 500; color: var(--primary-color); text-overflow: ellipsis; white-space: nowrap; cursor: pointer;
}
.task-name-link:hover { text-decoration: underline; }

/* ========== 日志弹窗 ========== */
.log-status-bar { display: flex; gap: 16px; align-items: center; margin-bottom: 12px; }

.log-live-badge {
  display: inline-flex; gap: 6px; align-items: center; padding: 2px 10px;
  font-size: 12px; font-weight: 500; color: #16a34a; background: #f0fdf4; border-radius: 12px;
}

.live-dot {
  display: inline-block; width: 6px; height: 6px;
  background: #16a34a; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.log-terminal {
  flex: 1; min-height: 200px; overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace; background: #1e1e2e; border-radius: 8px;
}

.log-loading {
  display: flex; gap: 12px; align-items: center; justify-content: center; padding: 40px; color: #94a3b8;
}

.loading-icon { font-size: 20px; color: #94a3b8; animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.log-pre {
  padding: 16px; margin: 0; font-size: 13px; line-height: 1.7;
  color: #cdd6f4; white-space: pre-wrap; word-break: break-word;
}

.log-meta {
  display: flex; gap: 24px; padding: 10px 0 0; margin-top: 12px;
  font-size: 12px; color: #6b7280; border-top: 1px solid #f0f0f0;
}
</style>
