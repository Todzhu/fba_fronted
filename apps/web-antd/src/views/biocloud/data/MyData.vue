<script setup lang="ts">
import type { FileItem as UserFile } from '#/api/my-data';

// 我的数据页面 - 文件管理
import { computed, onMounted, ref } from 'vue';

import {
  ArrowLeft,
  ChevronRight,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Grid3X3,
  Image,
  List,
  Search,
  Trash2,
  Upload,
} from 'lucide-vue-next';

import {
  batchDeleteMyDataFiles,
  createMyDataFolder,
  deleteMyDataFile,
  getMyDataDownloadUrl,
  getMyDataFiles,
  uploadMyDataFile,
} from '#/api/my-data';

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
  rawSize?: number; // 原始字节大小
}

// ========== State ==========
const loading = ref(false);
const loadingText = ref(''); // 加载提示文字
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('list');
const selectedFiles = ref<number[]>([]);
const currentFolderId = ref<null | number>(null);
const breadcrumbs = ref<{ id: null | number; name: string }[]>([
  { id: null, name: '我的数据' },
]);

// 文件列表
const allFiles = ref<FileItem[]>([]);

// ========== Helpers ==========
// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

// 格式化时间
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

// 获取文件类型
const getFileType = (
  mimeType: null | string,
  name: string,
): FileItem['fileType'] => {
  if (!mimeType) {
    // 根据文件扩展名判断
    const ext = name.split('.').pop()?.toLowerCase();
    if (['csv', 'tsv', 'xls', 'xlsx'].includes(ext || '')) return 'excel';
    if (['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(ext || ''))
      return 'image';
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['doc', 'docx', 'md', 'rtf', 'txt'].includes(ext || ''))
      return 'document';
    if (['7z', 'gz', 'rar', 'tar', 'zip'].includes(ext || '')) return 'archive';
    if (
      ['c', 'cpp', 'java', 'js', 'py', 'r', 'R', 'sh', 'ts'].includes(ext || '')
    )
      return 'code';
    return 'other';
  }

  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  ) {
    return 'excel';
  }
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType.includes('document'))
    return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive'))
    return 'archive';
  return 'other';
};

// 转换后端数据为前端格式
const transformFile = (file: UserFile): FileItem => ({
  id: file.id,
  name: file.name,
  size: file.type === 'folder' ? '-' : formatFileSize(file.size),
  updateTime: formatDateTime(file.updated_time || file.created_time),
  type: file.type as 'file' | 'folder',
  fileType:
    file.type === 'folder' ? undefined : getFileType(file.mime_type, file.name),
  parentId: file.parent_id,
  rawSize: file.size,
});

// ========== API Methods ==========
const fetchFiles = async () => {
  loading.value = true;
  loadingText.value = '正在加载文件列表...';
  try {
    const res = await getMyDataFiles({
      parent_id: currentFolderId.value ?? undefined,
      keyword: searchQuery.value.trim() || undefined,
    });
    allFiles.value = res.items.map((item) => transformFile(item));
  } catch (error) {
    console.error('获取文件列表失败:', error);
    allFiles.value = [];
  } finally {
    loading.value = false;
    loadingText.value = '';
  }
};

// ========== Computed ==========
// API 已在服务端过滤 parent_id，这里只需本地搜索过滤和排序
const filteredFiles = computed(() => {
  let files = [...allFiles.value];

  // 如果有搜索词，本地过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    files = files.filter((f) => f.name.toLowerCase().includes(query));
  }

  // 文件夹排前面
  return files.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return 0;
  });
});

const hasSelection = computed(() => selectedFiles.value.length > 0);

// ========== Methods ==========
const getFileIcon = (file: FileItem) => {
  if (file.type === 'folder') return Folder;
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
  fetchFiles();
};

const navigateTo = (
  item: { id: null | number; name: string },
  index: number,
) => {
  currentFolderId.value = item.id;
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  selectedFiles.value = [];
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

  loading.value = true;
  loadingText.value = '正在上传文件...';
  try {
    for (const file of files) {
      await uploadMyDataFile(file, currentFolderId.value);
    }
    await fetchFiles();
  } catch (error) {
    console.error('上传失败:', error);
  } finally {
    loading.value = false;
    loadingText.value = '';
    input.value = ''; // 重置 input
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
    await createMyDataFolder({
      name: newFolderName.value.trim(),
      parent_id: currentFolderId.value,
    });
    showNewFolderModal.value = false;
    await fetchFiles();
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
  const url = getMyDataDownloadUrl(file.id);
  window.open(url, '_blank');
};

// 删除确认弹窗
const showDeleteModal = ref(false);
const deleteTarget = ref<null | { file?: FileItem; type: 'batch' | 'single' }>(
  null,
);

// 删除文件
const handleDelete = (file: FileItem) => {
  deleteTarget.value = { type: 'single', file };
  showDeleteModal.value = true;
};

// 批量删除
const handleBatchDelete = () => {
  if (selectedFiles.value.length === 0) return;
  deleteTarget.value = { type: 'batch' };
  showDeleteModal.value = true;
};

// 确认删除
const confirmDelete = async () => {
  if (!deleteTarget.value) return;

  loading.value = true;
  loadingText.value = '正在删除...';
  showDeleteModal.value = false;

  try {
    if (deleteTarget.value.type === 'single' && deleteTarget.value.file) {
      await deleteMyDataFile(deleteTarget.value.file.id);
    } else if (deleteTarget.value.type === 'batch') {
      await batchDeleteMyDataFiles(selectedFiles.value);
      selectedFiles.value = [];
    }
    await fetchFiles();
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    loading.value = false;
    loadingText.value = '';
    deleteTarget.value = null;
  }
};

// 获取删除提示文字
const deleteModalMessage = computed(() => {
  if (!deleteTarget.value) return '';
  if (deleteTarget.value.type === 'single' && deleteTarget.value.file) {
    return `确定要删除"${deleteTarget.value.file.name}"吗？`;
  }
  return `确定要删除选中的 ${selectedFiles.value.length} 个项目吗？`;
});

onMounted(() => {
  fetchFiles();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header Section -->
    <div
      class="border-b border-slate-200 bg-white px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div class="mx-auto max-w-7xl">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">我的数据</h1>
        <p class="max-w-2xl text-slate-500">
          管理您的数据文件，支持上传、下载、预览和组织文件夹。
        </p>

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
              class="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

    <!-- Breadcrumb Navigation -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-2 text-sm">
        <button
          v-if="currentFolderId !== null"
          @click="goBack"
          class="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
        >
          <ArrowLeft class="h-4 w-4" />
        </button>
        <template v-for="(item, index) in breadcrumbs" :key="item.id ?? 'root'">
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
    </div>

    <!-- File List / Grid -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
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
          <div class="col-span-2">大小</div>
          <div class="col-span-3">修改时间</div>
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

          <!-- Size -->
          <div class="col-span-2 flex items-center text-slate-500">
            {{ file.size }}
          </div>

          <!-- Update Time -->
          <div class="col-span-3 flex items-center text-slate-500">
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
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
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
            />
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
