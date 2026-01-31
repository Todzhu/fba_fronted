<script setup lang="ts">
import type { FileItem as ApiFileItem } from '#/api/my-data';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Breadcrumb, Input, message, Modal } from 'ant-design-vue';

import { getMyDataFiles } from '#/api/my-data';
import FileTable from '#/views/myData/components/FileTable.vue';

// 定义接口
interface FileItem {
  id: string;
  name: string;
  size: string;
  updateTime: string;
  type: 'file' | 'folder';
  parentId: null | string;
  icon?: string;
  url?: string; // 添加 url 字段
}

interface Props {
  open: boolean;
  accept?: string; // 文件类型过滤，如 ".rds,.h5ad"
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'select']);

// 状态
const loading = ref(false);
const currentFolderId = ref<null | number>(null);
const breadcrumbs = ref<{ id: null | number; name: string }[]>([
  { id: null, name: '我的数据' },
]);
const searchKeyword = ref('');
const allFiles = ref<FileItem[]>([]);
const selectedFiles = ref<FileItem[]>([]);

// 计算属性
const files = computed(() => {
  // 过滤逻辑
  let result = allFiles.value;

  // 如果有 accept 参数，过滤文件类型（文件夹除外）
  if (props.accept) {
    const extensions = new Set(
      props.accept
        .split(',')
        .map((ext) => ext.trim().toLowerCase().replace(/^\./, '')),
    );
    result = result.filter((item) => {
      if (item.type === 'folder') return true;
      const ext = item.name.split('.').pop()?.toLowerCase() || '';
      return extensions.has(ext);
    });
  }

  return result;
});

// 工具函数
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
    rds: 'code',
    rdata: 'code',
    h5ad: 'code',
    h5: 'code',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    pdf: 'pdf',
    xlsx: 'excel',
    xls: 'excel',
    csv: 'excel',
    docx: 'word',
    doc: 'word',
    md: 'markdown',
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    mp3: 'audio',
    wav: 'audio',
    mp4: 'video',
    mov: 'video',
    js: 'code',
    ts: 'code',
    json: 'code',
    py: 'code',
  };
  return map[ext] || 'file';
};

const transformFileItem = (item: ApiFileItem): FileItem => ({
  id: String(item.id),
  name: item.name,
  size: item.type === 'folder' ? '-' : formatFileSize(item.size),
  updateTime: item.updated_time ? formatDateTime(item.updated_time) : '-',
  type: item.type,
  parentId: item.parent_id ? String(item.parent_id) : null,
  icon: item.type === 'folder' ? undefined : determineIcon(item.name),
  /* url: item.storage_path, */ // API 返回的 item 没有 storage_path，我们主要使用 ID
});

// 获取文件列表
const fetchFiles = async () => {
  loading.value = true;
  try {
    const params: { keyword?: string; parent_id?: number } = {};
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim();
    } else if (currentFolderId.value !== null) {
      params.parent_id = currentFolderId.value;
    }
    const res = await getMyDataFiles(params);
    allFiles.value = res.items.map((item) => transformFileItem(item));
    selectedFiles.value = []; // 切换目录清空选择
  } catch (error: any) {
    message.error(error.message || '获取文件列表失败');
  } finally {
    loading.value = false;
  }
};

// 监听打开状态
watch(
  () => props.open,
  (val) => {
    if (val) {
      // 重置状态
      currentFolderId.value = null;
      breadcrumbs.value = [{ id: null, name: '我的数据' }];
      searchKeyword.value = '';
      selectedFiles.value = [];
      fetchFiles();
    }
  },
);

// 事件处理
const handleSearch = () => {
  fetchFiles();
};

const handleEnterFolder = (folder: FileItem) => {
  currentFolderId.value = Number(folder.id);
  breadcrumbs.value.push({ id: Number(folder.id), name: folder.name });
  searchKeyword.value = '';
  fetchFiles();
};

const handleBreadcrumbClick = (
  item: { id: null | number; name: string },
  index: number,
) => {
  currentFolderId.value = item.id;
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  searchKeyword.value = '';
  fetchFiles();
};

const handleNavUp = () => {
  if (breadcrumbs.value.length > 1) {
    const parentIndex = breadcrumbs.value.length - 2;
    // 确保索引有效
    if (parentIndex >= 0) {
      const parent = breadcrumbs.value[parentIndex];
      if (parent) {
        handleBreadcrumbClick(parent, parentIndex);
      }
    }
  }
};

const handleSelectionChange = (selection: FileItem[]) => {
  // 单选逻辑：始终只保留最后一个选中的文件（如果是多选的话）
  // 注意：FileTable 是全选/多选逻辑，这里简单处理：取最后一个非文件夹的项
  const fileSelection = selection.filter((f) => f.type === 'file');
  if (fileSelection.length > 1) {
    // 这里其实无法控制 Table 的选中状态显示（因为它内部维护了 key），但我们可以只认最后一个
    selectedFiles.value = [fileSelection[fileSelection.length - 1]];
  } else {
    selectedFiles.value = fileSelection;
  }
};

const handleOk = () => {
  if (selectedFiles.value.length === 0) {
    message.warning('请选择一个文件');
    return;
  }
  const file = selectedFiles.value[0];
  emit('select', file);
  emit('update:open', false);
};

const handleCancel = () => {
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    title="选择数据文件"
    width="800px"
    @ok="handleOk"
    @cancel="handleCancel"
    :ok-button-props="{ disabled: selectedFiles.length === 0 }"
  >
    <div class="platform-file-selector">
      <!-- 导航栏 + 搜索 -->
      <div class="nav-bar">
        <div class="breadcrumb-area">
          <IconifyIcon
            v-if="currentFolderId !== null"
            icon="ant-design:arrow-left-outlined"
            class="back-icon"
            @click="handleNavUp"
          />
          <Breadcrumb separator=">">
            <Breadcrumb.Item
              v-for="(item, index) in breadcrumbs"
              :key="item.id ?? 'root'"
            >
              <span
                class="breadcrumb-item"
                :class="{ active: index === breadcrumbs.length - 1 }"
                @click="handleBreadcrumbClick(item, index)"
              >
                {{ item.name }}
              </span>
            </Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <div class="search-area">
          <Input.Search
            v-model:value="searchKeyword"
            placeholder="搜索文件"
            style="width: 200px"
            @search="handleSearch"
          />
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="file-list-container">
        <FileTable
          :files="files"
          :loading="loading"
          class="simple-file-table"
          @selection-change="handleSelectionChange"
          @enter="handleEnterFolder"
        />
      </div>

      <!-- 选中提示 -->
      <div class="selected-hint" v-if="selectedFiles.length > 0">
        已选择: <span class="selected-name">{{ selectedFiles[0].name }}</span>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.platform-file-selector {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px;
  border-bottom: 1px solid #f0f0f0;
}

.breadcrumb-area {
  display: flex;
  align-items: center;
}

.back-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #666;
  cursor: pointer;
}

.back-icon:hover {
  color: #1890ff;
}

.breadcrumb-item {
  cursor: pointer;
}

.breadcrumb-item:hover {
  color: #1890ff;
}

.breadcrumb-item.active {
  font-weight: 500;
  color: #333;
  cursor: default;
}

.file-list-container {
  flex: 1;
  margin-top: 16px;
  overflow: hidden;
}

/* 隐藏操作列 */
:deep(.simple-file-table .ant-table-cell:last-child),
:deep(.simple-file-table .ant-table-thead > tr > th:last-child) {
  display: none;
}

.selected-hint {
  padding: 8px 12px;
  margin-top: 12px;
  color: #389e0d;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
}

.selected-name {
  font-weight: 600;
}
</style>
