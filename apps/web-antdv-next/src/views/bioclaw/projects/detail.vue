<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { message, Modal } from 'antdv-next';

import {
  deleteWorkspaceFiles,
  getWorkspaceFiles,
  type WorkspaceFileItem,
} from '#/api/bioclaw';
import FilePreviewModal from '#/views/myData/components/FilePreviewModal.vue';
import FileTable from '#/views/myData/components/FileTable.vue';

import SyncToCloudModal from './components/SyncToCloudModal.vue';

const route = useRoute();
const router = useRouter();
const projectId = Number(route.params.id);

interface FileItem {
  id: string;
  name: string;
  size: string;
  updateTime: string;
  type: 'file' | 'folder';
  parentId: null | string;
  icon?: string;
}

const loading = ref(false);
const allFiles = ref<FileItem[]>([]);
const selectedFiles = ref<FileItem[]>([]);
const previewModalOpen = ref(false);
const syncModalOpen = ref(false);
const currentPreviewFile = ref<FileItem | null>(null);
const searchKeyword = ref('');

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const determineIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    html: 'code',
    csv: 'excel',
    xlsx: 'excel',
  };
  return map[ext] || 'file';
};

const transformFileItem = (item: WorkspaceFileItem): FileItem => ({
  id: item.name, // 依赖纯相对路径
  name: item.name,
  size: item.type === 'folder' ? '-' : formatFileSize(item.size),
  updateTime: item.updated_time,
  type: item.type,
  parentId: null,
  icon: item.type === 'folder' ? undefined : determineIcon(item.name),
});

const files = computed(() => allFiles.value);

const fetchFiles = async () => {
  loading.value = true;
  try {
    const res = await getWorkspaceFiles(projectId, searchKeyword.value);
    allFiles.value = res.items.map((item: any) => transformFileItem(item));
    selectedFiles.value = [];
  } catch (error: any) {
    message.error(error.message || '获取文件列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchFiles();
});

const handleSelectionChange = (selection: FileItem[]) => {
  selectedFiles.value = selection;
};

const handlePreview = (file: FileItem) => {
  currentPreviewFile.value = file;
  previewModalOpen.value = true;
};

const handleDelete = (file: FileItem) => {
  Modal.confirm({
    title: '确认删除',
    content: `是否彻底删除工作区文件 "${file.name}" ? 这将无法恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteWorkspaceFiles(projectId, [file.name]);
        message.success('删除成功');
        fetchFiles();
      } catch (error: any) {
        message.error(error.message);
      }
    },
  });
};

const handleBatchDelete = () => {
  if (selectedFiles.value.length === 0) return;
  Modal.confirm({
    title: '确认清理',
    content: `清理选中的 ${selectedFiles.value.length} 个废弃成果?`,
    okText: '清理垃圾',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteWorkspaceFiles(
          projectId,
          selectedFiles.value.map((f) => f.name),
        );
        message.success('清理成功');
        fetchFiles();
      } catch (error: any) {
        message.error(error.message);
      }
    },
  });
};

const handleSync = () => {
  if (selectedFiles.value.length === 0) {
    message.warning('请先选择要固化的成果');
    return;
  }
  syncModalOpen.value = true;
};
</script>

<template>
  <Page>
    <div class="flex h-[calc(100vh-140px)] flex-col overflow-hidden rounded-lg bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div class="flex items-center">
          <IconifyIcon
            icon="ant-design:left-outlined"
            class="mr-4 cursor-pointer text-xl hover:text-blue-600"
            @click="router.back()"
          />
          <div>
            <h1 class="m-0 text-xl font-bold">Project Workspace</h1>
            <p class="m-0 text-sm text-slate-500">在此挑选 Agent 生成的研究成果，然后一键固化到云盘供日后复用。</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button
            @click="handleBatchDelete"
            class="rounded bg-red-50 px-4 py-2 text-sm text-red-600 transition hover:bg-red-100"
          >
            🧹 清理所选缓存
          </button>
          <button
            @click="handleSync"
            class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-lg"
          >
            ✨ 固化选中成果至云盘
          </button>
        </div>
      </div>

      <div class="mt-2 flex-1 overflow-auto">
        <FileTable
          :files="files"
          :loading="loading"
          @selection-change="handleSelectionChange"
          @delete="handleDelete"
          @preview="handlePreview"
        />
      </div>
    </div>

    <SyncToCloudModal
      v-model:open="syncModalOpen"
      :project-id="projectId"
      :files="selectedFiles"
      @success="fetchFiles"
    />
    <FilePreviewModal v-model:open="previewModalOpen" :file="currentPreviewFile" />
  </Page>
</template>
