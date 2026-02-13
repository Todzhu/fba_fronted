<script setup lang="ts">
import type { StorageStatsData, UserFileItem } from '#/api/myData';

/**
 * 我的数据页面 - 文件管理
 * 集成 Mock 数据层、文件格式识别和存储统计面板
 */
import { computed, onMounted, ref, watch } from 'vue';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Grid3X3,
  List,
  Search,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-vue-next';

import {
  createFolder as apiCreateFolder,
  batchDelete,
  deleteFile,
  getDownloadUrl,
  getFiles,
  getStorageStats,
  uploadFile,
} from '#/api/myData';

import { detectFileFormat } from './utils/fileFormats';

// ========== Types ==========
interface FileItem {
  id: number;
  name: string;
  size: string;
  updateTime: string;
  type: 'file' | 'folder';
  fileType?:
    | 'archive'
    | 'code'
    | 'document'
    | 'excel'
    | 'image'
    | 'other'
    | 'pdf';
  parentId: null | number;
  rawSize?: number;
  // 格式识别增强
  formatLabel?: string;
  formatColor?: string;
}

// ========== State ==========
const loading = ref(false);
const loadingText = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('list');
const selectedFiles = ref<number[]>([]);
const currentFolderId = ref<null | number>(null);
const breadcrumbs = ref<{ id: null | number; name: string }[]>([
  { id: null, name: '我的数据' },
]);

// 分页状态
const currentPage = ref(1);
const pageSize = 10;
const total = ref(0);

// 文件列表
const allFiles = ref<FileItem[]>([]);

// 存储统计
const storageStats = ref<StorageStatsData>({
  file_count: 0,
  folder_count: 0,
  total_size: 0,
});
const statsLoading = ref(false);

// 拖拽上传
const isDragging = ref(false);

// ========== Helpers ==========
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const formatDateTime = (dateStr: null | string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 转换后端数据为前端格式
const transformFile = (file: UserFileItem): FileItem => {
  const formatInfo = file.type === 'file' ? detectFileFormat(file.name) : null;
  return {
    id: file.id,
    name: file.name,
    size: file.type === 'folder' ? '-' : formatFileSize(file.size),
    updateTime: formatDateTime(file.updated_time || file.created_time),
    type: file.type as 'file' | 'folder',
    parentId: file.parent_id,
    rawSize: file.size,
    formatLabel: formatInfo?.label,
    formatColor: formatInfo?.color,
  };
};

// ========== API Methods ==========
const fetchFiles = async () => {
  loading.value = true;
  loadingText.value = '正在加载文件列表...';
  try {
    const res = await getFiles({
      parent_id: currentFolderId.value ?? undefined,
      keyword: searchQuery.value.trim() || undefined,
      page: currentPage.value,
      page_size: pageSize,
    });
    allFiles.value = res.items.map((item) => transformFile(item));
    total.value = res.total;
  } catch (error) {
    console.error('获取文件列表失败:', error);
    allFiles.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
};

const fetchStorageStats = async () => {
  statsLoading.value = true;
  try {
    storageStats.value = await getStorageStats();
  } catch (error) {
    console.error('获取存储统计失败:', error);
  } finally {
    statsLoading.value = false;
  }
};

// ========== Computed ==========
const filteredFiles = computed(() => {
  let files = [...allFiles.value];
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(query));
  }
  return files.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return 0;
  });
});

const hasSelection = computed(() => selectedFiles.value.length > 0);
const totalPages = computed(() => Math.ceil(total.value / pageSize));

// ========== Methods ==========
const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') return Folder;
  // 使用格式识别的分类来映射图标
  switch (file.fileType) {
    case 'document': {
      return FileText;
    }
    case 'excel': {
      return FileSpreadsheet;
    }
    case 'image': {
      return Image;
    }
    case 'pdf': {
      return FileText;
    }
    default: {
      return File;
    }
  }
};

const getIconColor = (file: FileItem) => {
  if (file.type === 'folder') return 'text-blue-500';
  // 使用格式识别颜色
  if (file.formatColor) return '';
  switch (file.fileType) {
    case 'document': {
      return 'text-blue-400';
    }
    case 'excel': {
      return 'text-green-500';
    }
    case 'image': {
      return 'text-purple-500';
    }
    case 'pdf': {
      return 'text-red-500';
    }
    default: {
      return 'text-slate-400';
    }
  }
};

const toggleSelect = (fileId: number) => {
  const index = selectedFiles.value.indexOf(fileId);
  if (index === -1) {
    selectedFiles.value.push(fileId);
  } else {
    selectedFiles.value.splice(index, 1);
  }
};

const toggleSelectAll = () => {
  selectedFiles.value =
    selectedFiles.value.length === filteredFiles.value.length
      ? []
      : filteredFiles.value.map((f) => f.id);
};

const enterFolder = (folder: FileItem) => {
  if (folder.type !== 'folder') return;
  currentFolderId.value = folder.id;
  breadcrumbs.value.push({ id: folder.id, name: folder.name });
  selectedFiles.value = [];
  currentPage.value = 1;
  fetchFiles();
};

const navigateTo = (
  item: { id: null | number; name: string },
  index: number,
) => {
  currentFolderId.value = item.id;
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  selectedFiles.value = [];
  currentPage.value = 1;
  fetchFiles();
};

const goBack = () => {
  if (breadcrumbs.value.length > 1) {
    const parent = breadcrumbs.value[breadcrumbs.value.length - 2];
    navigateTo(parent!, breadcrumbs.value.length - 2);
  }
};

// 上传文件
const fileInputRef = ref<HTMLInputElement | null>(null);
const handleUpload = () => {
  fileInputRef.value?.click();
};

const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  await doUploadFiles(files);
  input.value = '';
};

// 拖拽上传处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await doUploadFiles(files);
  }
};

// 统一上传逻辑
const doUploadFiles = async (files: FileList) => {
  loading.value = true;
  loadingText.value = `正在上传 ${files.length} 个文件...`;
  try {
    for (const file of files) {
      await uploadFile(file, currentFolderId.value);
    }
    await fetchFiles();
    await fetchStorageStats();
  } catch (error) {
    console.error('上传失败:', error);
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
};

// 新建文件夹
const showNewFolderModal = ref(false);
const newFolderName = ref('');

const handleNewFolder = () => {
  newFolderName.value = '';
  showNewFolderModal.value = true;
};

const confirmNewFolder = async () => {
  if (!newFolderName.value.trim()) return;
  loading.value = true;
  loadingText.value = '正在创建文件夹...';
  try {
    await apiCreateFolder({
      name: newFolderName.value.trim(),
      parent_id: currentFolderId.value,
    });
    showNewFolderModal.value = false;
    await fetchFiles();
    await fetchStorageStats();
  } catch (error) {
    console.error('创建文件夹失败:', error);
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
};

// 下载文件
const handleDownload = (file: FileItem) => {
  if (file.type === 'folder') return;
  const url = getDownloadUrl(file.id);
  window.open(url, '_blank');
};

// 删除确认弹窗
const showDeleteModal = ref(false);
const deleteTarget = ref<null | { file?: FileItem; type: 'batch' | 'single' }>(
  null,
);

const handleDelete = (file: FileItem) => {
  deleteTarget.value = { type: 'single', file };
  showDeleteModal.value = true;
};

const handleBatchDelete = () => {
  if (selectedFiles.value.length === 0) return;
  deleteTarget.value = { type: 'batch' };
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  loading.value = true;
  loadingText.value = '正在删除...';
  showDeleteModal.value = false;
  try {
    if (deleteTarget.value.type === 'single' && deleteTarget.value.file) {
      await deleteFile(deleteTarget.value.file.id);
    } else if (deleteTarget.value.type === 'batch') {
      await batchDelete(selectedFiles.value);
      selectedFiles.value = [];
    }
    await fetchFiles();
    await fetchStorageStats();
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
  if (deleteTarget.value.type === 'single' && deleteTarget.value.file) {
    return `确定要删除"${deleteTarget.value.file.name}"吗？`;
  }
  return `确定要删除选中的 ${selectedFiles.value.length} 个项目吗？`;
});

// 监听分页变化
watch(currentPage, () => {
  fetchFiles();
});

onMounted(() => {
  fetchFiles();
  fetchStorageStats();
});
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 pb-20"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 拖拽上传遮罩 -->
    <div
      v-if="isDragging"
      class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-600/10 backdrop-blur-sm"
    >
      <div
        class="rounded-2xl border-4 border-dashed border-blue-400 bg-white/90 px-16 py-12 text-center shadow-2xl"
      >
        <Upload class="mx-auto mb-4 h-12 w-12 text-blue-500" />
        <p class="text-lg font-bold text-blue-700">松开鼠标上传文件</p>
        <p class="mt-1 text-sm text-blue-500">支持多种生信文件格式</p>
      </div>
    </div>

    <!-- Header Section -->
    <div
      class="border-b border-slate-200 bg-white px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div class="mx-auto max-w-7xl">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="mb-2 text-3xl font-bold text-slate-900">我的数据</h1>
            <p class="max-w-2xl text-slate-500">
              管理您的数据文件，支持上传、下载、预览和组织文件夹。
            </p>
          </div>

          <!-- 右上角存储用量 -->
          <div
            v-if="!statsLoading"
            class="group relative flex cursor-default items-center gap-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-3 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md"
          >
            <!-- 环形进度 SVG -->
            <div class="relative h-11 w-11 flex-shrink-0">
              <svg class="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                <!-- 背景环 -->
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#E2E8F0"
                  stroke-width="3.5"
                />
                <!-- 进度环 -->
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  :stroke="
                    storageStats.total_size / (50 * 1024 * 1024 * 1024) > 0.9
                      ? '#EF4444'
                      : storageStats.total_size / (50 * 1024 * 1024 * 1024) >
                          0.7
                        ? '#F59E0B'
                        : '#3B82F6'
                  "
                  :stroke-dasharray="`${Math.min(100, (storageStats.total_size / (50 * 1024 * 1024 * 1024)) * 100) * 1.131} 113.1`"
                  class="transition-all duration-700 ease-out"
                />
              </svg>
              <!-- 中心百分比 -->
              <span
                class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600"
              >
                {{
                  Math.round(
                    Math.min(
                      100,
                      (storageStats.total_size / (50 * 1024 * 1024 * 1024)) *
                        100,
                    ),
                  )
                }}%
              </span>
            </div>

            <!-- 文字信息 -->
            <div>
              <div class="flex items-baseline gap-1">
                <span class="text-sm font-bold text-slate-800">
                  {{ formatFileSize(storageStats.total_size) }}
                </span>
                <span class="text-xs text-slate-400">/ 50 GB</span>
              </div>
              <div
                class="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500"
              >
                <span class="flex items-center gap-1">
                  <span
                    class="inline-block h-1.5 w-1.5 rounded-full bg-blue-400"
                  ></span>
                  {{ storageStats.file_count }} 文件
                </span>
                <span class="flex items-center gap-1">
                  <span
                    class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                  ></span>
                  {{ storageStats.folder_count }} 文件夹
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Toolbar -->
        <div
          class="mt-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
        >
          <!-- 左侧：搜索 -->
          <div class="relative max-w-md flex-1">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
            >
              <Search class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索文件..."
              class="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
            >
              <XCircle class="h-4 w-4" />
            </button>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center gap-3">
            <!-- 视图切换 -->
            <div
              class="flex items-center overflow-hidden rounded-lg border border-slate-200"
            >
              <button
                @click="viewMode = 'list'"
                class="cursor-pointer p-2.5 transition-colors"
                :class="
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                "
              >
                <List class="h-5 w-5" />
              </button>
              <button
                @click="viewMode = 'grid'"
                class="cursor-pointer p-2.5 transition-colors"
                :class="
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                "
              >
                <Grid3X3 class="h-5 w-5" />
              </button>
            </div>

            <!-- 新建文件夹 -->
            <button
              @click="handleNewFolder"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <FolderPlus class="h-5 w-5" />
              新建文件夹
            </button>

            <!-- 上传 -->
            <button
              @click="handleUpload"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Upload class="h-5 w-5" />
              上传文件
            </button>

            <!-- 批量删除 -->
            <button
              v-if="hasSelection"
              @click="handleBatchDelete"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-600"
            >
              <Trash2 class="h-5 w-5" />
              删除 ({{ selectedFiles.length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: File List -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div>
        <!-- Breadcrumb Navigation -->
        <div class="mb-4 flex items-center gap-2 text-sm">
          <button
            v-if="currentFolderId !== null"
            @click="goBack"
            class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <ArrowLeft class="h-4 w-4" />
          </button>
          <template
            v-for="(item, index) in breadcrumbs"
            :key="item.id ?? 'root'"
          >
            <button
              @click="navigateTo(item, index)"
              class="cursor-pointer transition-colors hover:text-blue-600"
              :class="
                index === breadcrumbs.length - 1
                  ? 'font-semibold text-slate-900'
                  : 'text-slate-500'
              "
            >
              {{ item.name }}
            </button>
            <ChevronRight
              v-if="index < breadcrumbs.length - 1"
              class="h-4 w-4 text-slate-400"
            />
          </template>
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
        <div v-else-if="filteredFiles.length === 0" class="py-20 text-center">
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
          >
            <Folder class="h-8 w-8 text-slate-400" />
          </div>
          <h3 class="text-lg font-medium text-slate-900">暂无文件</h3>
          <p class="mt-1 text-slate-500">上传文件或创建文件夹开始使用</p>
          <p class="mt-2 text-sm text-slate-400">
            支持拖拽文件到页面任意位置上传
          </p>
        </div>

        <!-- List View -->
        <div
          v-else-if="viewMode === 'list'"
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
                  selectedFiles.length === filteredFiles.length &&
                  filteredFiles.length > 0
                "
                @change="toggleSelectAll"
                class="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div class="col-span-5">文件名</div>
            <div class="col-span-1">格式</div>
            <div class="col-span-2">大小</div>
            <div class="col-span-2">修改时间</div>
            <div class="col-span-1 text-right">操作</div>
          </div>

          <!-- Table Body -->
          <div
            v-for="file in filteredFiles"
            :key="file.id"
            class="group grid grid-cols-12 gap-4 border-b border-slate-100 px-6 py-4 transition-colors last:border-b-0 hover:bg-slate-50"
          >
            <!-- Checkbox -->
            <div class="col-span-1 flex items-center">
              <input
                type="checkbox"
                :checked="selectedFiles.includes(file.id)"
                @change="toggleSelect(file.id)"
                class="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <!-- Name -->
            <div class="col-span-5 flex items-center gap-3">
              <component
                :is="getFileIcon(file)"
                class="h-5 w-5 flex-shrink-0"
                :class="getIconColor(file)"
                :style="
                  file.formatColor && file.type !== 'folder'
                    ? { color: file.formatColor }
                    : {}
                "
              />
              <span
                class="truncate font-medium"
                :class="
                  file.type === 'folder'
                    ? 'cursor-pointer text-slate-900 hover:text-blue-600'
                    : 'text-slate-700'
                "
                @click="file.type === 'folder' && enterFolder(file)"
              >
                {{ file.name }}
              </span>
            </div>

            <!-- Format Label -->
            <div class="col-span-1 flex items-center">
              <span
                v-if="file.formatLabel"
                class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold"
                :style="{
                  backgroundColor: `${file.formatColor || '#94A3B8'}15`,
                  color: file.formatColor || '#94A3B8',
                }"
              >
                {{ file.formatLabel }}
              </span>
              <span
                v-else-if="file.type === 'folder'"
                class="text-xs text-slate-400"
                >文件夹</span
              >
            </div>

            <!-- Size -->
            <div class="col-span-2 flex items-center text-slate-500">
              {{ file.size }}
            </div>

            <!-- Update Time -->
            <div class="col-span-2 flex items-center text-slate-500">
              {{ file.updateTime }}
            </div>

            <!-- Actions -->
            <div
              class="col-span-1 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                v-if="file.type === 'file'"
                @click="handleDownload(file)"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
                title="下载"
              >
                <Download class="h-4 w-4" />
              </button>
              <button
                @click="handleDelete(file)"
                class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
                title="删除"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Grid View -->
        <div
          v-else
          class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          <div
            v-for="file in filteredFiles"
            :key="file.id"
            class="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-lg"
            @click="file.type === 'folder' ? enterFolder(file) : null"
          >
            <!-- Selection Checkbox -->
            <input
              type="checkbox"
              :checked="selectedFiles.includes(file.id)"
              @click.stop
              @change="toggleSelect(file.id)"
              class="absolute left-3 top-3 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 opacity-0 transition-opacity focus:ring-blue-500 group-hover:opacity-100"
              :class="{ '!opacity-100': selectedFiles.includes(file.id) }"
            />

            <!-- Icon -->
            <div class="mb-3 flex h-20 items-center justify-center">
              <component
                :is="getFileIcon(file)"
                class="h-12 w-12"
                :class="getIconColor(file)"
                :style="
                  file.formatColor && file.type !== 'folder'
                    ? { color: file.formatColor }
                    : {}
                "
              />
            </div>

            <!-- Format Badge -->
            <div v-if="file.formatLabel" class="mb-2 flex justify-center">
              <span
                class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold"
                :style="{
                  backgroundColor: `${file.formatColor || '#94A3B8'}15`,
                  color: file.formatColor || '#94A3B8',
                }"
              >
                {{ file.formatLabel }}
              </span>
            </div>

            <!-- Name -->
            <p class="truncate text-center text-sm font-medium text-slate-900">
              {{ file.name }}
            </p>
            <p class="mt-1 text-center text-xs text-slate-500">
              {{ file.size }}
            </p>

            <!-- Hover Actions -->
            <div
              class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                @click.stop="handleDelete(file)"
                class="cursor-pointer rounded-lg bg-white p-1.5 text-slate-500 shadow-sm transition-colors hover:bg-red-100 hover:text-red-600"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="total > 0"
          class="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <!-- 左侧：条目信息 -->
          <span class="text-sm text-slate-500">
            共
            <span class="font-medium text-slate-700">{{ total }}</span> 项，每页
            {{ pageSize }} 项
          </span>

          <!-- 右侧：翻页按钮 -->
          <div class="flex items-center gap-1">
            <!-- 上一页 -->
            <button
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>

            <!-- 页码按钮 -->
            <template v-for="page in totalPages" :key="page">
              <button
                @click="currentPage = page"
                class="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                :class="
                  page === currentPage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                "
              >
                {{ page }}
              </button>
            </template>

            <!-- 下一页 -->
            <button
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件上传 input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="onFileSelected"
    />

    <!-- 新建文件夹弹窗 -->
    <div
      v-if="showNewFolderModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showNewFolderModal = false"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-900">新建文件夹</h3>
        <input
          v-model="newFolderName"
          type="text"
          placeholder="请输入文件夹名称"
          class="mb-4 w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keyup.enter="confirmNewFolder"
        />
        <div class="flex justify-end gap-3">
          <button
            @click="showNewFolderModal = false"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            @click="confirmNewFolder"
            :disabled="!newFolderName.trim()"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
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
          此操作无法撤销，文件将被永久删除。
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
  </div>
</template>

<style scoped>
/* 自定义 checkbox 样式 */
input[type='checkbox'] {
  accent-color: #2563eb;
}
</style>
