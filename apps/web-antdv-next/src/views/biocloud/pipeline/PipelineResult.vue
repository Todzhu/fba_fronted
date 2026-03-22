<script setup lang="ts">
/**
 * 任务详情页 - 结果文件浏览器（支持文件夹层级导航）
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Grid3x3,
  Home,
  List,
  Loader2,
  X,
} from 'lucide-vue-next';

import { getTaskFileUrl, getTaskStatus } from '#/api/analysis-tools';

// ========== 类型 ==========
interface TaskFile {
  name: string;
  size: number;
  type: 'binary' | 'image' | 'pdf' | 'table';
}

interface TaskInfo {
  completed_at: null | string;
  created_at: string;
  id: number;
  output_dir: null | string;
  started_at: null | string;
  status: string;
  task_name: null | string;
  tool_name: null | string;
}

// 文件夹/文件混合项
interface FolderItem {
  isFolder: boolean;
  name: string; // 显示名
  path: string; // 完整路径
  size?: number;
  type?: string;
  childCount?: number; // 文件夹内文件数
}

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const taskId = computed(() => Number(route.params.taskId));

const loading = ref(true);
const task = ref<null | TaskInfo>(null);
const allFiles = ref<TaskFile[]>([]);
const currentPath = ref(''); // 当前文件夹路径
const viewMode = ref<'grid' | 'list'>('grid');
const blobUrls = ref<Record<string, string>>({});

// 图片预览
const previewVisible = ref(false);
const previewSrc = ref('');
const previewTitle = ref('');

// HTML 报告预览状态
const showHtmlPreview = ref(false);
const htmlPreviewUrl = ref('');
const htmlPreviewTitle = ref('');

// ========== 计算属性：当前目录内容 ==========
const currentItems = computed<FolderItem[]>(() => {
  const prefix = currentPath.value ? currentPath.value + '/' : '';
  const items: FolderItem[] = [];
  const seenFolders = new Set<string>();

  for (const file of allFiles.value) {
    if (!file.name.startsWith(prefix)) continue;
    const rest = file.name.slice(prefix.length);
    const slashIdx = rest.indexOf('/');

    if (slashIdx === -1) {
      // 当前目录下的文件
      items.push({
        isFolder: false,
        name: rest,
        path: file.name,
        size: file.size,
        type: file.type,
      });
    } else {
      // 子文件夹
      const folderName = rest.slice(0, slashIdx);
      const folderPath = prefix + folderName;
      if (!seenFolders.has(folderPath)) {
        seenFolders.add(folderPath);
        // 计算该文件夹内的文件数
        const childCount = allFiles.value.filter((f) =>
          f.name.startsWith(folderPath + '/'),
        ).length;
        items.push({
          isFolder: true,
          name: folderName,
          path: folderPath,
          childCount,
        });
      }
    }
  }

  // 文件夹在前，文件在后
  items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return items;
});

// 面包屑
const breadcrumbs = computed(() => {
  if (!currentPath.value) return [];
  return currentPath.value.split('/');
});

// 当前目录下的图片文件
const currentImages = computed(() =>
  currentItems.value.filter((f) => !f.isFolder && f.type === 'image'),
);

// ========== 工具函数 ==========
const authFetch = async (url: string): Promise<Blob> => {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessStore.accessToken}` },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.blob();
};

const getFileUrl = (filename: string) =>
  getTaskFileUrl(taskId.value, filename);

const getFileIcon = (type?: string) => {
  switch (type) {
    case 'image': return FileImage;
    case 'table': return FileSpreadsheet;
    case 'pdf': return FileText;
    default: return File;
  }
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (time: null | string) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
};

// ========== 数据加载 ==========
const fetchData = async () => {
  loading.value = true;
  try {
    const taskRes = await getTaskStatus(taskId.value);
    task.value = taskRes;

    const { requestClient } = await import('#/api/request');
    const filesRes = await requestClient.get<TaskFile[]>(
      `/api/v1/sys/analysis-tools/tasks/${taskId.value}/result-files`,
    );
    allFiles.value = filesRes;

    // 自动跳过只含单个子文件夹的中间层级
    autoSkipSingleFolders();

    // 预加载当前目录图片
    preloadCurrentImages();
  } catch (e) {
    console.error('获取任务信息失败:', e);
  } finally {
    loading.value = false;
  }
};

// 自动穿透：如果当前层级只有一个文件夹且没有文件，直接进入
const autoSkipSingleFolders = () => {
  let safety = 10; // 防止无限循环
  while (safety-- > 0) {
    const prefix = currentPath.value ? currentPath.value + '/' : '';
    const folders: string[] = [];
    let hasFiles = false;
    const seen = new Set<string>();

    for (const file of allFiles.value) {
      if (!file.name.startsWith(prefix)) continue;
      const rest = file.name.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx === -1) {
        hasFiles = true;
        break;
      } else {
        const folderName = rest.slice(0, slashIdx);
        const folderPath = prefix + folderName;
        if (!seen.has(folderPath)) {
          seen.add(folderPath);
          folders.push(folderPath);
        }
      }
    }

    // 只有一个子文件夹且无文件 → 自动进入
    if (!hasFiles && folders.length === 1) {
      currentPath.value = folders[0]!;
    } else {
      break;
    }
  }
};

const preloadCurrentImages = () => {
  currentImages.value.slice(0, 12).forEach((f) => {
    if (!blobUrls.value[f.path]) loadBlobUrl(f.path);
  });
};

const loadBlobUrl = async (filename: string) => {
  try {
    const blob = await authFetch(getFileUrl(filename));
    blobUrls.value[filename] = URL.createObjectURL(blob);
  } catch (e) {
    console.error('加载图片失败:', filename);
  }
};

// 进入文件夹
const enterFolder = (folderPath: string) => {
  currentPath.value = folderPath;
  preloadCurrentImages();
};

// 面包屑导航
const goToBreadcrumb = (index: number) => {
  if (index < 0) {
    currentPath.value = '';
  } else {
    const parts = currentPath.value.split('/');
    currentPath.value = parts.slice(0, index + 1).join('/');
  }
  preloadCurrentImages();
};

// ========== 交互操作 ==========
const handlePreview = async (item: FolderItem) => {
  if (item.isFolder) {
    enterFolder(item.path);
    return;
  }
  if (item.type === 'image') {
    if (!blobUrls.value[item.path]) {
      await loadBlobUrl(item.path);
    }
    previewSrc.value = blobUrls.value[item.path] || '';
    previewTitle.value = item.name;
    previewVisible.value = true;
  } else if (item.name.endsWith('.html')) {
    await openHtmlPreview(item.path, item.name);
  } else {
    handleDownload(item);
  }
};

const openHtmlPreview = async (path: string, name: string) => {
  try {
    const blob = await authFetch(getFileUrl(path));
    if (htmlPreviewUrl.value) URL.revokeObjectURL(htmlPreviewUrl.value);
    htmlPreviewUrl.value = URL.createObjectURL(blob);
    htmlPreviewTitle.value = name;
    showHtmlPreview.value = true;
  } catch (e) {
    console.error('获取 HTML 失败', e);
  }
};

const handleDownload = async (item: FolderItem) => {
  try {
    const blob = await authFetch(getFileUrl(item.path));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    console.error('下载失败');
  }
};

const goBack = () => router.push({ name: 'MyTasks' });

// 统计
const totalImages = computed(() => allFiles.value.filter((f) => f.type === 'image').length);
const totalTables = computed(() => allFiles.value.filter((f) => f.type === 'table').length);

onUnmounted(() => {
  Object.values(blobUrls.value).forEach(URL.revokeObjectURL);
  if (htmlPreviewUrl.value) URL.revokeObjectURL(htmlPreviewUrl.value);
});

onMounted(fetchData);
watch(() => route.params.taskId, (n, o) => {
  if (n && n !== o) {
    Object.values(blobUrls.value).forEach(URL.revokeObjectURL);
    blobUrls.value = {};
    currentPath.value = '';
    fetchData();
  }
});
</script>

<template>
  <div class="task-detail-page">
    <!-- 头部 -->
    <div class="detail-header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="h-4 w-4" /> 返回任务列表
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <Loader2 class="h-8 w-8 animate-spin text-blue-500" />
      <span class="mt-2 text-slate-500">加载任务详情...</span>
    </div>

    <template v-else-if="task">
      <!-- 任务信息 -->
      <div class="info-card">
        <div class="info-header">
          <div class="flex items-center gap-3">
            <div class="info-icon">
              <FolderOpen class="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 class="info-title">{{ task.task_name || `任务 #${task.id}` }}</h2>
              <p class="info-subtitle">{{ task.tool_name || '未知工具' }}</p>
            </div>
          </div>
          <span class="status-badge" :class="`badge-${task.status}`">
            {{ task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : task.status === 'running' ? '运行中' : '等待中' }}
          </span>
        </div>
        <div class="info-meta">
          <div class="meta-item"><span class="meta-label">创建时间</span><span class="meta-value">{{ formatTime(task.created_at) }}</span></div>
          <div class="meta-item"><span class="meta-label">开始时间</span><span class="meta-value">{{ formatTime(task.started_at) }}</span></div>
          <div class="meta-item"><span class="meta-label">完成时间</span><span class="meta-value">{{ formatTime(task.completed_at) }}</span></div>
          <div v-if="false" class="meta-item"><span class="meta-label">文件数量</span><span class="meta-value">{{ allFiles.length }} 个 <span v-if="totalImages" class="text-green-600">({{ totalImages }} 图片)</span><span v-if="totalTables" class="text-blue-600">({{ totalTables }} 表格)</span></span></div>
        </div>
      </div>

      <!-- 文件浏览器 -->
      <div class="files-card">
        <div class="files-header">
          <div class="flex items-center gap-3">
            <h3 class="files-title"><FolderOpen class="h-5 w-5 text-slate-600" /> 结果文件</h3>
          </div>
          <div class="view-toggle">
            <button :class="['toggle-btn', viewMode === 'grid' ? 'active' : '']" @click="viewMode = 'grid'"><Grid3x3 class="h-4 w-4" /></button>
            <button :class="['toggle-btn', viewMode === 'list' ? 'active' : '']" @click="viewMode = 'list'"><List class="h-4 w-4" /></button>
          </div>
        </div>

        <!-- 面包屑导航 -->
        <div class="breadcrumb-bar">
          <button class="breadcrumb-item" :class="{ active: !currentPath }" @click="goToBreadcrumb(-1)">
            <Home class="h-3.5 w-3.5" /> 根目录
          </button>
          <template v-for="(part, idx) in breadcrumbs" :key="idx">
            <ChevronRight class="h-3.5 w-3.5 text-slate-300" />
            <button class="breadcrumb-item" :class="{ active: idx === breadcrumbs.length - 1 }" @click="goToBreadcrumb(idx)">
              {{ part }}
            </button>
          </template>
        </div>

        <!-- 空目录 -->
        <div v-if="currentItems.length === 0" class="empty-state">
          <FolderOpen class="h-12 w-12 text-slate-300" />
          <p class="text-slate-400">此目录为空</p>
        </div>

        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="file-grid">
          <div v-for="item in currentItems" :key="item.path" class="file-card" @click="handlePreview(item)">
            <div class="file-preview" :class="{ 'folder-preview': item.isFolder }">
              <!-- 文件夹 -->
              <Folder v-if="item.isFolder" class="h-12 w-12 text-amber-400" />
              <!-- 图片 -->
              <img v-else-if="item.type === 'image' && blobUrls[item.path]" :src="blobUrls[item.path]" :alt="item.name" class="preview-img" />
              <!-- HTML 报告 -->
              <div v-else-if="item.name.endsWith('.html')" class="flex flex-col items-center justify-center w-full h-full bg-blue-50/50">
                <FileText class="h-10 w-10 text-blue-500 mb-2" />
                <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md font-medium shadow-sm">🔍 点击预览报告</span>
              </div>
              <!-- 其他文件 -->
              <component v-else :is="getFileIcon(item.type)" class="h-10 w-10 text-slate-300" />
            </div>
            <div class="file-info">
              <p class="file-name" :title="item.name">{{ item.name }}</p>
              <div class="file-meta">
                <span v-if="item.isFolder" class="file-size text-amber-600">{{ item.childCount }} 个文件</span>
                <span v-else class="file-size">{{ formatSize(item.size) }}</span>
                <button v-if="!item.isFolder" class="download-btn" @click.stop="handleDownload(item)" title="下载">
                  <Download class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="file-list">
          <div class="list-header">
            <span class="col-name">名称</span>
            <span class="col-size">大小</span>
            <span class="col-type">类型</span>
            <span class="col-action">操作</span>
          </div>
          <div v-for="item in currentItems" :key="item.path" class="list-row" @click="handlePreview(item)">
            <span class="col-name">
              <Folder v-if="item.isFolder" class="h-4 w-4 text-amber-400" />
              <component v-else :is="getFileIcon(item.type)" class="h-4 w-4 text-slate-400" />
              <a>{{ item.name }}</a>
            </span>
            <span class="col-size">{{ item.isFolder ? `${item.childCount} 个文件` : formatSize(item.size) }}</span>
            <span class="col-type">
              <span v-if="item.isFolder" class="type-tag type-folder">文件夹</span>
              <span v-else class="type-tag" :class="`type-${item.type}`">
                {{ item.type === 'image' ? '图片' : item.type === 'table' ? '表格' : item.type === 'pdf' ? 'PDF' : '文件' }}
              </span>
            </span>
            <span class="col-action">
              <template v-if="item.isFolder">
                <button class="action-btn" @click.stop="enterFolder(item.path)"><FolderOpen class="h-3.5 w-3.5" /> 进入</button>
              </template>
              <template v-else>
                <button v-if="item.type === 'image' || item.name.endsWith('.html')" class="action-btn" @click.stop="handlePreview(item)"><Eye class="h-3.5 w-3.5" /> 预览</button>
                <button class="action-btn" @click.stop="handleDownload(item)"><Download class="h-3.5 w-3.5" /> 下载</button>
              </template>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 图片预览 -->
    <div v-if="previewVisible" class="preview-overlay" @click.self="previewVisible = false">
      <div class="preview-modal">
        <div class="preview-header">
          <span>{{ previewTitle }}</span>
          <button @click="previewVisible = false"><X class="h-5 w-5 text-white" /></button>
        </div>
        <img :src="previewSrc" :alt="previewTitle" class="preview-full-img" />
      </div>
    </div>

    <!-- HTML 报告 -->
    <div v-if="showHtmlPreview" class="report-overlay" @click.self="showHtmlPreview = false">
      <div class="report-modal">
        <div class="report-header">
          <span>📊 {{ htmlPreviewTitle }}</span>
          <button @click="showHtmlPreview = false"><X class="h-5 w-5" /></button>
        </div>
        <iframe :src="htmlPreviewUrl" class="report-iframe"></iframe>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-detail-page { max-width: 1200px; padding: 24px; margin: 0 auto; }
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.back-btn { display: flex; gap: 6px; align-items: center; padding: 8px 16px; font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; transition: all 0.2s; }
.back-btn:hover { color: #1e40af; border-color: #93c5fd; }
.report-btn { display: flex; gap: 6px; align-items: center; padding: 8px 20px; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; }
.report-btn:hover { box-shadow: 0 4px 12px rgb(37 99 235 / 40%); }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; }

/* 信息卡片 */
.info-card { padding: 24px; margin-bottom: 20px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 8%); }
.info-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.info-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #eff6ff; border-radius: 12px; }
.info-title { margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; }
.info-subtitle { margin: 0; font-size: 13px; color: #64748b; }
.status-badge { padding: 4px 12px; font-size: 12px; font-weight: 500; border-radius: 20px; }
.badge-completed { color: #16a34a; background: #f0fdf4; }
.badge-failed { color: #dc2626; background: #fef2f2; }
.badge-running { color: #2563eb; background: #eff6ff; }
.badge-pending { color: #9333ea; background: #faf5ff; }
.info-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-label { font-size: 12px; color: #94a3b8; }
.meta-value { font-size: 13px; font-weight: 500; color: #334155; }

/* 文件浏览器 */
.files-card { padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 8%); }
.files-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.files-title { display: flex; gap: 8px; align-items: center; margin: 0; font-size: 16px; font-weight: 600; color: #1e293b; }
.view-toggle { display: flex; gap: 4px; padding: 3px; background: #f1f5f9; border-radius: 8px; }
.toggle-btn { padding: 6px 10px; color: #64748b; cursor: pointer; background: transparent; border: none; border-radius: 6px; transition: all 0.2s; }
.toggle-btn.active { color: #1e293b; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 8%); }

/* 面包屑 */
.breadcrumb-bar { display: flex; gap: 4px; align-items: center; padding: 8px 12px; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.breadcrumb-item { display: flex; gap: 4px; align-items: center; padding: 4px 8px; font-size: 13px; color: #64748b; cursor: pointer; background: none; border: none; border-radius: 4px; transition: all 0.15s; }
.breadcrumb-item:hover { color: #2563eb; background: #eff6ff; }
.breadcrumb-item.active { font-weight: 600; color: #1e293b; }

.empty-state { display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 48px; }

/* 网格 */
.file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 12px; }
.file-card { overflow: hidden; cursor: pointer; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; transition: all 0.2s; }
.file-card:hover { border-color: #93c5fd; box-shadow: 0 4px 12px rgb(0 0 0 / 8%); transform: translateY(-2px); }
.file-preview { display: flex; align-items: center; justify-content: center; height: 110px; overflow: hidden; background: #f1f5f9; }
.folder-preview { background: #fffbeb; }
.preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.file-info { padding: 8px 10px; }
.file-name { margin: 0; overflow: hidden; font-size: 12px; font-weight: 500; color: #334155; text-overflow: ellipsis; white-space: nowrap; }
.file-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.file-size { font-size: 11px; color: #94a3b8; }
.download-btn { display: flex; padding: 4px; color: #64748b; cursor: pointer; background: transparent; border: none; border-radius: 4px; }
.download-btn:hover { color: #2563eb; background: #eff6ff; }

/* 列表 */
.file-list { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 8px; }
.list-header { display: grid; grid-template-columns: 1fr 120px 80px 160px; padding: 10px 16px; font-size: 12px; font-weight: 600; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.list-row { display: grid; grid-template-columns: 1fr 120px 80px 160px; padding: 8px 16px; font-size: 13px; align-items: center; border-bottom: 1px solid #f1f5f9; cursor: pointer; }
.list-row:hover { background: #f8fafc; }
.col-name { display: flex; gap: 8px; align-items: center; overflow: hidden; }
.col-name a { overflow: hidden; color: #2563eb; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.col-name a:hover { text-decoration: underline; }
.col-action { display: flex; gap: 8px; }
.action-btn { display: flex; gap: 4px; align-items: center; padding: 4px 8px; font-size: 12px; color: #3b82f6; cursor: pointer; background: transparent; border: none; border-radius: 4px; }
.action-btn:hover { background: #eff6ff; }
.type-tag { padding: 2px 8px; font-size: 11px; font-weight: 500; border-radius: 4px; }
.type-image { color: #16a34a; background: #f0fdf4; }
.type-table { color: #2563eb; background: #eff6ff; }
.type-pdf { color: #ea580c; background: #fff7ed; }
.type-binary { color: #64748b; background: #f1f5f9; }
.type-folder { color: #d97706; background: #fffbeb; }

/* 图片预览 */
.preview-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 80%); }
.preview-modal { max-width: 90vw; max-height: 90vh; }
.preview-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; color: #fff; background: rgb(0 0 0 / 60%); border-radius: 8px 8px 0 0; }
.preview-header button { cursor: pointer; background: none; border: none; }
.preview-full-img { max-width: 90vw; max-height: calc(90vh - 44px); object-fit: contain; border-radius: 0 0 8px 8px; }

/* 报告 */
.report-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 50%); }
.report-modal { display: flex; flex-direction: column; width: 90vw; height: 90vh; overflow: hidden; background: #fff; border-radius: 12px; }
.report-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
.report-header button { padding: 4px; cursor: pointer; background: none; border: none; }
.report-iframe { flex: 1; width: 100%; border: none; }
</style>
