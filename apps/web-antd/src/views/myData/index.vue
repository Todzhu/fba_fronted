<script setup lang="ts">
import { ref, computed } from 'vue';
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

import { allMockFiles, type FileItem } from './mock';

// State
// ... (keep existing state)

const currentFolderId = ref<string | null>(null);
const breadcrumbs = ref<{ id: string | null; name: string }[]>([
  { id: null, name: '我的数据' }
]);

// Search State
const searchKeyword = ref('');

// Make mock data reactive for local mutations
const allFiles = ref<FileItem[]>([...allMockFiles]);

// Computed
const files = computed(() => {
    if (searchKeyword.value.trim()) {
        const keyword = searchKeyword.value.trim().toLowerCase();
        return allFiles.value.filter(f => f.name.toLowerCase().includes(keyword));
    }
    return allFiles.value.filter(f => f.parentId === currentFolderId.value);
});
const selectedFiles = ref<FileItem[]>([]);
const viewMode = ref('list');
const newFolderModalOpen = ref(false);
const uploadModalOpen = ref(false);

// Handlers
const handleSearch = (value: string) => {
  searchKeyword.value = value;
  if (value) {
      selectedFiles.value = []; // Clear selection on search
  }
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

const handleUploadFiles = (filesToUpload: any[]) => {
    filesToUpload.forEach(file => {
        const newFile: FileItem = {
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            updateTime: new Date().toLocaleString(),
            type: 'file',
            parentId: currentFolderId.value,
            icon: determineIcon(file.type)
        };
        allFiles.value.unshift(newFile);
    });
};

const determineIcon = (ext: string): string => {
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
    return map[ext.toLowerCase()] || 'file';
};

const handleNewFolder = () => {
  newFolderModalOpen.value = true;
};

const handleCreateFolder = (name: string) => {
  const newFolder: FileItem = {
    id: `folder-${Date.now()}`,
    name,
    size: '-',
    updateTime: new Date().toLocaleString(),
    type: 'folder',
    parentId: currentFolderId.value, // Set correct parentId
  };
  allFiles.value.unshift(newFolder);
  message.success(`文件夹 "${name}" 创建成功 (Mock)`);
};

const handleDownload = (file: FileItem) => {
    if (file.type === 'folder') {
        message.warning('暂不支持下载文件夹');
        return;
    }
    
    message.loading({ content: `正在准备下载 ${file.name}...`, key: 'download' });
    
    setTimeout(() => {
        // Mock download logic
        const content = `Mock content for file: ${file.name}\nSize: ${file.size}\nType: ${file.type}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        message.success({ content: '下载开始', key: 'download' });
    }, 1000);
};

const handleDelete = (file: FileItem) => {
    Modal.confirm({
        title: '确认删除',
        content: `是否确认删除 "${file.name}" ?`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk() {
            allFiles.value = allFiles.value.filter(f => f.id !== file.id);
            message.success('删除成功');
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
        onOk() {
            const ids = new Set(selectedFiles.value.map(f => f.id));
            allFiles.value = allFiles.value.filter(f => !ids.has(f.id));
            selectedFiles.value = [];
            message.success('批量删除成功');
        }
    });
};

// Rename State
const renameModalOpen = ref(false);
const currentRenameFile = ref<FileItem | null>(null);

const handleRename = (file: FileItem) => {
    currentRenameFile.value = file;
    renameModalOpen.value = true;
};

const handleRenameSubmit = (newName: string) => {
    if (currentRenameFile.value) {
        currentRenameFile.value.name = newName;
        // In real app, call API
        message.success('重命名成功');
    }
};

const handleMove = (file: FileItem) => {
    currentMoveFile.value = file;
    moveModalOpen.value = true;
};

const handleMoveSubmit = (targetFolderId: string) => {
    if (!currentMoveFile.value) return;
    
    // Check if moving to self or children (simple check for self)
    if (currentMoveFile.value.id === targetFolderId) {
        message.error('不能移动到自身');
        return;
    }
    
    // In a real app we would check circular dependency deeper
    
    // 'root' is special key for top level
    const newParentId = targetFolderId === 'root' ? null : targetFolderId;
    
    if (currentMoveFile.value.parentId === newParentId) {
         message.warning('文件已在该文件夹下');
         return;
    }

    currentMoveFile.value.parentId = newParentId;
    message.success('移动成功');
    currentMoveFile.value = null;
};

// Tree Data Generation for Move Modal
const folderTreeData = computed(() => {
    const folders = allFiles.value.filter(f => f.type === 'folder');
    
    // Helper to build tree
    const buildTree = (parentId: string | null): any[] => {
        return folders
            .filter(f => f.parentId === parentId)
            .map(f => ({
                title: f.name,
                key: f.id,
                children: buildTree(f.id),
                // Disable if moving a folder into itself (basic check)
                disabled: currentMoveFile.value?.type === 'folder' && 
                          (currentMoveFile.value.id === f.id) 
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

// Move State
const moveModalOpen = ref(false);
const currentMoveFile = ref<FileItem | null>(null);

// Navigation Handlers
const handleEnterFolder = (folder: FileItem) => {
  currentFolderId.value = folder.id;
  breadcrumbs.value.push({ id: folder.id, name: folder.name });
  selectedFiles.value = []; // Clear selection when navigating
  searchKeyword.value = ''; // Exit search mode
};

const handleBreadcrumbClick = (item: { id: string | null; name: string }, index: number) => {
  currentFolderId.value = item.id;
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  selectedFiles.value = [];
  searchKeyword.value = ''; // Exit search mode
};

const handleNavUp = () => {
  if (breadcrumbs.value.length > 1) {
    const parent = breadcrumbs.value[breadcrumbs.value.length - 2];
    if (parent) {
      handleBreadcrumbClick(parent, breadcrumbs.value.length - 2);
    }
  }
};

// Preview State
const previewModalOpen = ref(false);
const currentPreviewFile = ref<FileItem | null>(null);

const handlePreview = (file: FileItem) => {
    currentPreviewFile.value = file;
    previewModalOpen.value = true;
};
</script>

<template>
  <Page title="我的数据">
    <div class="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm overflow-hidden p-4">
      
      <!-- Breadcrumb Navigation -->
      <div class="mb-4 flex items-center gap-2">
         <IconifyIcon 
            v-if="currentFolderId !== null"
            icon="ant-design:arrow-left-outlined" 
            class="cursor-pointer hover:text-blue-500 text-lg mr-2"
            @click="handleNavUp"
         />
         <Breadcrumb>
            <Breadcrumb.Item v-for="(item, index) in breadcrumbs" :key="item.id || 'root'">
               <span 
                 class="cursor-pointer hover:text-blue-500"
                 :class="{ 'font-bold text-gray-800': index === breadcrumbs.length - 1 }"
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
