<script setup lang="ts">
import type { FileItem as ApiFileItem } from '#/api/my-data';

import { computed, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { Breadcrumb, message, Modal } from 'ant-design-vue';

import AuthModal from '../landing/components/AuthModal.vue';

import {
  batchDeleteMyDataFiles,
  createMyDataFolder,
  deleteMyDataFile,
  downloadMyDataFile,
  getMyDataFiles,
  getStorageStats,
  moveMyDataFile,
  renameMyDataFile,
  uploadMyDataFile,
} from '#/api/my-data';

import FileGrid from './components/FileGrid.vue';
import FilePreviewModal from './components/FilePreviewModal.vue';
import FileTable from './components/FileTable.vue';
import FileToolbar from './components/FileToolbar.vue';
import FileUploadModal from './components/FileUploadModal.vue';
// removed ImportWizard
import MoveModal from './components/MoveModal.vue';
import NewFolderModal from './components/NewFolderModal.vue';
import RenameModal from './components/RenameModal.vue';
import StorageSidebar from './components/StorageSidebar.vue';

// 前端 FileItem 类型
interface FileItem {
  id: string;
  name: string;
  size: string;
  updateTime: string;
  type: 'file' | 'folder';
  parentId: null | string;
  icon?: string;
}

// State
const loading = ref(false);
const currentFolderId = ref<null | number>(null);
const breadcrumbs = ref<{ id: null | number; name: string }[]>([
  { id: null, name: '我的数据' },
]);
const searchKeyword = ref('');
const allFiles = ref<FileItem[]>([]);
const selectedFiles = ref<FileItem[]>([]);
const viewMode = ref('list');
// removed activeTab
const currentPage = ref(1);
const pageSize = ref(10);
const totalFiles = ref(0);
const newFolderModalOpen = ref(false);
const uploadModalOpen = ref(false);
const uploading = ref(false);
const uploadProgress = ref({ current: 0, total: 0, fileName: '' });
const renameModalOpen = ref(false);
const moveModalOpen = ref(false);
const previewModalOpen = ref(false);
const currentRenameFile = ref<FileItem | null>(null);
const currentMoveFile = ref<FileItem | null>(null);
const currentPreviewFile = ref<FileItem | null>(null);

// 登录状态
const accessStore = useAccessStore();
const isLoggedIn = computed(() => !!accessStore.accessToken);
const showAuthModal = ref(false);

// 存储用量统计
const STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB
const storageUsed = ref(0);
const fileCount = ref(0);
const folderCount = ref(0);
const storagePercent = computed(() => Math.min((storageUsed.value / STORAGE_LIMIT) * 100, 100));
const storageUsedStr = computed(() => formatFileSize(storageUsed.value));
const storageLimitStr = computed(() => '10 GB');

const fetchStorageStats = async () => {
  try {
    const stats = await getStorageStats();
    storageUsed.value = stats.total_size;
    fileCount.value = stats.file_count;
    folderCount.value = stats.folder_count;
  } catch { /* ignore */ }
};

// Computed
const files = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) return allFiles.value;
  return allFiles.value.filter(item => item.name.toLowerCase().includes(keyword));
});

// 转换后端数据到前端格式
const transformFileItem = (item: ApiFileItem): FileItem => ({
  id: String(item.id),
  name: item.name,
  size: item.type === 'folder' ? '-' : formatFileSize(item.size),
  updateTime: item.updated_time ? formatDateTime(item.updated_time) : '-',
  type: item.type,
  parentId: item.parent_id ? String(item.parent_id) : null,
  icon: item.type === 'folder' ? undefined : determineIcon(item.name),
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const determineIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image',
    pdf: 'pdf',
    xlsx: 'excel', xls: 'excel', csv: 'excel', tsv: 'excel',
    docx: 'word', doc: 'word',
    md: 'markdown', txt: 'markdown',
    zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive', tar: 'archive',
    mp3: 'audio', wav: 'audio',
    mp4: 'video', mov: 'video',
    js: 'code', ts: 'code', json: 'code', py: 'code', r: 'code', rmd: 'code',
    h5ad: 'data', h5: 'data', hdf5: 'data', loom: 'data',
    rds: 'rdata', rda: 'rdata',
    fasta: 'bio', fastq: 'bio', bam: 'bio', vcf: 'bio', bed: 'bio', gtf: 'bio', gff: 'bio',
  };
  return map[ext] || 'file';
};

// Fetch files from API
const fetchFiles = async () => {
  // 未登录时弹出登录框，不调用 API
  if (!isLoggedIn.value) {
    showAuthModal.value = true;
    return;
  }
  loading.value = true;
  try {
    const params: { keyword?: string; page?: number; page_size?: number; parent_id?: number } = {
      page: currentPage.value,
      page_size: pageSize.value,
    };
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim();
    } else if (currentFolderId.value !== null) {
      params.parent_id = currentFolderId.value;
    }
    // 不传 parent_id 时，后端默认返回根目录
    const res = await getMyDataFiles(params);
    allFiles.value = res.items.map((item) => transformFileItem(item));
    totalFiles.value = res.total;
    // 清空选中状态，防止删除文件后选中栏残留
    selectedFiles.value = [];
  } catch (error: any) {
    console.error('Fetch files error:', error);
    // 401 状态码不提示错误，弹出登录框
    if (error?.response?.status === 401 || error?.status === 401) {
      showAuthModal.value = true;
    } else {
      message.error(error.message || '获取文件列表失败');
    }
  } finally {
    loading.value = false;
  }
};

// 登录成功后自动关闭弹窗并加载文件
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    showAuthModal.value = false;
    fetchFiles();
  }
});

onMounted(() => {
  fetchFiles();
  fetchStorageStats();
});

// 拖拽上传
const isDragging = ref(false);
let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (dragLeaveTimer) clearTimeout(dragLeaveTimer);
  isDragging.value = true;
};

const handleDragLeave = () => {
  dragLeaveTimer = setTimeout(() => {
    isDragging.value = false;
  }, 100);
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  const droppedFiles = e.dataTransfer?.files;
  if (droppedFiles?.length) {
    handleUploadFiles(Array.from(droppedFiles));
  }
};

// Handlers
const handleSearch = (value: string) => {
  searchKeyword.value = value;
  currentPage.value = 1;
  selectedFiles.value = [];
  fetchFiles();
};

const handlePageChange = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
  fetchFiles();
};

const handleViewChange = (mode: string) => {
  viewMode.value = mode;
};

const handleSelectionChange = (selection: FileItem[]) => {
  selectedFiles.value = selection;
};

const handleUpload = () => {
  uploadModalOpen.value = true;
};

const handleUploadFiles = async (filesToUpload: File[]) => {
  uploading.value = true;
  uploadProgress.value = {
    current: 0,
    total: filesToUpload.length,
    fileName: '',
  };

  let successCount = 0;
  let failCount = 0;

  let index = 0;
  for (const file of filesToUpload) {
    index++;
    uploadProgress.value = {
      current: index,
      total: filesToUpload.length,
      fileName: file.name,
    };

    try {
      await uploadMyDataFile(file, currentFolderId.value);
      successCount++;
    } catch (error: any) {
      failCount++;
      message.error(`${file.name} 上传失败: ${error.message}`);
    }
  }

  uploading.value = false;
  uploadModalOpen.value = false; // 上传完成后关闭弹窗

  if (successCount > 0) {
    message.success(
      `成功上传 ${successCount} 个文件${failCount > 0 ? `，${failCount} 个失败` : ''}`,
    );
  }

  fetchFiles();
  fetchStorageStats();
};

const handleNewFolder = () => {
  newFolderModalOpen.value = true;
};

const handleCreateFolder = async (name: string) => {
  try {
    await createMyDataFolder({ name, parent_id: currentFolderId.value });
    message.success(`文件夹 "${name}" 创建成功`);
    fetchFiles();
  } catch (error: any) {
    message.error(error.message || '创建文件夹失败');
  }
};

const handleDownload = async (file: FileItem) => {
  if (file.type === 'folder') {
    message.warning('暂不支持下载文件夹');
    return;
  }

  message.loading({ content: `正在准备下载 ${file.name}...`, key: 'download' });
  try {
    const res = await downloadMyDataFile(Number(file.id));
    const blob = new Blob([res as any]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    message.success({ content: '下载开始', key: 'download' });
  } catch (error: any) {
    message.error({ content: error.message || '下载失败', key: 'download' });
  }
};

const handleDelete = (file: FileItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `是否确认删除 "${file.name}" ?`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteMyDataFile(Number(file.id));
        message.success('删除成功');
        fetchFiles();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
};

const handleBatchDelete = () => {
  if (selectedFiles.value.length === 0) return;
  Modal.confirm({
    title: '确认删除',
    content: `是否确认删除选中的 ${selectedFiles.value.length} 个文件?`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await batchDeleteMyDataFiles(
          selectedFiles.value.map((f) => Number(f.id)),
        );
        selectedFiles.value = [];
        message.success('批量删除成功');
        fetchFiles();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
};

const handleRename = (file: FileItem) => {
  currentRenameFile.value = file;
  renameModalOpen.value = true;
};

const handleRenameSubmit = async (newName: string) => {
  if (!currentRenameFile.value) return;
  try {
    await renameMyDataFile(Number(currentRenameFile.value.id), newName);
    message.success('重命名成功');
    fetchFiles();
  } catch (error: any) {
    message.error(error.message || '重命名失败');
  }
};

const handleMove = (file: FileItem) => {
  currentMoveFile.value = file;
  moveModalOpen.value = true;
};

const handleMoveSubmit = async (targetFolderId: string) => {
  if (!currentMoveFile.value) return;

  if (currentMoveFile.value.id === targetFolderId) {
    message.error('不能移动到自身');
    return;
  }

  const newParentId = targetFolderId === 'root' ? null : Number(targetFolderId);

  try {
    await moveMyDataFile(Number(currentMoveFile.value.id), newParentId);
    message.success('移动成功');
    currentMoveFile.value = null;
    fetchFiles();
  } catch (error: any) {
    message.error(error.message || '移动失败');
  }
};

// Tree Data for Move Modal (simplified - just root folder)
const folderTreeData = computed(() => {
  const folders = allFiles.value.filter((f) => f.type === 'folder');

  const buildTree = (parentId: null | string): any[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        title: f.name,
        key: f.id,
        children: buildTree(f.id),
        disabled:
          currentMoveFile.value?.type === 'folder' &&
          currentMoveFile.value.id === f.id,
      }));
  };

  return [
    {
      title: '我的数据 (根目录)',
      key: 'root',
      children: buildTree(null),
    },
  ];
});

// Navigation
const handleEnterFolder = (folder: FileItem) => {
  currentFolderId.value = Number(folder.id);
  breadcrumbs.value.push({ id: Number(folder.id), name: folder.name });
  currentPage.value = 1;
  selectedFiles.value = [];
  searchKeyword.value = '';
  fetchFiles();
};

const handleBreadcrumbClick = (
  item: { id: null | number; name: string },
  index: number,
) => {
  currentFolderId.value = item.id;
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  currentPage.value = 1;
  selectedFiles.value = [];
  searchKeyword.value = '';
  fetchFiles();
};

const handleNavUp = () => {
  if (breadcrumbs.value.length > 1) {
    const parent = breadcrumbs.value[breadcrumbs.value.length - 2];
    if (parent) {
      handleBreadcrumbClick(parent, breadcrumbs.value.length - 2);
    }
  }
};

const handlePreview = (file: FileItem) => {
  currentPreviewFile.value = file;
  previewModalOpen.value = true;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Compact Banner Header -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
      <div class="flex items-center justify-between rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] px-6 py-4">
        <div class="flex items-center gap-5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-inner ring-1 ring-black/5">
            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
          </div>
          <div class="flex flex-col justify-center">
            <h1 class="text-lg font-bold tracking-tight text-slate-900">我的数据</h1>
            <p class="mt-0.5 text-[13px] font-medium text-slate-500">
              管理您的个人数据文件，支持上传、下载和文件夹管理。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="content-layout">
        <!-- 左侧边栏 -->
        <StorageSidebar
          :storage-used-str="storageUsedStr"
          :storage-limit-str="storageLimitStr"
          :storage-percent="storagePercent"
        />

        <!-- 右侧主区域 -->
        <main class="main-area">
          <!-- 我的文件全尺寸展示区 -->
          <div class="files-section">
            <!-- 面包屑导航（仅子文件夹时显示） -->
            <div v-if="currentFolderId !== null" class="flex items-center gap-3">
              <IconifyIcon
                icon="ant-design:arrow-left-outlined"
                class="cursor-pointer text-xl text-slate-500 transition-colors hover:text-blue-600"
                @click="handleNavUp"
              />
              <Breadcrumb separator=">">
                <Breadcrumb.Item
                  v-for="(item, index) in breadcrumbs"
                  :key="item.id ?? 'root'"
                >
                  <span
                    class="cursor-pointer transition-all duration-200 hover:text-blue-600"
                    :class="{
                      'text-lg font-bold text-slate-900':
                        index === breadcrumbs.length - 1,
                      'text-sm font-medium text-slate-500':
                        index !== breadcrumbs.length - 1,
                    }"
                    @click="handleBreadcrumbClick(item, index)"
                  >
                    {{ item.name }}
                  </span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>

            <!-- Toolbar -->
            <FileToolbar
              :selected-count="selectedFiles.length"
              @search="handleSearch"
              @view-change="handleViewChange"
              @upload="handleUpload"
              @new-folder="handleNewFolder"
              @batch-delete="handleBatchDelete"
            />

            <!-- File List -->
            <div
              class="file-list-wrap"
              :class="isDragging ? 'ring-2 ring-blue-400 border-blue-300' : ''"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <!-- 拖拽上传遮罩 -->
              <Transition name="fade">
                <div
                  v-if="isDragging"
                  class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-blue-50/90 backdrop-blur-sm"
                >
                  <IconifyIcon icon="ant-design:cloud-upload-outlined" class="text-5xl text-blue-400 mb-3" />
                  <p class="text-lg font-semibold text-blue-600">松开即可上传</p>
                  <p class="text-sm text-blue-400">文件将上传到当前文件夹</p>
                </div>
              </Transition>

              <!-- 空状态 -->
              <div v-if="!loading && files.length === 0" class="flex flex-col items-center justify-center py-20">
                <IconifyIcon icon="ant-design:inbox-outlined" class="text-6xl text-slate-200 mb-4" />
                <p class="text-base font-medium text-slate-400">这里还没有文件</p>
                <p class="text-sm text-slate-300 mt-1">拖拽文件到此处或点击上方「上传」按钮</p>
              </div>

              <!-- 文件列表 -->
              <template v-else>
                <FileTable
                  v-if="viewMode === 'list'"
                  :files="files"
                  :loading="loading"
                  :current-page="currentPage"
                  :page-size="pageSize"
                  :total="totalFiles"
                  @selection-change="handleSelectionChange"
                  @download="handleDownload"
                  @delete="handleDelete"
                  @enter="handleEnterFolder"
                  @rename="handleRename"
                  @move="handleMove"
                  @preview="handlePreview"
                  @page-change="handlePageChange"
                />
                <FileGrid
                  v-else
                  :files="files"
                  @selection-change="handleSelectionChange"
                  @download="handleDownload"
                  @delete="handleDelete"
                  @enter="handleEnterFolder"
                  @preview="handlePreview"
                />
              </template>
            </div>
          </div>

          <!-- 导入数据 Tab 模块已被回收清理 -->
        </main>
      </div>
    </div>

    <!-- Modals -->
    <NewFolderModal
      v-model:open="newFolderModalOpen"
      @create="handleCreateFolder"
    />
    <FileUploadModal
      v-model:open="uploadModalOpen"
      :loading="uploading"
      :progress="uploadProgress"
      @upload="handleUploadFiles"
    />
    <RenameModal
      v-model:open="renameModalOpen"
      :name="currentRenameFile?.name || ''"
      @ok="handleRenameSubmit"
    />
    <MoveModal
      v-model:open="moveModalOpen"
      :tree-data="folderTreeData"
      @ok="handleMoveSubmit"
    />
    <FilePreviewModal
      v-model:open="previewModalOpen"
      :file="currentPreviewFile"
    />
    <AuthModal
      :is-open="showAuthModal"
      redirect-path="/data"
      @close="showAuthModal = false"
    />
  </div>
</template>

<style scoped>
/* Content Layout */
.content-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.main-area {
  flex: 1;
  min-width: 0;
}

/* Content Layout保留，其余 Tab Bar 内容清理完毕 */

/* Files Section */
.files-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-list-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.04);
  background: white;
  box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.06);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
