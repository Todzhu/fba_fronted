<script setup lang="ts">
import type { TaskItem } from '#/api/myTasks';

// 我的任务页面 - 任务管理
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next';

import {
  batchDeleteTasks,
  deleteTask,
  getMyTasks,
  updateTaskName,
} from '#/api/myTasks';

// ========== State ==========
const router = useRouter();
const loading = ref(false);
const loadingText = ref('');
const searchQuery = ref('');
const selectedStatus = ref<string>('all');
const selectedTasks = ref<number[]>([]);
const tasks = ref<TaskItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;

// ========== 状态配置 ==========
const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'pending', label: '等待中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

const getStatusConfig = (status: string) => {
  const configs: Record<
    string,
    { bg: string; color: string; icon: typeof CheckCircle; label: string }
  > = {
    completed: {
      bg: 'bg-green-100',
      color: 'text-green-600',
      icon: CheckCircle,
      label: '已完成',
    },
    failed: {
      bg: 'bg-red-100',
      color: 'text-red-600',
      icon: AlertCircle,
      label: '失败',
    },
    pending: {
      bg: 'bg-slate-100',
      color: 'text-slate-600',
      icon: Clock,
      label: '等待中',
    },
    running: {
      bg: 'bg-blue-100',
      color: 'text-blue-600',
      icon: Play,
      label: '运行中',
    },
  };
  return (
    configs[status] || {
      bg: 'bg-slate-100',
      color: 'text-slate-600',
      icon: Clock,
      label: status,
    }
  );
};

// ========== Helpers ==========
const formatDateTime = (dateStr: null | string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ========== API Methods ==========
const fetchTasks = async () => {
  loading.value = true;
  loadingText.value = '正在加载任务列表...';
  try {
    const res = await getMyTasks({
      page: currentPage.value,
      page_size: pageSize,
      status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
    });
    tasks.value = res.items;
    total.value = res.total;
  } catch (error) {
    console.error('获取任务列表失败:', error);
    tasks.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
};

// ========== Computed ==========
const filteredTasks = computed(() => {
  if (!searchQuery.value.trim()) return tasks.value;
  const query = searchQuery.value.toLowerCase();
  return tasks.value.filter(
    (task) =>
      task.task_name?.toLowerCase().includes(query) ||
      task.tool_name?.toLowerCase().includes(query),
  );
});

const totalPages = computed(() => Math.ceil(total.value / pageSize));

// ========== Selection ==========
const toggleSelect = (id: number) => {
  const index = selectedTasks.value.indexOf(id);
  if (index === -1) {
    selectedTasks.value.push(id);
  } else {
    selectedTasks.value.splice(index, 1);
  }
};

const toggleSelectAll = () => {
  selectedTasks.value =
    selectedTasks.value.length === filteredTasks.value.length
      ? []
      : filteredTasks.value.map((t) => t.id);
};

// ========== Navigation ==========
const goToTaskResult = (task: TaskItem) => {
  // 跳转到工具详情页，带上任务 ID
  router.push({
    path: `/tool/${task.tool_id}`,
    query: { task_id: task.id, task_name: task.task_name },
  });
};

// ========== Delete ==========
const showDeleteModal = ref(false);
const deleteTarget = ref<null | { ids: number[]; type: 'batch' | 'single' }>(
  null,
);

const handleDelete = (task: TaskItem) => {
  deleteTarget.value = { ids: [task.id], type: 'single' };
  showDeleteModal.value = true;
};

const handleBatchDelete = () => {
  if (selectedTasks.value.length === 0) return;
  deleteTarget.value = { ids: [...selectedTasks.value], type: 'batch' };
  showDeleteModal.value = true;
};

// 查看日志
const showLogModal = ref(false);
const logTask = ref<null | TaskItem>(null);

const handleViewLog = (task: TaskItem) => {
  logTask.value = task;
  showLogModal.value = true;
};

// 提取任务UUID
const getTaskUUID = (outputDir: null | string) => {
  if (!outputDir) return '-';
  // 将反斜杠转换为正斜杠，然后取最后一段
  return outputDir.split('\\').pop()?.split('/').pop() || outputDir;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;

  loading.value = true;
  loadingText.value = '正在删除...';
  showDeleteModal.value = false;

  try {
    await (deleteTarget.value.type === 'single'
      ? deleteTask(deleteTarget.value.ids[0]!)
      : batchDeleteTasks(deleteTarget.value.ids));
    selectedTasks.value = [];
    await fetchTasks();
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    loading.value = false;
    loadingText.value = '';
    deleteTarget.value = null;
  }
};

const deleteModalMessage = computed(() => {
  if (!deleteTarget.value) return '';
  if (deleteTarget.value.type === 'single') {
    const task = tasks.value.find((t) => t.id === deleteTarget.value!.ids[0]);
    return `确定要删除任务"${task?.task_name || task?.id}"吗？`;
  }
  return `确定要删除选中的 ${deleteTarget.value.ids.length} 个任务吗？`;
});

// ========== Edit Task Name ==========
const editingTaskId = ref<null | number>(null);
const editingTaskName = ref('');

const startEditTaskName = (task: TaskItem) => {
  editingTaskId.value = task.id;
  editingTaskName.value = task.task_name || `任务 #${task.id}`;
};

const cancelEditTaskName = () => {
  editingTaskId.value = null;
  editingTaskName.value = '';
};

const saveTaskName = async () => {
  if (!editingTaskId.value || !editingTaskName.value.trim()) return;

  try {
    await updateTaskName(editingTaskId.value, editingTaskName.value.trim());
    // 更新本地数据
    const task = tasks.value.find((t) => t.id === editingTaskId.value);
    if (task) {
      task.task_name = editingTaskName.value.trim();
    }
    cancelEditTaskName();
  } catch (error) {
    console.error('更新任务名称失败:', error);
  }
};

// ========== Watch ==========
watch([selectedStatus], () => {
  currentPage.value = 1;
  fetchTasks();
});

watch(currentPage, () => {
  fetchTasks();
});

onMounted(() => {
  fetchTasks();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header Section -->
    <div
      class="border-b border-slate-200 bg-white px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div class="mx-auto max-w-7xl">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">我的任务</h1>
        <p class="max-w-2xl text-slate-500">
          查看和管理您提交的分析任务，追踪任务执行状态。
        </p>

        <!-- Toolbar -->
        <div class="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <!-- Search -->
          <div class="relative max-w-md flex-1">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
            >
              <Search class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              class="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 leading-5 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
              placeholder="搜索任务名称..."
            />
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              @click="selectedStatus = option.value"
              class="rounded-full px-4 py-2 text-sm font-medium transition-all"
              :class="
                selectedStatus === option.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              "
            >
              {{ option.label }}
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              @click="fetchTasks"
              class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw class="h-4 w-4" />
              刷新
            </button>
            <button
              v-if="selectedTasks.length > 0"
              @click="handleBatchDelete"
              class="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              <Trash2 class="h-4 w-4" />
              删除 ({{ selectedTasks.length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        ></div>
        <p v-if="loadingText" class="mt-4 text-sm text-slate-500">
          {{ loadingText }}
        </p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTasks.length === 0" class="py-20 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
        >
          <Clock class="h-8 w-8 text-slate-400" />
        </div>
        <h3 class="text-lg font-medium text-slate-900">暂无任务</h3>
        <p class="mt-1 text-slate-500">运行分析工具后，任务将显示在这里</p>
      </div>

      <!-- Task Table -->
      <div
        v-else
        class="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <!-- Table Header -->
        <div
          class="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-medium text-slate-500"
        >
          <div class="col-span-1 flex items-center">
            <input
              type="checkbox"
              :checked="
                selectedTasks.length === filteredTasks.length &&
                filteredTasks.length > 0
              "
              @change="toggleSelectAll"
              class="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div class="col-span-4">任务名称</div>
          <div class="col-span-2">工具</div>
          <div class="col-span-2">状态</div>
          <div class="col-span-2">创建时间</div>
          <div class="col-span-1 text-right">操作</div>
        </div>

        <!-- Table Body -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="group grid grid-cols-12 gap-4 border-b border-slate-100 px-6 py-4 transition-colors last:border-b-0 hover:bg-slate-50"
        >
          <!-- Checkbox -->
          <div class="col-span-1 flex items-center" @click.stop>
            <input
              type="checkbox"
              :checked="selectedTasks.includes(task.id)"
              @change="toggleSelect(task.id)"
              class="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <!-- Task Name -->
          <div class="col-span-4 flex items-center gap-3" @click.stop>
            <div class="min-w-0 flex-1">
              <!-- 编辑模式 -->
              <div
                v-if="editingTaskId === task.id"
                class="flex items-center gap-2"
              >
                <input
                  v-model="editingTaskName"
                  type="text"
                  class="flex-1 rounded-lg border border-blue-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  @keyup.enter="saveTaskName"
                  @keyup.escape="cancelEditTaskName"
                  autofocus
                />
                <button
                  @click="saveTaskName"
                  class="rounded p-1 text-green-600 hover:bg-green-50"
                  title="保存"
                >
                  <CheckCircle class="h-4 w-4" />
                </button>
                <button
                  @click="cancelEditTaskName"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100"
                  title="取消"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <!-- 显示模式 -->
              <div v-else class="group/name flex items-center gap-2">
                <p
                  class="cursor-pointer truncate font-medium text-slate-900 hover:text-blue-600"
                  @click="goToTaskResult(task)"
                >
                  {{ task.task_name || `任务 #${task.id}` }}
                </p>
                <button
                  @click.stop="startEditTaskName(task)"
                  class="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-blue-600 group-hover/name:opacity-100"
                  title="编辑名称"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
              </div>
              <p class="truncate text-xs text-slate-400">ID: {{ task.id }}</p>
            </div>
          </div>

          <!-- Tool Name -->
          <div class="col-span-2 flex items-center">
            <span class="truncate text-slate-600">
              {{ task.tool_name || '-' }}
            </span>
          </div>

          <!-- Status -->
          <div class="col-span-2 flex items-center">
            <div
              class="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              :class="getStatusConfig(task.status).bg"
            >
              <component
                :is="getStatusConfig(task.status).icon"
                class="h-3.5 w-3.5"
                :class="[
                  getStatusConfig(task.status).color,
                  task.status === 'running' ? 'animate-spin' : '',
                ]"
              />
              <span
                class="text-xs font-medium"
                :class="getStatusConfig(task.status).color"
              >
                {{ getStatusConfig(task.status).label }}
              </span>
            </div>
          </div>

          <!-- Created Time -->
          <div class="col-span-2 flex items-center text-sm text-slate-500">
            {{ formatDateTime(task.created_at) }}
          </div>

          <!-- Actions -->
          <div
            class="col-span-1 flex items-center justify-end gap-1"
            @click.stop
          >
            <button
              @click="router.push(`/tool/${task.tool_id}?task_id=${task.id}`)"
              class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
              title="查看"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              @click="handleViewLog(task)"
              class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="日志"
            >
              <FileText class="h-4 w-4" />
            </button>
            <button
              @click="handleDelete(task)"
              class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="删除"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft class="h-4 w-4" />
            上一页
          </button>
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <span class="text-sm text-slate-500">
          第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 个任务
        </span>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showDeleteModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"
          >
            <Trash2 class="h-5 w-5 text-red-600" />
          </div>
          <h3 class="text-lg font-semibold text-slate-900">确认删除</h3>
        </div>
        <p class="mb-6 text-slate-600">{{ deleteModalMessage }}</p>
        <p class="mb-6 text-sm text-slate-500">
          此操作无法撤销，任务及其结果文件将被永久删除。
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="
              showDeleteModal = false;
              deleteTarget = null;
            "
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            @click="confirmDelete"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- Log Modal -->
    <div
      v-if="showLogModal && logTask"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showLogModal = false"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <FileText class="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900">任务日志</h3>
              <p class="text-sm text-slate-500">
                {{ logTask.task_name || `任务 #${logTask.id}` }}
              </p>
            </div>
          </div>
          <button
            @click="showLogModal = false"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Log Content -->
        <div class="space-y-4">
          <!-- Status Info -->
          <div class="rounded-lg bg-slate-50 p-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-slate-500">工具：</span>
                <span class="font-medium text-slate-900">{{
                  logTask.tool_name || '-'
                }}</span>
              </div>
              <div>
                <span class="text-slate-500">状态：</span>
                <span
                  class="font-medium"
                  :class="getStatusConfig(logTask.status).color"
                >
                  {{ getStatusConfig(logTask.status).label }}
                </span>
              </div>
              <div>
                <span class="text-slate-500">创建时间：</span>
                <span class="font-medium text-slate-900">{{
                  formatDateTime(logTask.created_at)
                }}</span>
              </div>
              <div>
                <span class="text-slate-500">开始时间：</span>
                <span class="font-medium text-slate-900">{{
                  logTask.started_at ? formatDateTime(logTask.started_at) : '-'
                }}</span>
              </div>
              <div class="col-span-2">
                <span class="text-slate-500">完成时间：</span>
                <span class="font-medium text-slate-900">{{
                  logTask.completed_at
                    ? formatDateTime(logTask.completed_at)
                    : '-'
                }}</span>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="logTask.error_message" class="rounded-lg bg-red-50 p-4">
            <div
              class="mb-2 flex items-center gap-2 text-sm font-medium text-red-700"
            >
              <AlertCircle class="h-4 w-4" />
              错误信息
            </div>
            <pre class="whitespace-pre-wrap break-words text-sm text-red-600">{{
              logTask.error_message
            }}</pre>
          </div>

          <!-- Task UUID -->
          <div v-if="logTask.output_dir" class="rounded-lg bg-blue-50 p-4">
            <div class="mb-2 text-sm font-medium text-blue-700">任务id</div>
            <code class="text-sm text-blue-600">{{
              getTaskUUID(logTask.output_dir)
            }}</code>
          </div>

          <!-- No Error -->
          <div
            v-if="!logTask.error_message && logTask.status === 'completed'"
            class="rounded-lg bg-green-50 p-4"
          >
            <div
              class="flex items-center gap-2 text-sm font-medium text-green-700"
            >
              <CheckCircle class="h-4 w-4" />
              任务已成功完成，无错误信息
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end">
          <button
            @click="showLogModal = false"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义 checkbox 样式 */
input[type='checkbox'] {
  accent-color: #2563eb;
}
</style>
