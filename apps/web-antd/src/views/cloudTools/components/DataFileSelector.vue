<script lang="ts" setup>
/**
 * DataFileSelector - 现代科拖拽式学版
 *
 * 特性：
 * - 大面积虚线拖拽区域
 * - 支持拖拽上传/点击上传
 * - 上传后自动切换为预览模式，支持重新上传
 */
import { ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, message, TreeSelect, Upload } from 'ant-design-vue';

import { getUserFolderTree } from '#/api/my-data';

interface FileConfig {
  key: string;
  label?: string;
  required?: boolean;
  extensions?: string[];
}

interface InputSchema {
  files?: FileConfig[];
}

interface UploadedFile {
  name: string;
  size?: number;
  data: string[][];
}

const props = defineProps<{
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, null | number>): void;
}>();

const activeMode = ref<Record<string, 'myData' | 'upload'>>({});
const folderTree = ref<any[]>([]);
const loadingTree = ref(false);
const uploadedFiles = ref<Record<string, UploadedFile>>({});
const isDragOver = ref<Record<string, boolean>>({});

// 初始化默认选中
watch(
  () => props.schema?.files,
  (files) => {
    if (files) {
      files.forEach((f) => {
        if (!activeMode.value[f.key]) {
          activeMode.value[f.key] = 'upload';
        }
      });
    }
  },
  { immediate: true },
);

// 加载我的数据树
const loadFolderTree = async () => {
  if (folderTree.value.length > 0) return;
  loadingTree.value = true;
  try {
    const tree = await getUserFolderTree();
    folderTree.value = transformTree(tree);
  } catch {
    message.error('加载目录失败');
  } finally {
    loadingTree.value = false;
  }
};

const transformTree = (nodes: any[]): any[] => {
  return nodes.map((node) => ({
    value: node.id,
    title: node.name,
    isLeaf: node.type === 'file',
    selectable: node.type === 'file',
    children: node.children ? transformTree(node.children) : undefined,
  }));
};

const updateFile = (key: string, fileId: null | number) => {
  emit('update:modelValue', { ...props.modelValue, [key]: fileId });
};

// 检查文件扩展名
const checkExtension = (file: File, fileKey: string) => {
  const extensions = props.schema?.files?.find(
    (f) => f.key === fileKey,
  )?.extensions;
  if (!extensions || extensions.length === 0) return true;
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!extensions.some((e) => e.toLowerCase() === ext)) {
    message.warning(`不支持的文件格式，请上传 ${extensions.join(', ')}`);
    return false;
  }
  return true;
};

// 处理文件读取与上传模拟
const handleFile = (file: File, key: string) => {
  if (!checkExtension(file, key)) return false;

  const reader = new FileReader();
  reader.addEventListener('load', (e) => {
    const content = e.target?.result as string;
    const lines = content.split('\n').slice(0, 20);
    const data = lines.map((line) => line.split(/[,\t]/));
    uploadedFiles.value[key] = {
      name: file.name,
      size: file.size,
      data,
    };
    // 模拟上传成功，设置假ID
    updateFile(key, Date.now());
    message.success(`${file.name} 上传成功`);
  });
  reader.readAsText(file);
  return false; // 阻止默认上传行为，使用自定义逻辑
};

const handleDrop = (e: DragEvent, key: string) => {
  isDragOver.value[key] = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0 && files[0]) handleFile(files[0], key);
};

const clearFile = (key: string) => {
  updateFile(key, null);
  delete uploadedFiles.value[key];
};

const getPreviewData = (key: string) => uploadedFiles.value[key]?.data || [];
</script>

<template>
  <div class="file-selector-container">
    <div v-for="file in schema?.files ?? []" :key="file.key" class="file-card">
      <div class="card-header">
        <div class="file-title">
          <Icon icon="mdi:file-upload-outline" class="title-icon" />
          <span class="title-text">{{ file.label || '上传文件' }}</span>
          <span v-if="file.required" class="required-mark">*</span>
        </div>

        <!-- 切换上传方式 -->
        <div class="mode-switch">
          <span
            :class="{ active: activeMode[file.key] === 'upload' }"
            @click="activeMode[file.key] = 'upload'"
            >本地上传</span
          >
          <span class="divider">/</span>
          <span
            :class="{ active: activeMode[file.key] === 'myData' }"
            @click="activeMode[file.key] = 'myData'"
            >我的数据</span
          >
        </div>
      </div>

      <!-- 模式1: 本地上传 (Drag & Drop) -->
      <div v-if="activeMode[file.key] === 'upload'" class="upload-area">
        <!-- 已上传状态 -->
        <div v-if="uploadedFiles[file.key]" class="file-uploaded-state">
          <div class="file-info-box">
            <Icon icon="mdi:file-check-outline" class="file-icon" />
            <div class="file-details">
              <div class="file-name">{{ uploadedFiles[file.key].name }}</div>
              <div class="file-size">
                {{
                  uploadedFiles[file.key].size > 0
                    ? (uploadedFiles[file.key].size / 1024).toFixed(1)
                    : 0
                }}
                KB
              </div>
            </div>
            <Button
              type="text"
              danger
              class="delete-btn"
              @click="clearFile(file.key)"
            >
              <Icon icon="mdi:trash-can-outline" />
            </Button>
          </div>

          <div class="mini-preview" v-if="uploadedFiles[file.key]?.data">
            <div class="preview-label">数据预览 (前3行)</div>
            <table class="mini-table">
              <tbody>
                <tr
                  v-for="(row, idx) in getPreviewData(file.key).slice(0, 3)"
                  :key="idx"
                >
                  <td v-for="(cell, cIdx) in row.slice(0, 4)" :key="cIdx">
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 未上传状态 (拖拽区) -->
        <div
          v-else
          class="upload-drop-zone"
          :class="{ 'is-dragover': isDragOver[file.key] }"
          @dragover.prevent="isDragOver[file.key] = true"
          @dragleave.prevent="isDragOver[file.key] = false"
          @drop.prevent="(e) => handleDrop(e, file.key)"
        >
          <Upload
            :show-upload-list="false"
            :before-upload="(f: File) => handleFile(f, file.key)"
            :custom-request="() => {}"
          >
            <div class="drop-content">
              <div class="upload-icon-circle">
                <Icon icon="mdi:tray-upload" />
              </div>
              <p class="upload-text">
                <span class="link-text">点击上传</span> 或拖拽文件到此处
              </p>
              <p class="upload-hint" v-if="file.extensions">
                支持格式: {{ file.extensions.join(', ') }}
              </p>
            </div>
          </Upload>
        </div>
      </div>

      <!-- 模式2: 我的数据 -->
      <div v-else class="my-data-area">
        <TreeSelect
          :value="modelValue[file.key]"
          :tree-data="folderTree"
          :loading="loadingTree"
          placeholder="请选择云端数据文件..."
          tree-default-expand-all
          allow-clear
          class="data-tree-select"
          @change="(val: number) => updateFile(file.key, val)"
          @focus="loadFolderTree"
        >
          <template #suffixIcon>
            <Icon icon="mdi:folder-outline" />
          </template>
        </TreeSelect>
        <div class="data-hint">从"我的数据"空间中选择已上传的文件</div>
      </div>
    </div>

    <div v-if="!schema?.files?.length" class="empty-config">暂无文件配置</div>
  </div>
</template>

<style scoped>
.file-selector-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.file-card {
  border: 1px solid transparent;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.file-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: #1e293b;
}

.title-icon {
  font-size: 18px;
  color: var(--primary-color);
}

.required-mark {
  color: #ef4444;
}

.mode-switch {
  font-size: 13px;
  color: #94a3b8;
}

.mode-switch span {
  cursor: pointer;
  transition: color 0.2s;
}

.mode-switch span.active {
  font-weight: 500;
  color: var(--primary-color);
  border-bottom: 1px solid var(--primary-color);
}

.mode-switch .divider {
  margin: 0 8px;
  color: #e2e8f0;
  cursor: default;
}

/* Upload Drop Zone */
.upload-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 320px;
  cursor: pointer;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;
}

.upload-drop-zone:hover,
.upload-drop-zone.is-dragover {
  background: #eff6ff; /* Blue 50 */
  border-color: var(--primary-color);
}

.drop-content {
  padding: 16px;
  text-align: center;
}

.upload-icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  font-size: 20px;
  color: var(--primary-color);
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.upload-text {
  margin-bottom: 4px;
  font-size: 13px;
  color: #64748b;
}

.link-text {
  font-weight: 500;
  color: var(--primary-color);
}

.upload-hint {
  font-size: 12px;
  color: #94a3b8;
}

/* Uploaded State */
.file-uploaded-state {
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.file-info-box {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.file-icon {
  font-size: 32px;
  color: #10b981;
}

.file-details {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #1e293b;
}

.file-size {
  font-size: 12px;
  color: #94a3b8;
}

.delete-btn {
  color: #94a3b8;
}

.delete-btn:hover {
  color: #ef4444;
}

.mini-preview {
  padding: 8px;
  margin-top: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.preview-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.mini-table {
  width: 100%;
  font-size: 11px;
  color: #64748b;
  border-collapse: collapse;
}

.mini-table td {
  max-width: 60px;
  padding: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid #e2e8f0;
}

/* My Data Area */
.my-data-area {
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
}

.data-tree-select {
  width: 100%;
}

.data-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

.empty-config {
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
}
</style>
