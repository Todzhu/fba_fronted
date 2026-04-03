<template>
  <Page class="task-detail">
    <!-- 顶部返回 + 任务信息 -->
    <div class="header">
      <Button type="link" @click="router.back()">
        <Icon icon="mdi:arrow-left" />
        返回任务列表
      </Button>
    </div>

    <Spin :spinning="loading">
      <!-- 任务信息卡片 -->
      <Card v-if="task" class="info-card">
        <div class="info-header">
          <h2 class="info-title">
            <Icon icon="mdi:folder-open-outline" class="folder-icon" />
            {{ task.task_name || `任务 #${task.id}` }}
          </h2>
          <Badge
            :status="statusConfig[task.status]?.color as any"
            :text="statusConfig[task.status]?.text"
          />
        </div>
        <Descriptions :column="4" size="small">
          <Descriptions.Item label="工具">
            <Tag color="blue">{{ task.tool_name || '未知' }}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{{ formatTime(task.created_at) }}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{{ formatTime(task.completed_at) }}</Descriptions.Item>
          <Descriptions.Item label="文件数">{{ files.length }} 个</Descriptions.Item>
        </Descriptions>
      </Card>

      <!-- 结果文件列表 -->
      <Card title="结果文件" class="files-card">
        <template #extra>
          <Space>
            <Segmented v-model:value="viewMode" :options="viewOptions" size="small" />
          </Space>
        </template>

        <Empty v-if="files.length === 0" description="暂无结果文件" />

        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="file-grid">
          <div
            v-for="file in files"
            :key="file.name"
            class="file-card"
            @click="handlePreview(file)"
          >
            <!-- 图片缩略图 -->
            <div v-if="file.type === 'image'" class="file-preview">
              <img :src="blobUrls[file.name] || ''" :alt="file.name" />
            </div>
            <div v-else class="file-preview file-icon-wrapper">
              <Icon :icon="getFileIcon(file.type)" class="file-type-icon" />
            </div>
            <div class="file-info">
              <div class="file-name" :title="file.name">{{ file.name }}</div>
              <div class="file-size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-actions" @click.stop>
              <Tooltip title="下载">
                <Button type="text" size="small" @click="handleDownload(file)">
                  <Icon icon="mdi:download" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <Table
          v-else
          :columns="fileColumns"
          :data-source="files"
          :pagination="false"
          row-key="name"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <Space>
                <Icon :icon="getFileIcon(record.type)" style="font-size: 18px" />
                <a @click="handlePreview(record)">{{ record.name }}</a>
              </Space>
            </template>
            <template v-else-if="column.key === 'size'">
              {{ formatSize(record.size) }}
            </template>
            <template v-else-if="column.key === 'type'">
              <Tag :color="typeColors[record.type]">{{ typeLabels[record.type] }}</Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button
                  v-if="record.type === 'image'"
                  type="link"
                  size="small"
                  @click="handlePreview(record)"
                >
                  预览
                </Button>
                <Button type="link" size="small" @click="handleDownload(record)">
                  下载
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </Spin>

    <!-- 图片预览 -->
    <Image
      :src="previewSrc"
      :style="{ display: 'none' }"
      :preview="{
        visible: previewVisible,
        onVisibleChange: (v: boolean) => (previewVisible = v),
      }"
    />
  </Page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Image,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antdv-next';
import { Page } from '@vben/common-ui';
import { Icon } from '@iconify/vue';

import {
  getTaskStatus,
  getTaskFiles,
  getTaskFileUrl,
  type TaskFile,
  type TaskStatusResponse,
} from '#/api/analysis-tools';
import { useAccessStore } from '@vben/stores';

const route = useRoute();
const router = useRouter();

const accessStore = useAccessStore();

/** 带认证的 fetch，用于加载文件 blob */
const authFetch = async (url: string): Promise<Blob> => {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessStore.accessToken}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.blob();
};

const loading = ref(true);
const task = ref<TaskStatusResponse | null>(null);
const files = ref<TaskFile[]>([]);
const viewMode = ref<'grid' | 'list'>('grid');
const previewVisible = ref(false);
const previewSrc = ref('');
const blobUrls = ref<Record<string, string>>({});

const viewOptions = [
  { label: '网格', value: 'grid' },
  { label: '列表', value: 'list' },
];

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'processing', text: '运行中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
};

const typeLabels: Record<string, string> = {
  image: '图片',
  table: '表格',
  pdf: 'PDF',
  binary: '二进制',
};

const typeColors: Record<string, string> = {
  image: 'green',
  table: 'blue',
  pdf: 'orange',
  binary: 'default',
};

const fileColumns = [
  { title: '文件名', key: 'name', dataIndex: 'name' },
  { title: '大小', key: 'size', dataIndex: 'size', width: 120 },
  { title: '类型', key: 'type', dataIndex: 'type', width: 100 },
  { title: '操作', key: 'action', width: 150 },
];

const getFileUrl = (filename: string) => {
  const taskId = Number(route.params.taskId);
  return getTaskFileUrl(taskId, filename);
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'image': return 'mdi:file-image-outline';
    case 'table': return 'mdi:file-table-outline';
    case 'pdf': return 'mdi:file-pdf-box';
    default: return 'mdi:file-outline';
  }
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (time: string | null) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

const handlePreview = async (file: TaskFile) => {
  if (file.type === 'image') {
    if (!blobUrls.value[file.name]) {
      await loadBlobUrl(file.name);
    }
    previewSrc.value = blobUrls.value[file.name] || '';
    previewVisible.value = true;
  } else {
    handleDownload(file);
  }
};

const handleDownload = async (file: TaskFile) => {
  try {
    const blob = await authFetch(getFileUrl(file.name));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    message.error('下载失败');
    console.error(e);
  }
};

const fetchData = async () => {
  const taskId = Number(route.params.taskId);
  loading.value = true;
  try {
    const [taskRes, filesRes] = await Promise.all([
      getTaskStatus(taskId),
      getTaskFiles(taskId),
    ]);
    task.value = taskRes;
    files.value = filesRes;
    // 预加载图片缩略图
    filesRes
      .filter((f: TaskFile) => f.type === 'image')
      .forEach((f: TaskFile) => loadBlobUrl(f.name));
  } catch (e) {
    message.error('获取任务信息失败');
    console.error(e);
  } finally {
    loading.value = false;
  }
};

/** 加载单个图片的 blob URL */
const loadBlobUrl = async (filename: string) => {
  try {
    const blob = await authFetch(getFileUrl(filename));
    blobUrls.value[filename] = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to load image:', filename, e);
  }
};

/** 清理 blob URL */
onUnmounted(() => {
  Object.values(blobUrls.value).forEach(URL.revokeObjectURL);
});

onMounted(fetchData);

// 监听路由参数变化（maxNumOfOpenTab:1 会复用组件）
watch(() => route.params.taskId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    // 清理旧的 blob URL
    Object.values(blobUrls.value).forEach(URL.revokeObjectURL);
    blobUrls.value = {};
    fetchData();
  }
});
</script>

<style scoped>
.task-detail {
  padding: 24px;
  background: #f5f7fa;
}

.header {
  margin-bottom: 16px;
}

.info-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

.info-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.info-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.folder-icon {
  font-size: 24px;
  color: var(--primary-color);
}

.files-card {
  border-radius: 12px;
}

/* 网格视图 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.file-card {
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.file-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  overflow: hidden;
  background: #f9fafb;
}

.file-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.file-icon-wrapper {
  background: #f3f4f6;
}

.file-type-icon {
  font-size: 48px;
  color: #9ca3af;
}

.file-info {
  padding: 8px 12px 4px;
}

.file-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #9ca3af;
}

.file-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 8px 8px;
}
</style>
