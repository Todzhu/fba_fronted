<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import { message, Breadcrumb, Modal } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import FileTable from './components/FileTable.vue';
import FileToolbar from './components/FileToolbar.vue';
import FileGrid from './components/FileGrid.vue';
import NewFolderModal from './components/NewFolderModal.vue';
import FileUploadModal from './components/FileUploadModal.vue';
import RenameModal from './components/RenameModal.vue';
import MoveModal from './components/MoveModal.vue';
import FilePreviewModal from './components/FilePreviewModal.vue';

import {
    getMyDataFiles,
    createMyDataFolder,
    uploadMyDataFile,
    downloadMyDataFile,
    renameMyDataFile,
    moveMyDataFile,
    deleteMyDataFile,
    batchDeleteMyDataFiles,
    type FileItem as ApiFileItem,
} from '#/api/my-data';

// 前端 FileItem 类型
interface FileItem {
    id: string;
    name: string;
    size: string;
    updateTime: string;
    type: 'folder' | 'file';
    parentId: string | null;
    icon?: string;
}

// State
const loading = ref(false);
const currentFolderId = ref<number | null>(null);
const breadcrumbs = ref<{ id: number | null; name: string }[]>([
    { id: null, name: '我的数据' }
]);
const searchKeyword = ref('');
const allFiles = ref<FileItem[]>([]);
const selectedFiles = ref<FileItem[]>([]);
const viewMode = ref('list');
const newFolderModalOpen = ref(false);
const uploadModalOpen = ref(false);
const renameModalOpen = ref(false);
const moveModalOpen = ref(false);
const previewModalOpen = ref(false);
const currentRenameFile = ref<FileItem | null>(null);
const currentMoveFile = ref<FileItem | null>(null);
const currentPreviewFile = ref<FileItem | null>(null);

// Computed
const files = computed(() => allFiles.value);

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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDateTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const determineIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image',
        'pdf': 'pdf',
        'xlsx': 'excel', 'xls': 'excel', 'csv': 'excel',
        'docx': 'word', 'doc': 'word',
        'md': 'markdown',
        'zip': 'archive', 'rar': 'archive', '7z': 'archive',
        'mp3': 'audio', 'wav': 'audio',
        'mp4': 'video', 'mov': 'video',
        'js': 'code', 'ts': 'code', 'json': 'code', 'py': 'code'
    };
    return map[ext] || 'file';
};

// Fetch files from API
const fetchFiles = async () => {
    loading.value = true;
    try {
        const params: { parent_id?: number; keyword?: string } = {};
        if (searchKeyword.value.trim()) {
            params.keyword = searchKeyword.value.trim();
        } else if (currentFolderId.value !== null) {
            params.parent_id = currentFolderId.value;
        }
        // 不传 parent_id 时，后端默认返回根目录
        const res = await getMyDataFiles(params);
        console.log('API Response:', res);
        allFiles.value = res.items.map(transformFileItem);
        // 清空选中状态，防止删除文件后选中栏残留
        selectedFiles.value = [];
    } catch (e: any) {
        console.error('Fetch files error:', e);
        message.error(e.message || '获取文件列表失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchFiles();
});

// Handlers
const handleSearch = (value: string) => {
    searchKeyword.value = value;
    selectedFiles.value = [];
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
    for (const file of filesToUpload) {
        try {
            await uploadMyDataFile(file, currentFolderId.value);
            message.success(`${file.name} 上传成功`);
        } catch (e: any) {
            message.error(`${file.name} 上传失败: ${e.message}`);
        }
    }
    fetchFiles();
};

const handleNewFolder = () => {
    newFolderModalOpen.value = true;
};

const handleCreateFolder = async (name: string) => {
    try {
        await createMyDataFolder({ name, parent_id: currentFolderId.value });
        message.success(`文件夹 "${name}" 创建成功`);
        fetchFiles();
    } catch (e: any) {
        message.error(e.message || '创建文件夹失败');
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success({ content: '下载开始', key: 'download' });
    } catch (e: any) {
        message.error({ content: e.message || '下载失败', key: 'download' });
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
            } catch (e: any) {
                message.error(e.message || '删除失败');
            }
        }
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
                await batchDeleteMyDataFiles(selectedFiles.value.map(f => Number(f.id)));
                selectedFiles.value = [];
                message.success('批量删除成功');
                fetchFiles();
            } catch (e: any) {
                message.error(e.message || '删除失败');
            }
        }
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
    } catch (e: any) {
        message.error(e.message || '重命名失败');
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
    } catch (e: any) {
        message.error(e.message || '移动失败');
    }
};

// Tree Data for Move Modal (simplified - just root folder)
const folderTreeData = computed(() => {
    const folders = allFiles.value.filter(f => f.type === 'folder');
    
    const buildTree = (parentId: string | null): any[] => {
        return folders
            .filter(f => f.parentId === parentId)
            .map(f => ({
                title: f.name,
                key: f.id,
                children: buildTree(f.id),
                disabled: currentMoveFile.value?.type === 'folder' && currentMoveFile.value.id === f.id
            }));
    };

    return [
        {
            title: '我的数据 (根目录)',
            key: 'root',
            children: buildTree(null)
        }
    ];
});

// Navigation
const handleEnterFolder = (folder: FileItem) => {
    currentFolderId.value = Number(folder.id);
    breadcrumbs.value.push({ id: Number(folder.id), name: folder.name });
    selectedFiles.value = [];
    searchKeyword.value = '';
    fetchFiles();
};

const handleBreadcrumbClick = (item: { id: number | null; name: string }, index: number) => {
    currentFolderId.value = item.id;
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
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
  <Page>
    <div class="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm overflow-hidden p-4">
      
      <!-- Breadcrumb Navigation -->
      <div class="mb-6 flex items-center px-4 py-2">
         <div class="h-6 w-1.5 bg-blue-600 rounded-full mr-4"></div>
         
         <IconifyIcon 
            v-if="currentFolderId !== null"
            icon="ant-design:arrow-left-outlined" 
            class="cursor-pointer hover:text-blue-600 text-xl mr-3 text-slate-500 transition-colors"
            @click="handleNavUp"
         />
         <Breadcrumb separator=">">
            <Breadcrumb.Item v-for="(item, index) in breadcrumbs" :key="item.id ?? 'root'">
               <span 
                 class="cursor-pointer hover:text-blue-600 transition-all duration-200"
                 :class="{ 
                    'font-bold text-slate-800 text-xl': index === breadcrumbs.length - 1,
                    'text-slate-500 text-lg font-medium': index !== breadcrumbs.length - 1
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

      <!-- File List Content -->
      <div class="flex-1 overflow-auto mt-2">
          <FileTable 
              v-if="viewMode === 'list'"
              :files="files"
              :loading="loading"
              @selection-change="handleSelectionChange"
              @download="handleDownload"
              @delete="handleDelete"
              @enter="handleEnterFolder"
              @rename="handleRename"
              @move="handleMove"
              @preview="handlePreview"
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
      </div>
    </div>

    <!-- New Folder Modal -->
    <NewFolderModal 
      v-model:open="newFolderModalOpen"
      @create="handleCreateFolder"
    />
    
    <!-- File Upload Modal -->
    <FileUploadModal
      v-model:open="uploadModalOpen"
      @upload="handleUploadFiles"
    />

    <!-- Rename Modal -->
    <RenameModal
        v-model:open="renameModalOpen"
        :name="currentRenameFile?.name || ''"
        @ok="handleRenameSubmit"
    />

    <!-- Move Modal -->
    <MoveModal
        v-model:open="moveModalOpen"
        :tree-data="folderTreeData"
        @ok="handleMoveSubmit"
    />

    <!-- Preview Modal -->
    <FilePreviewModal
        v-model:open="previewModalOpen"
        :file="currentPreviewFile"
    />
  </Page>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 600;
}
</style>
