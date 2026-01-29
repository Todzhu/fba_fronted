<script lang="ts" setup>
/**
 * 任务中心 - 查看和管理所有分析任务
 */
import type { TaskStatusResponse } from '#/api/analysis-tools';

import { computed, onActivated, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Badge,
  Button,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import { deleteTask, deleteTasksBatch, getTaskList, updateTaskName } from '#/api/analysis-tools';

const router = useRouter();

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
  {
    title: '任务名称',
    dataIndex: 'task_name',
    key: 'task_name',
    ellipsis: true,
    width: 200,
  },
  {
    title: '工具',
    dataIndex: 'tool_name',
    key: 'tool_name',
    width: 150,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: '进度',
    dataIndex: 'progress',
    key: 'progress',
    width: 150,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
  },
  {
    title: '完成时间',
    dataIndex: 'completed_at',
    key: 'completed_at',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right' as const,
  },
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
    query: { 
      task_id: String(task.id),
      task_name: task.task_name || undefined,
    },
  });
};

// 删除单个任务
const handleDelete = async (task: TaskStatusResponse) => {
  try {
    await deleteTask(task.id);
    message.success('删除成功');
    fetchTasks();
  } catch (error) {
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
      } catch (error) {
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
const handleRefresh = () => {
  fetchTasks();
};

// 更新任务名称
const handleTaskNameChange = async (taskId: number, newName: string) => {
  if (!newName.trim()) {
    message.warning('任务名称不能为空');
    return;
  }
  try {
    await updateTaskName(taskId, newName.trim());
    message.success('名称已更新');
    // 更新本地数据
    const task = tasks.value.find(t => t.id === taskId);
    if (task) {
      task.task_name = newName.trim();
    }
  } catch {
    message.error('更新失败');
  }
};

// 日志弹窗
const logModalVisible = ref(false);
const currentLogTask = ref<TaskStatusResponse | null>(null);

const viewTaskLog = (task: TaskStatusResponse) => {
  currentLogTask.value = task;
  logModalVisible.value = true;
};

// 是否有运行中的任务
const hasRunningTasks = computed(() =>
  tasks.value.some((t) => t.status === 'running' || t.status === 'pending'),
);

// 启动自动刷新
const startAutoRefresh = () => {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    if (hasRunningTasks.value) {
      fetchTasks();
    }
  }, 10000);
};

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

onMounted(() => {
  fetchTasks();
  startAutoRefresh();
});

// keep-alive 缓存页面再次激活时刷新数据
onActivated(() => {
  fetchTasks();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <Page auto-content-height class="task-center">
    <div class="header">
      <h1 class="title">
        <Icon icon="mdi:clipboard-list-outline" class="title-icon" />
        任务中心
      </h1>
      <Space>
        <Button
          v-if="selectedRowKeys.length > 0"
          danger
          @click="handleBatchDelete"
        >
          <Icon icon="mdi:delete-outline" />
          删除选中 ({{ selectedRowKeys.length }})
        </Button>
        <Select
          v-model:value="statusFilter"
          placeholder="筛选状态"
          allow-clear
          style="width: 140px"
          @change="handleStatusChange"
        >
          <Select.Option value="pending">等待中</Select.Option>
          <Select.Option value="running">运行中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="failed">失败</Select.Option>
        </Select>
        <Button @click="handleRefresh">
          <Icon icon="mdi:refresh" />
          刷新
        </Button>
      </Space>
    </div>

    <div class="content">
      <Table
        :columns="columns"
        :data-source="tasks"
        :loading="loading"
        :pagination="{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t: number) => `共 ${t} 条`,
        }"
        :row-selection="rowSelection"
        :scroll="{ x: 1100 }"
        row-key="id"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task_name'">
            <Typography.Text
              :content="record.task_name || `任务 #${record.id}`"
              :editable="{ onChange: (val: string) => handleTaskNameChange(record.id, val) }"
              class="task-name"
            />
          </template>

          <template v-else-if="column.key === 'tool_name'">
            <Tag color="blue">{{ record.tool_name || '未知工具' }}</Tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <Badge
              :status="statusConfig[record.status]?.color as any"
              :text="statusConfig[record.status]?.text"
            />
          </template>

          <template v-else-if="column.key === 'progress'">
            <Progress
              v-if="record.status === 'running'"
              :percent="record.progress"
              size="small"
              status="active"
            />
            <Progress
              v-else-if="record.status === 'completed'"
              :percent="100"
              size="small"
              status="success"
            />
            <Progress
              v-else-if="record.status === 'failed'"
              :percent="record.progress || 0"
              size="small"
              status="exception"
            />
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'completed_at'">
            {{ formatTime(record.completed_at) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <Space>
              <Tooltip title="查看结果">
                <Button
                  type="link"
                  size="small"
                  :disabled="record.status !== 'completed'"
                  @click="viewTask(record as TaskStatusResponse)"
                >
                  <Icon icon="mdi:eye-outline" style="font-size: 18px" />
                </Button>
              </Tooltip>
              <Tooltip title="查看日志">
                <Button
                  type="link"
                  size="small"
                  @click="viewTaskLog(record as TaskStatusResponse)"
                >
                  <Icon icon="mdi:file-document-outline" style="font-size: 18px" />
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除此任务吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete(record as TaskStatusResponse)"
              >
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

    <!-- 日志弹窗 -->
    <Modal
      v-model:visible="logModalVisible"
      :title="`任务日志 - ${currentLogTask?.task_name || '任务 #' + currentLogTask?.id}`"
      :footer="null"
      width="700px"
    >
      <div class="log-content">
        <div v-if="currentLogTask?.status === 'failed'" class="log-error">
          <div class="log-label">错误信息：</div>
          <pre class="log-text">{{ currentLogTask?.error_message || '无错误信息' }}</pre>
        </div>
        <div v-else-if="currentLogTask?.status === 'completed'" class="log-success">
          <Icon icon="mdi:check-circle" class="success-icon" />
          <span>任务执行成功</span>
        </div>
        <div v-else-if="currentLogTask?.status === 'running'" class="log-running">
          <Icon icon="mdi:loading" class="loading-icon" />
          <span>任务正在运行中...</span>
        </div>
        <div v-else class="log-pending">
          <Icon icon="mdi:clock-outline" class="pending-icon" />
          <span>任务等待执行</span>
        </div>
        <div class="log-meta">
          <p><strong>创建时间：</strong>{{ formatTime(currentLogTask?.created_at ?? null) }}</p>
          <p v-if="currentLogTask?.started_at"><strong>开始时间：</strong>{{ formatTime(currentLogTask?.started_at) }}</p>
          <p v-if="currentLogTask?.completed_at"><strong>完成时间：</strong>{{ formatTime(currentLogTask?.completed_at) }}</p>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.task-center {
  padding: 24px;
  background: #f5f7fa;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.title {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.title-icon {
  font-size: 28px;
  color: var(--primary-color);
}

.content {
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.task-name {
  font-weight: 500;
  color: #374151;
}

/* 日志弹窗样式 */
.log-content {
  padding: 8px;
}

.log-label {
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
}

.log-text {
  max-height: 400px;
  padding: 16px;
  overflow-y: auto;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #dc2626;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.log-success,
.log-running,
.log-pending {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 24px;
  font-size: 16px;
}

.log-success {
  color: #16a34a;
  background: #f0fdf4;
  border-radius: 8px;
}

.log-running {
  color: #2563eb;
  background: #eff6ff;
  border-radius: 8px;
}

.log-pending {
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}

.success-icon {
  font-size: 24px;
  color: #16a34a;
}

.loading-icon {
  font-size: 24px;
  color: #2563eb;
  animation: spin 1s linear infinite;
}

.pending-icon {
  font-size: 24px;
  color: #6b7280;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.log-meta {
  padding: 16px;
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}

.log-meta p {
  margin: 4px 0;
}
</style>

