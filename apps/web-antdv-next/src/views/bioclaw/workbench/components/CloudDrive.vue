<template>
  <div
    class="cloud-page"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- 拖拽上传覆盖层 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isDragging" class="drag-overlay">
          <div class="drag-box">
            <IconifyIcon icon="ant-design:cloud-upload-outlined" class="drag-icon" />
            <p class="drag-text">松开鼠标上传文件</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 顶部工具栏 -->
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">云盘</h2>
        <div class="breadcrumb">
          <span
            class="bread-item"
            :class="{ active: parentStack.length === 0 }"
            @click="navigateToRoot"
          >
            <IconifyIcon icon="ant-design:home-outlined" style="font-size: 14px;" />
            根目录
          </span>
          <template v-for="(seg, i) in parentStack" :key="seg.id">
            <IconifyIcon icon="ant-design:right-outlined" class="bread-sep" />
            <span
              class="bread-item"
              :class="{ active: i === parentStack.length - 1 }"
              @click="navigateToIndex(i)"
            >
              {{ seg.name }}
            </span>
          </template>
        </div>
      </div>
      <div class="topbar-right">
        <!-- 搜索 -->
        <div class="search-box" :class="{ expanded: isSearching }">
          <IconifyIcon icon="ant-design:search-outlined" class="search-icon" @click="isSearching = true" />
          <input
            v-if="isSearching"
            ref="searchInputRef"
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索文件..."
            @keyup.enter="doSearch"
            @blur="onSearchBlur"
          />
          <IconifyIcon
            v-if="isSearching && searchKeyword"
            icon="ant-design:close-circle-filled"
            class="search-clear"
            @click="clearSearch"
          />
        </div>
        <button class="btn-outline" @click="showNewFolderModal = true">
          <IconifyIcon icon="ant-design:folder-add-outlined" />
          新建文件夹
        </button>
        <button class="btn-primary" @click="triggerUpload">
          <IconifyIcon icon="ant-design:upload-outlined" />
          上传文件
        </button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          style="display: none;"
          @change="onFileSelected"
        />
      </div>
    </div>

    <!-- 存储用量 -->
    <div class="storage-bar">
      <div class="storage-info">
        <span class="storage-label">存储用量</span>
        <span class="storage-value">{{ formatSize(storageUsed) }} / {{ formatSize(storageQuota) }}</span>
      </div>
      <div class="storage-track">
        <div class="storage-fill" :style="{ width: storagePercent + '%' }"></div>
      </div>
    </div>

    <!-- 上传进度条 -->
    <Transition name="slide-down">
      <div v-if="uploadingFiles.length > 0" class="upload-progress-bar">
        <div v-for="(uf, idx) in uploadingFiles" :key="idx" class="upload-item">
          <IconifyIcon icon="ant-design:loading-outlined" class="upload-spin" />
          <span class="upload-name">{{ uf.name }}</span>
          <span class="upload-status">上传中...</span>
        </div>
      </div>
    </Transition>

    <!-- 文件列表 -->
    <div class="file-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="files.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <IconifyIcon icon="ant-design:inbox-outlined" class="empty-icon" />
        </div>
        <h3 class="empty-title">{{ searchKeyword ? '未找到匹配文件' : '这里空空如也' }}</h3>
        <p class="empty-desc">{{ searchKeyword ? '尝试不同的关键词' : '上传文件或创建文件夹开始使用' }}</p>
        <button v-if="!searchKeyword" class="btn-primary" @click="triggerUpload" style="margin-top: 8px;">
          <IconifyIcon icon="ant-design:upload-outlined" />
          上传文件
        </button>
      </div>

      <!-- 文件表格 -->
      <table v-else class="file-table">
        <thead>
          <tr>
            <th class="col-name">名称</th>
            <th class="col-size">大小</th>
            <th class="col-type">类型</th>
            <th class="col-time">修改时间</th>
            <th class="col-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="file in files"
            :key="file.id"
            class="file-row"
            :class="{ selected: selectedIds.has(file.id) }"
            @click="toggleSelect(file.id, $event)"
            @dblclick="file.type === 'folder' && enterFolder(file)"
          >
            <td class="col-name">
              <div class="file-name-cell">
                <div class="file-icon-wrap" :class="file.type === 'folder' ? 'icon-folder' : 'icon-file'">
                  <IconifyIcon
                    :icon="file.type === 'folder' ? 'ant-design:folder-filled' : getFileIcon(file.name)"
                    class="file-type-icon"
                  />
                </div>
                <!-- 行内重命名 -->
                <input
                  v-if="renamingId === file.id"
                  ref="renameInputRef"
                  v-model="renameValue"
                  class="rename-input"
                  @keyup.enter="confirmRename(file)"
                  @keyup.escape="cancelRename"
                  @blur="confirmRename(file)"
                  @click.stop
                />
                <span v-else class="file-name" @dblclick.stop="file.type === 'folder' ? enterFolder(file) : undefined">
                  {{ file.name }}
                </span>
              </div>
            </td>
            <td class="col-size">{{ file.type === 'folder' ? '-' : formatSize(file.size) }}</td>
            <td class="col-type">
              <span class="type-badge" :class="'type-' + getTypeClass(file)">
                {{ file.type === 'folder' ? '文件夹' : getExtLabel(file.name) }}
              </span>
            </td>
            <td class="col-time">{{ formatTime(file.updated_time || file.created_time) }}</td>
            <td class="col-action" @click.stop>
              <div class="action-group">
                <button
                  v-if="file.type === 'file'"
                  class="row-action-btn"
                  title="下载"
                  @click="handleDownload(file)"
                >
                  <IconifyIcon icon="ant-design:download-outlined" />
                </button>
                <button class="row-action-btn" title="重命名" @click="startRename(file)">
                  <IconifyIcon icon="ant-design:edit-outlined" />
                </button>
                <button class="row-action-btn btn-danger" title="删除" @click="handleDelete(file)">
                  <IconifyIcon icon="ant-design:delete-outlined" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 底部状态栏 -->
    <div v-if="files.length > 0" class="status-bar">
      <span>{{ files.length }} 个项目</span>
      <span v-if="selectedIds.size > 0">
        · 已选 {{ selectedIds.size }} 项
        <button class="batch-delete-btn" @click="handleBatchDelete">
          <IconifyIcon icon="ant-design:delete-outlined" />
          批量删除
        </button>
      </span>
    </div>

    <!-- 新建文件夹弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewFolderModal" class="modal-overlay" @click.self="showNewFolderModal = false">
          <div class="modal-box" @click.stop>
            <div class="modal-header">
              <h3>新建文件夹</h3>
              <button class="modal-close" @click="showNewFolderModal = false">
                <IconifyIcon icon="ant-design:close-outlined" />
              </button>
            </div>
            <div class="modal-body">
              <label class="form-label">文件夹名称</label>
              <input
                v-model="newFolderName"
                class="form-input"
                placeholder="输入文件夹名称"
                @keyup.enter="handleCreateFolder"
              />
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="showNewFolderModal = false">取消</button>
              <button class="btn-confirm" :disabled="!newFolderName.trim()" @click="handleCreateFolder">创建</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal-box" @click.stop>
            <div class="modal-header">
              <h3>确认删除</h3>
              <button class="modal-close" @click="showDeleteModal = false">
                <IconifyIcon icon="ant-design:close-outlined" />
              </button>
            </div>
            <div class="modal-body">
              <p class="delete-warn">
                <IconifyIcon icon="ant-design:exclamation-circle-filled" style="color: #ff4d4f; font-size: 20px;" />
                {{ deleteMessage }}
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="showDeleteModal = false">取消</button>
              <button class="btn-danger-confirm" @click="confirmDelete">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { IconifyIcon } from '@vben/icons';
import {
  getMyDataFiles,
  createMyDataFolder,
  uploadMyDataFile,
  renameMyDataFile,
  deleteMyDataFile,
  batchDeleteMyDataFiles,
  getMyDataDownloadUrl,
  getStorageUsage,
  type FileItem,
} from '#/api/my-data';
import { message } from 'antdv-next';

// ============ 文件夹导航 ============
interface PathSegment { id: number | null; name: string; }

const parentStack = ref<PathSegment[]>([]);
const currentParentId = computed(() => {
  if (parentStack.value.length === 0) return undefined;
  return parentStack.value[parentStack.value.length - 1]!.id ?? undefined;
});

function navigateToRoot() {
  parentStack.value = [];
  searchKeyword.value = '';
  loadFiles();
}

function navigateToIndex(index: number) {
  parentStack.value = parentStack.value.slice(0, index + 1);
  searchKeyword.value = '';
  loadFiles();
}

function enterFolder(file: FileItem) {
  parentStack.value.push({ id: file.id, name: file.name });
  searchKeyword.value = '';
  loadFiles();
}

// ============ 文件列表 ============
const files = ref<FileItem[]>([]);
const loading = ref(false);

async function loadFiles() {
  loading.value = true;
  try {
    const res = await getMyDataFiles({
      parent_id: currentParentId.value as number | undefined,
      keyword: searchKeyword.value || undefined,
    });
    files.value = res.items;
  } catch (error) {
    message.error('加载文件列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// ============ 存储用量 ============
const storageUsed = ref(0);
const storageQuota = ref(10 * 1024 * 1024 * 1024);
const storagePercent = ref(0);

async function loadStorage() {
  try {
    const res = await getStorageUsage();
    storageUsed.value = res.used;
    storageQuota.value = res.quota;
    storagePercent.value = res.percent;
  } catch {
    // 失败时保持默认值
  }
}

// ============ 搜索 ============
const isSearching = ref(false);
const searchKeyword = ref('');
const searchInputRef = ref<HTMLInputElement>();

function doSearch() {
  loadFiles();
}

function onSearchBlur() {
  if (!searchKeyword.value) {
    isSearching.value = false;
  }
}

function clearSearch() {
  searchKeyword.value = '';
  isSearching.value = false;
  loadFiles();
}

watch(isSearching, (v) => {
  if (v) nextTick(() => searchInputRef.value?.focus());
});

// ============ 上传 ============
const fileInputRef = ref<HTMLInputElement>();
const uploadingFiles = ref<{ name: string }[]>([]);

function triggerUpload() {
  fileInputRef.value?.click();
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const fileList = input.files;
  if (!fileList || fileList.length === 0) return;
  await uploadFiles(Array.from(fileList));
  input.value = ''; // reset for re-select
}

async function uploadFiles(fileList: File[]) {
  for (const file of fileList) {
    uploadingFiles.value.push({ name: file.name });
  }
  try {
    for (const file of fileList) {
      await uploadMyDataFile(file, currentParentId.value as number | undefined);
      uploadingFiles.value = uploadingFiles.value.filter(f => f.name !== file.name);
    }
    message.success(`成功上传 ${fileList.length} 个文件`);
    loadFiles();
    loadStorage();
  } catch (error: any) {
    message.error(error?.message || '上传失败');
    uploadingFiles.value = [];
  }
}

// ============ 拖拽上传 ============
const isDragging = ref(false);
let dragCounter = 0;

function onDragOver() {
  dragCounter++;
  isDragging.value = true;
}

function onDragLeave() {
  dragCounter--;
  if (dragCounter <= 0) {
    isDragging.value = false;
    dragCounter = 0;
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  dragCounter = 0;
  const droppedFiles = e.dataTransfer?.files;
  if (droppedFiles && droppedFiles.length > 0) {
    uploadFiles(Array.from(droppedFiles));
  }
}

// ============ 新建文件夹 ============
const showNewFolderModal = ref(false);
const newFolderName = ref('');

async function handleCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) return;
  try {
    await createMyDataFolder({ name, parent_id: currentParentId.value as number | undefined });
    message.success(`文件夹「${name}」创建成功`);
    showNewFolderModal.value = false;
    newFolderName.value = '';
    loadFiles();
  } catch (error: any) {
    message.error(error?.message || '创建失败');
  }
}

// ============ 重命名 ============
const renamingId = ref<number | null>(null);
const renameValue = ref('');
const renameInputRef = ref<HTMLInputElement[]>();

function startRename(file: FileItem) {
  renamingId.value = file.id;
  renameValue.value = file.name;
  nextTick(() => {
    const inputs = renameInputRef.value;
    if (inputs && inputs.length > 0) {
      inputs[0]!.focus();
      inputs[0]!.select();
    }
  });
}

function cancelRename() {
  renamingId.value = null;
  renameValue.value = '';
}

async function confirmRename(file: FileItem) {
  const newName = renameValue.value.trim();
  if (!newName || newName === file.name) {
    cancelRename();
    return;
  }
  try {
    await renameMyDataFile(file.id, newName);
    message.success('重命名成功');
    cancelRename();
    loadFiles();
  } catch (error: any) {
    message.error(error?.message || '重命名失败');
  }
}

// ============ 删除 ============
const showDeleteModal = ref(false);
const deleteMessage = ref('');
const pendingDeleteIds = ref<number[]>([]);

function handleDelete(file: FileItem) {
  pendingDeleteIds.value = [file.id];
  deleteMessage.value = `确定要删除「${file.name}」吗？${file.type === 'folder' ? '文件夹内的所有内容都将被删除。' : ''}此操作不可恢复。`;
  showDeleteModal.value = true;
}

function handleBatchDelete() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  pendingDeleteIds.value = ids;
  deleteMessage.value = `确定要删除选中的 ${ids.length} 个项目吗？此操作不可恢复。`;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  try {
    if (pendingDeleteIds.value.length === 1) {
      await deleteMyDataFile(pendingDeleteIds.value[0]!);
    } else {
      await batchDeleteMyDataFiles(pendingDeleteIds.value);
    }
    message.success('删除成功');
    showDeleteModal.value = false;
    selectedIds.value.clear();
    loadFiles();
    loadStorage();
  } catch (error: any) {
    message.error(error?.message || '删除失败');
  }
}

// ============ 下载 ============
function handleDownload(file: FileItem) {
  const url = getMyDataDownloadUrl(file.id);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============ 多选 ============
const selectedIds = ref<Set<number>>(new Set());

function toggleSelect(id: number, e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  } else {
    // 单击不做选中，除非 ctrl
  }
}

// ============ 工具函数 ============
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  try {
    const d = new Date(timeStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return timeStr;
  }
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    csv: 'ant-design:file-excel-outlined',
    xlsx: 'ant-design:file-excel-outlined',
    xls: 'ant-design:file-excel-outlined',
    tsv: 'ant-design:file-excel-outlined',
    pdf: 'ant-design:file-pdf-outlined',
    png: 'ant-design:file-image-outlined',
    jpg: 'ant-design:file-image-outlined',
    jpeg: 'ant-design:file-image-outlined',
    gif: 'ant-design:file-image-outlined',
    svg: 'ant-design:file-image-outlined',
    txt: 'ant-design:file-text-outlined',
    md: 'ant-design:file-text-outlined',
    log: 'ant-design:file-text-outlined',
    fastq: 'ant-design:experiment-outlined',
    fq: 'ant-design:experiment-outlined',
    fasta: 'ant-design:experiment-outlined',
    fa: 'ant-design:experiment-outlined',
    bam: 'ant-design:experiment-outlined',
    vcf: 'ant-design:experiment-outlined',
    bed: 'ant-design:experiment-outlined',
    html: 'ant-design:global-outlined',
    r: 'ant-design:code-outlined',
    rds: 'ant-design:code-outlined',
    py: 'ant-design:code-outlined',
    js: 'ant-design:code-outlined',
    json: 'ant-design:code-outlined',
    zip: 'ant-design:file-zip-outlined',
    gz: 'ant-design:file-zip-outlined',
    tar: 'ant-design:file-zip-outlined',
  };
  return map[ext] || 'ant-design:file-outlined';
}

function getExtLabel(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

function getTypeClass(file: FileItem): string {
  if (file.type === 'folder') return 'folder';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) return 'data';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['r', 'py', 'js', 'json', 'rds'].includes(ext)) return 'code';
  if (['fastq', 'fq', 'fasta', 'fa', 'bam', 'vcf', 'bed'].includes(ext)) return 'bio';
  if (['zip', 'gz', 'tar'].includes(ext)) return 'archive';
  return 'other';
}

// ============ 初始化 ============
onMounted(() => {
  loadFiles();
  loadStorage();
});
</script>

<style scoped>
.cloud-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; position: relative; }

/* ===== 顶部工具栏 ===== */
.page-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid #e8e4df; flex-shrink: 0; }
.topbar-left { display: flex; align-items: center; gap: 16px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.breadcrumb { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
.bread-item { font-size: 13px; color: #999; cursor: pointer; transition: color 0.15s; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; }
.bread-item:hover { color: #555; background: #f0ece6; }
.bread-item.active { color: #1a1a1a; font-weight: 500; cursor: default; background: none; }
.bread-sep { font-size: 10px; color: #ccc; margin: 0 2px; }
.topbar-right { display: flex; gap: 10px; align-items: center; }

/* ===== 搜索 ===== */
.search-box { display: flex; align-items: center; gap: 6px; padding: 0 8px; height: 36px; border-radius: 10px; border: 1px solid transparent; transition: all 0.25s; background: transparent; }
.search-box.expanded { border-color: #d4cfc8; background: #fff; width: 200px; }
.search-icon { font-size: 16px; color: #999; cursor: pointer; transition: color 0.15s; }
.search-icon:hover { color: #555; }
.search-input { border: none; outline: none; font-size: 13px; color: #333; background: transparent; width: 100%; }
.search-clear { font-size: 14px; color: #ccc; cursor: pointer; }
.search-clear:hover { color: #999; }

/* ===== 按钮 ===== */
.btn-outline { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #d4cfc8; border-radius: 10px; background: #fff; color: #555; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.btn-outline:hover { background: #f0ece6; border-color: #bbb; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-primary:hover { background: #333; }

/* ===== 存储 ===== */
.storage-bar { padding: 12px 28px; border-bottom: 1px solid #e8e4df; background: #faf8f5; flex-shrink: 0; }
.storage-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.storage-label { font-size: 12px; color: #999; }
.storage-value { font-size: 12px; color: #666; font-weight: 500; }
.storage-track { height: 4px; background: #e8e4df; border-radius: 2px; overflow: hidden; }
.storage-fill { height: 100%; background: linear-gradient(90deg, #e8503a, #f06c58); border-radius: 2px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

/* ===== 上传进度 ===== */
.upload-progress-bar { padding: 8px 28px; background: #fef8f0; border-bottom: 1px solid #f0e6d4; flex-shrink: 0; }
.upload-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; padding: 4px 0; }
.upload-spin { animation: spin 1s linear infinite; color: #e8503a; font-size: 14px; }
.upload-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-status { color: #e8503a; font-size: 12px; font-weight: 500; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 文件列表 ===== */
.file-content { flex: 1; overflow-y: auto; }
.file-table { width: 100%; border-collapse: collapse; }
.file-table th { padding: 10px 28px; font-size: 12px; font-weight: 600; color: #999; text-align: left; border-bottom: 1px solid #e8e4df; background: #faf8f5; position: sticky; top: 0; z-index: 1; }
.file-row { transition: background 0.1s; cursor: default; }
.file-row:hover { background: #f5f2ed; }
.file-row.selected { background: #ebe7e0; }
.file-row td { padding: 12px 28px; font-size: 13px; color: #555; border-bottom: 1px solid #f0ece6; }
.col-name { width: 40%; }
.col-size { width: 10%; }
.col-type { width: 12%; }
.col-time { width: 20%; }
.col-action { width: 18%; text-align: right; }

.file-name-cell { display: flex; align-items: center; gap: 10px; }
.file-icon-wrap { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-folder { background: #fff5eb; }
.icon-file { background: #f0eff8; }
.file-type-icon { font-size: 18px; }
.icon-folder .file-type-icon { color: #ffa726; }
.icon-file .file-type-icon { color: #7c7c9a; }
.file-name { color: #333; font-weight: 500; cursor: pointer; }
.file-name:hover { color: #e8503a; }

/* ===== 类型标签 ===== */
.type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.3px; }
.type-folder { color: #ffa726; background: #fff5eb; }
.type-data { color: #43a047; background: #e8f5e9; }
.type-image { color: #8e24aa; background: #f3e5f5; }
.type-pdf { color: #e53935; background: #fce4ec; }
.type-code { color: #1e88e5; background: #e3f2fd; }
.type-bio { color: #00897b; background: #e0f2f1; }
.type-archive { color: #6d4c41; background: #efebe9; }
.type-other { color: #999; background: #f5f5f5; }

/* ===== 行内重命名 ===== */
.rename-input { border: 1px solid #e8503a; outline: none; padding: 4px 8px; border-radius: 6px; font-size: 13px; color: #333; background: #fff; min-width: 160px; }

/* ===== 操作按钮 ===== */
.action-group { display: flex; gap: 4px; justify-content: flex-end; opacity: 0; transition: opacity 0.15s; }
.file-row:hover .action-group { opacity: 1; }
.row-action-btn { background: none; border: none; color: #999; cursor: pointer; padding: 6px 8px; border-radius: 6px; font-size: 15px; transition: all 0.15s; }
.row-action-btn:hover { color: #555; background: #f0ece6; }
.row-action-btn.btn-danger:hover { color: #ff4d4f; background: #fef0ed; }

/* ===== 空状态 ===== */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; padding: 40px; }
.empty-icon-wrap { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #f0ece6 0%, #e8e4df 100%); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.empty-icon { font-size: 40px; color: #ccc; }
.empty-title { font-size: 16px; font-weight: 600; color: #555; margin: 0; }
.empty-desc { font-size: 13px; color: #aaa; margin: 0; }

/* ===== Loading ===== */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #e8e4df; border-top-color: #e8503a; border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-text { font-size: 13px; color: #999; }

/* ===== 底部状态栏 ===== */
.status-bar { padding: 8px 28px; border-top: 1px solid #e8e4df; font-size: 12px; color: #999; display: flex; align-items: center; gap: 4px; flex-shrink: 0; background: #faf8f5; }
.batch-delete-btn { background: none; border: none; color: #ff4d4f; font-size: 12px; cursor: pointer; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px; margin-left: 8px; }
.batch-delete-btn:hover { background: #fef0ed; }

/* ===== 拖拽 ===== */
.drag-overlay { position: fixed; inset: 0; background: rgba(232, 80, 58, 0.06); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.drag-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 64px; background: #fff; border: 2px dashed #e8503a; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1); }
.drag-icon { font-size: 48px; color: #e8503a; }
.drag-text { font-size: 16px; font-weight: 600; color: #555; margin: 0; }

/* ===== 弹窗 ===== */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: #fff; border-radius: 16px; width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0ece6; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.modal-close { background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: #f0ece6; }
.modal-body { padding: 24px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.form-input { width: 100%; padding: 10px 14px; border: 1px solid #e0ddd8; border-radius: 10px; font-size: 14px; color: #333; outline: none; background: #faf8f5; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; }
.form-input:focus { border-color: #e8503a; box-shadow: 0 0 0 3px rgba(232, 80, 58, 0.08); }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f0ece6; }
.btn-cancel { padding: 8px 20px; border: 1px solid #e0ddd8; border-radius: 10px; background: #fff; color: #666; font-size: 13px; cursor: pointer; }
.btn-cancel:hover { background: #f5f5f5; }
.btn-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.btn-confirm:hover { background: #333; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== 删除确认 ===== */
.delete-warn { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #555; line-height: 1.6; margin: 0; }
.btn-danger-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #ff4d4f; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.btn-danger-confirm:hover { background: #ff3333; }

/* ===== 动画 ===== */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
</style>
