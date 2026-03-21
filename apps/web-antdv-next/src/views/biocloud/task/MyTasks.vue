<script setup lang="ts">
import type { TaskItem } from '#/api/myTasks';
import type { Pipeline } from '#/views/biocloud/pipeline/types/pipeline';

// 我的任务页面 - 任务管理（含云工具任务 + 流程分析任务）
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  Microscope,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
  ExternalLink,
  FolderOpen,
} from 'lucide-vue-next';

import {
  batchDeleteTasks,
  deleteTask,
  getMyTasks,
  getTaskLog,
  updateTaskName,
} from '#/api/myTasks';

import { deletePipeline, getPipelines } from '#/api/pipeline';
import { STEP_LABELS } from '#/views/biocloud/pipeline/types/pipeline';

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
const pageSize = 10;

// Tab 切换
const activeTab = ref<'pipeline' | 'tools'>('tools');

const tabs = [
  { key: 'tools' as const, label: '云工具任务', icon: Search },
  { key: 'pipeline' as const, label: '流程分析任务', icon: Microscope },
];

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
  // 跳转到任务详情页（结果文件浏览器）
  router.push({ name: 'TaskDetail', params: { taskId: String(task.id) } });
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

// 查看日志抽屉
const showLogDrawer = ref(false);
const logTask = ref<null | TaskItem>(null);
const logContent = ref('');
const logOffset = ref(0);
const logLoading = ref(false);
let logPollTimer: ReturnType<typeof setInterval> | null = null;
const logContainerRef = ref<HTMLElement | null>(null);

// 打开日志抽屉
const handleViewLog = async (task: TaskItem) => {
  logTask.value = task;
  logContent.value = '';
  logOffset.value = 0;
  showLogDrawer.value = true;
  await fetchTaskLog(task.id, true);
  startLogPolling(task);
};

// 获取任务日志
const fetchTaskLog = async (taskId: number, fullRefresh = false) => {
  logLoading.value = true;
  try {
    const offset = fullRefresh ? 0 : logOffset.value;
    const res = await getTaskLog(taskId, offset);
    if (fullRefresh) {
      logContent.value = res.content;
    } else if (res.content) {
      logContent.value += res.content;
    }
    logOffset.value = res.offset;
    // 更新任务状态
    if (logTask.value && res.status) {
      logTask.value = { ...logTask.value, status: res.status as TaskItem['status'] };
    }
    // 自动滚动到底部
    nextTick(() => {
      if (logContainerRef.value) {
        logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
      }
    });
    // 任务完成/失败时停止轮询
    if (res.status === 'completed' || res.status === 'failed') {
      stopLogPolling();
    }
  } catch (error) {
    console.error('获取日志失败:', error);
  } finally {
    logLoading.value = false;
  }
};

// 启动日志轮询
const startLogPolling = (task: TaskItem) => {
  stopLogPolling();
  if (task.status === 'running' || task.status === 'pending') {
    logPollTimer = setInterval(() => {
      if (logTask.value) {
        fetchTaskLog(logTask.value.id);
      }
    }, 3000);
  }
};

// 停止日志轮询
const stopLogPolling = () => {
  if (logPollTimer) {
    clearInterval(logPollTimer);
    logPollTimer = null;
  }
};

// 关闭抽屉时停止轮询
watch(showLogDrawer, (val) => {
  if (!val) stopLogPolling();
});

onBeforeUnmount(() => {
  stopLogPolling();
});


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

// ========== 流程分析任务 ==========
const myPipelines = ref<Pipeline[]>([]);
const loadingPipelines = ref(false);
const deletingPipelineId = ref<null | string>(null);

const loadMyPipelines = async () => {
  loadingPipelines.value = true;
  try {
    myPipelines.value = await getPipelines();
  } finally {
    loadingPipelines.value = false;
  }
};

const handleDeletePipeline = async (id: string) => {
  deletingPipelineId.value = id;
  try {
    await deletePipeline(id);
    await loadMyPipelines();
  } finally {
    deletingPipelineId.value = null;
  }
};

const getCompletedSteps = (p: Pipeline): number => {
  return p.steps.filter((s) => s.status === 'completed').length;
};

const isAllCompleted = (p: Pipeline): boolean => {
  return getCompletedSteps(p) === p.steps.length;
};



const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
};

onMounted(() => {
  fetchTasks();
  loadMyPipelines();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Compact Banner Header -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
      <div class="flex items-center justify-between rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] px-6 py-4">
        <div class="flex items-center gap-5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner ring-1 ring-black/5">
            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          </div>
          <div class="flex flex-col justify-center">
            <h1 class="text-lg font-bold tracking-tight text-slate-900">我的任务</h1>
            <p class="mt-0.5 text-[13px] font-medium text-slate-500">
              查看和管理您提交的分析任务，追踪任务执行状态。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 统一任务面板（工具与流程合流） ========== -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 工具栏 -->
      <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <!-- 搜索 -->
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

        <!-- 状态筛选 -->
        <div class="flex items-center gap-2">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            @click="selectedStatus = option.value"
            class="rounded-lg border px-4 py-2 text-sm font-medium transition-all"
            :class="
              selectedStatus === option.value
                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            "
          >
            {{ option.label }}
          </button>
        </div>

        <!-- 操作按钮 -->
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

      <!-- Task List -->
      <div v-else class="space-y-3">
        <!-- List Header -->
        <div class="grid grid-cols-12 gap-4 px-6 py-2 text-sm font-medium text-slate-500">
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
          <div class="col-span-2">分析工具</div>
          <div class="col-span-2">任务状态</div>
          <div class="col-span-2">创建时间</div>
          <div class="col-span-1 text-right">操作</div>
        </div>

        <!-- List Body -->
        <!-- 1. 流程分析任务卡片 (置顶) -->
        <div
          v-for="p in myPipelines.filter(mp => !searchQuery.trim() || mp.name.toLowerCase().includes(searchQuery.toLowerCase()))"
          :key="'pipe-' + p.id"
          class="group relative grid grid-cols-12 items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
          <!-- 左翼：专属身份徽章（替换掉了空白的勾选位） -->
          <div class="col-span-1 border-r border-slate-100 py-2 flex items-center justify-center h-full pr-1.5 pl-0.5">
             <span class="flex h-6 items-center justify-center rounded bg-indigo-50/80 px-2 text-[11px] font-bold tracking-widest text-indigo-500 shadow-sm border border-indigo-100/50 cursor-default" title="大型组合分析流程（不可独立勾选删除）">
               流程
             </span>
          </div>

          <!-- Task Name -->
          <div class="col-span-4 pl-4">
            <div class="flex items-center gap-3">
              <!-- 图标使用翡翠绿与普通蓝色工具区分，但不改行背景以保统一 -->
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 transition-colors group-hover:bg-emerald-100">
                <Microscope class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div 
                  class="group/name flex cursor-pointer items-center gap-1.5"
                  @click="router.push(`/pipeline/${p.id}`)"
                  title="点击查看多组学流程结果"
                >
                  <p class="truncate text-[15px] font-semibold text-slate-800 transition-colors group-hover/name:text-blue-600">
                    {{ p.name }}
                  </p>
                  <ExternalLink class="h-3.5 w-3.5 text-slate-300 transition-colors group-hover/name:text-blue-500" />
                </div>
                <p class="mt-1 truncate text-xs text-slate-400 font-mono">
                  ID: {{ p.id.split('-').pop() || p.id }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tool Name -->
          <div class="col-span-2 flex items-center">
            <span class="truncate text-slate-600">
              单细胞转录组分析流程
            </span>
          </div>

          <!-- Status -->
          <div class="col-span-2 flex flex-col justify-center">
            <!-- 已完成 -> 显示简约标签 -->
            <div v-if="isAllCompleted(p)" class="flex items-center gap-1.5 w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">
               <CheckCircle class="h-3.5 w-3.5" />
               <span class="text-[12px] font-medium">已完成</span>
            </div>
            
            <!-- 运行中 -> 直接显示原生点状进度 -->
            <div v-else class="flex flex-col justify-center">
               <!-- 经典的步骤圆点重制版 -->
               <div class="flex items-center gap-1 sm:flex pl-1">
                  <div
                    v-for="(step, idx) in p.steps"
                    :key="idx"
                    class="group/dot relative"
                  >
                    <div
                      class="h-2 w-2 rounded-full transition-colors"
                      :class="{
                        'bg-emerald-500': step.status === 'completed',
                        'bg-blue-500 animate-pulse': step.status === 'running',
                        'bg-slate-200': step.status === 'pending',
                        'bg-red-500': step.status === 'error',
                      }"
                    ></div>
                    <!-- Tooltip -->
                    <div
                      class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover/dot:opacity-100 shadow-lg"
                    >
                      {{ STEP_LABELS?.[step.stepType] || step.stepType || '步骤' }}
                      <div class="absolute left-1/2 top-full -translate-x-1/2 border-[3px] border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <!-- Created Time -->
          <div class="col-span-2 flex items-center text-sm text-slate-500">
            {{ formatDateTime(p.updatedAt) }}
          </div>

          <!-- Actions -->
          <div class="col-span-1 flex items-center justify-end gap-1.5" @click.stop>
            <button
               v-if="!isAllCompleted(p)"
              @click="router.push(`/pipeline/${p.id}`)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:text-white hover:shadow-md"
              title="继续流程"
            >
              <Play class="h-4 w-4" />
            </button>
            <button
               v-else
              @click="router.push(`/pipeline/${p.id}`)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-white hover:shadow-md"
              title="查看结果"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              @click.stop="handleDeletePipeline(p.id)"
              :disabled="deletingPipelineId === p.id"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-500 hover:text-white hover:shadow-md disabled:opacity-50"
              title="删除任务"
            >
              <Loader2 v-if="deletingPipelineId === p.id" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- 2. 单点云工具分析任务卡片 -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="group relative grid grid-cols-12 items-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
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
                <div 
                  @click="goToTaskResult(task)"
                  class="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 transition-all hover:bg-blue-50/50"
                  title="点击查看分析报告及结果"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover/name:bg-blue-100 group-hover/name:text-blue-700 transition-colors">
                    <FolderOpen class="h-4 w-4" />
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <p class="truncate font-semibold text-slate-800 transition-colors group-hover/name:text-blue-600">
                        {{ task.task_name || `任务 #${task.id}` }}
                      </p>
                      <ExternalLink class="h-3.5 w-3.5 text-slate-300 transition-colors group-hover/name:text-blue-500" />
                    </div>
                  </div>
                </div>
                <button
                  @click.stop="startEditTaskName(task)"
                  class="ml-1 rounded p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-blue-600 group-hover/name:opacity-100"
                  title="编辑名称"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
              </div>
              <p class="mt-1 truncate text-xs text-slate-400 font-mono ml-10">ID: {{ task.id }}</p>
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
            class="col-span-1 flex items-center justify-end gap-1.5"
            @click.stop
          >
            <button
              @click="router.push(`/tool/${task.tool_id}?task_id=${task.id}`)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shadow-sm transition-all shadow-blue-500/10 hover:-translate-y-0.5 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-500/25"
              title="查看配置与结果"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              @click="handleViewLog(task)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 shadow-sm transition-all shadow-indigo-500/10 hover:-translate-y-0.5 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-500/25"
              title="查看执行日志"
            >
              <FileText class="h-4 w-4" />
            </button>
            <button
              @click="handleDelete(task)"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-500 hover:text-white hover:shadow-md"
              title="删除任务"
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

    <!-- 日志抽屉 -->
    <div
      v-if="showLogDrawer"
      class="fixed inset-0 z-50 flex"
    >
      <!-- 遮罩层 -->
      <div
        class="absolute inset-0 bg-black/40 transition-opacity"
        @click="showLogDrawer = false"
      ></div>

      <!-- 抽屉内容 -->
      <div
        class="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        style="animation: slideInRight 0.25s ease-out"
      >
        <!-- 抽屉头部 -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
              <FileText class="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900">运行日志</h3>
              <p class="text-sm text-slate-500">
                {{ logTask?.task_name || `任务 #${logTask?.id}` }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 状态标签 -->
            <div
              v-if="logTask"
              class="flex items-center gap-1.5 rounded-full px-3 py-1"
              :class="getStatusConfig(logTask.status).bg"
            >
              <component
                :is="getStatusConfig(logTask.status).icon"
                class="h-3.5 w-3.5"
                :class="[
                  getStatusConfig(logTask.status).color,
                  logTask.status === 'running' ? 'animate-spin' : '',
                ]"
              />
              <span class="text-xs font-medium" :class="getStatusConfig(logTask.status).color">
                {{ getStatusConfig(logTask.status).label }}
              </span>
            </div>
            <button
              @click="showLogDrawer = false"
              class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- 任务信息概览 -->
        <div v-if="logTask" class="border-b border-slate-100 px-6 py-3">
          <div class="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span class="text-slate-400">工具</span>
              <p class="mt-0.5 font-medium text-slate-700">{{ logTask.tool_name || '-' }}</p>
            </div>
            <div>
              <span class="text-slate-400">开始时间</span>
              <p class="mt-0.5 font-medium text-slate-700">{{ logTask.started_at ? formatDateTime(logTask.started_at) : '-' }}</p>
            </div>
            <div>
              <span class="text-slate-400">完成时间</span>
              <p class="mt-0.5 font-medium text-slate-700">{{ logTask.completed_at ? formatDateTime(logTask.completed_at) : '-' }}</p>
            </div>
          </div>
        </div>

        <!-- 终端风格日志区域 -->
        <div class="flex-1 overflow-hidden bg-[#1e1e2e] p-1">
          <div
            ref="logContainerRef"
            class="h-full overflow-auto rounded-lg p-4 font-mono text-sm leading-relaxed"
          >
            <!-- 加载中 -->
            <div v-if="logLoading && !logContent" class="flex items-center gap-2 text-slate-400">
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>正在加载日志...</span>
            </div>
            <!-- 无日志 -->
            <div v-else-if="!logContent" class="text-slate-500">
              暂无日志输出
              <span v-if="logTask?.status === 'pending'">，任务等待执行中...</span>
            </div>
            <!-- 日志内容 -->
            <pre v-else class="whitespace-pre-wrap break-words text-green-400">{{ logContent }}</pre>
            <!-- 运行中闪烁光标 -->
            <span
              v-if="logTask?.status === 'running'"
              class="inline-block h-4 w-2 animate-pulse bg-green-400"
            ></span>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="flex items-center justify-between border-t border-slate-200 px-6 py-3">
          <div class="text-xs text-slate-400">
            <span v-if="logTask?.status === 'running'">
              <Loader2 class="mr-1 inline h-3 w-3 animate-spin" />
              实时更新中（每 3 秒刷新）
            </span>
            <span v-else-if="logTask?.status === 'completed'">✅ 任务已完成</span>
            <span v-else-if="logTask?.status === 'failed'">❌ 任务失败</span>
          </div>
          <button
            @click="showLogDrawer = false"
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

/* 抽屉滑入动画 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* 终端日志区域自定义滚动条 */
.font-mono::-webkit-scrollbar {
  width: 6px;
}
.font-mono::-webkit-scrollbar-track {
  background: transparent;
}
.font-mono::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}
</style>
