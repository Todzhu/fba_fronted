<script lang="ts" setup>
/**
 * DataFileSelector - 现代科学拖拽式版 (Pro Max)
 *
 * 特性：
 * - 支持三种模式：本地上传、我的数据、示例数据
 * - 集成 Ant Design Segmented 控制器
 * - 优化的数据预览表格
 */
import { ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Button,
  message,
  Segmented,
  TreeSelect,
  Upload,
} from 'ant-design-vue';

import { getUserFolderTree } from '#/api/my-data';

import SpreadsheetPreview from './SpreadsheetPreview.vue';

interface FileConfig {
  key: string;
  label?: string;
  required?: boolean;
  extensions?: string[];
  description?: string; // 新增：文件描述
}

interface InputSchema {
  files?: FileConfig[];
}

interface UploadedFile {
  name: string;
  size?: number;
  data: string[][];
  type: 'local' | 'cloud' | 'example';
}

const props = defineProps<{
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, null | number>): void;
}>();

// 模式定义
type InputMode = 'upload' | 'myData' | 'example';

const activeMode = ref<Record<string, InputMode>>({});
const folderTree = ref<any[]>([]);
const loadingTree = ref(false);
const fileState = ref<Record<string, UploadedFile>>({});
const isDragOver = ref<Record<string, boolean>>({});

const supportedModes = [
  { label: '本地上传', value: 'upload', payload: { icon: 'mdi:tray-upload', label: '本地上传' } },
  { label: '我的数据', value: 'myData', payload: { icon: 'mdi:folder-cloud-outline', label: '我的数据' } },
  { label: '示例数据', value: 'example', payload: { icon: 'mdi:file-certificate-outline', label: '示例数据' } },
];

// 初始化默认选中及模式
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

const updateFileId = (key: string, fileId: null | number) => {
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

// 处理本地文件上传
const handleFile = (file: File, key: string) => {
  if (!checkExtension(file, key)) return false;

  const reader = new FileReader();
  reader.addEventListener('load', (e) => {
    const content = e.target?.result as string;
    const lines = content.split('\n').slice(0, 20); // 预览前20行
    const data = lines.map((line) => line.split(/[,\t]/));
    
    fileState.value[key] = {
      name: file.name,
      size: file.size,
      data,
      type: 'local',
    };
    
    // 模拟上传成功，设置临时ID
    updateFileId(key, Date.now());
    message.success(`${file.name} 上传成功`);
  });
  reader.readAsText(file);
  return false; // 阻止默认上传
};

// 处理拖拽
const handleDrop = (e: DragEvent, key: string) => {
  isDragOver.value[key] = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0 && files[0]) handleFile(files[0], key);
};

// 清除文件
const clearFile = (key: string) => {
  updateFileId(key, null);
  delete fileState.value[key];
};

// 选择示例数据
const selectExample = (key: string) => {
  fileState.value[key] = {
    name: 'example_data.csv',
    size: 1024,
    data: [
      ['Group', 'Value', 'Score'],
      ['A', '12.5', '98'],
      ['B', '15.2', '85'],
      ['A', '11.8', '92'],
      ['C', '14.1', '88'],
    ],
    type: 'example',
  };
  // 模拟示例ID
  updateFileId(key, 12345);
  message.success('已加载示例数据');
};

const getPreviewData = (key: string) => fileState.value[key]?.data || [];
</script>

<template>
  <div class="file-selector-container">
    <div v-for="file in schema?.files ?? []" :key="file.key" class="file-card">
      <div class="card-header">
        <div class="file-title-group">
          <div class="file-title">
            <Icon icon="mdi:file-document-outline" class="title-icon" />
            <span class="title-text">{{ file.label || file.key }}</span>
            <span v-if="file.required" class="required-mark">*</span>
          </div>
          <div v-if="file.description" class="file-desc">
            {{ file.description }}
          </div>
        </div>

        <!-- 模式切换 -->
        <div class="mode-switch">
          <Segmented
            v-model:value="activeMode[file.key]"
            :options="supportedModes"
            size="small"
          >
            <template #label="{ payload }">
              <span class="segment-label">
                <Icon :icon="payload.icon" class="segment-icon" />
                {{ payload.label }}
              </span>
            </template>
          </Segmented>
        </div>
      </div>

      <div class="card-content">
        <!-- 模式1: 本地上传 -->
        <div v-if="activeMode[file.key] === 'upload'" class="add-mode-panel">
          <div v-if="fileState[file.key]" class="file-preview-card">
            <div class="file-status-bar">
              <div class="file-meta">
                <Icon icon="mdi:file-check" class="success-icon" />
                <span class="filename">{{ fileState[file.key].name }}</span>
                <span class="filesize" v-if="fileState[file.key]?.size">
                  {{ (fileState[file.key]?.size! / 1024).toFixed(1) }} KB
                </span>
                <span class="tag-local">本地</span>
              </div>
              <Button type="text" danger size="small" @click="clearFile(file.key)">
                <Icon icon="mdi:close" />
              </Button>
            </div>
            
            <!-- Preview Table -->
            <div class="spreadsheet-preview-wrapper" v-if="fileState[file.key].data">
              <SpreadsheetPreview 
                :data="getPreviewData(file.key)" 
                :height="450"
              />
            </div>
          </div>

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
            >
              <div class="drop-content">
                <div class="upload-icon-box">
                  <Icon icon="mdi:cloud-upload-outline" />
                </div>
                <div class="upload-main-text">点击或拖拽上传数据文件</div>
                <div class="upload-sub-text" v-if="file.extensions">
                  支持格式: {{ file.extensions.join(', ') }}
                </div>
              </div>
            </Upload>
          </div>
        </div>

        <!-- 模式2: 我的数据 -->
        <div v-else-if="activeMode[file.key] === 'myData'" class="add-mode-panel">
          <div class="my-data-wrapper">
            <TreeSelect
              :value="modelValue[file.key]"
              :tree-data="folderTree"
              :loading="loadingTree"
              placeholder="请选择云端数据文件..."
              tree-default-expand-all
              allow-clear
              class="data-tree-select"
              @change="(val: number) => updateFileId(file.key, val)"
              @focus="loadFolderTree"
            >
              <template #suffixIcon>
                <Icon icon="mdi:folder-outline" />
              </template>
            </TreeSelect>
            <div class="helper-text">
              <Icon icon="mdi:information-outline" class="info-icon" />
              从您的云端存储空间中直接选择文件，无需重复上传
            </div>
          </div>
        </div>

        <!-- 模式3: 示例数据 -->
        <div v-else class="add-mode-panel">
          <div 
            class="example-card" 
            :class="{ active: modelValue[file.key] === 12345 }"
            @click="selectExample(file.key)"
          >
            <div class="example-icon">
              <Icon icon="mdi:table" />
            </div>
            <div class="example-info">
              <div class="example-name">example_data.csv</div>
              <div class="example-desc">标准示例数据集，包含分组、数值与评分</div>
            </div>
            <div class="selection-indicator">
              <Icon icon="mdi:check-circle" v-if="modelValue[file.key] === 12345" />
              <div class="circle" v-else></div>
            </div>
          </div>
          
          <!-- 示例预览 -->
          <div v-if="fileState[file.key]?.type === 'example'" class="file-preview-card mt-2">
             <div class="spreadsheet-preview-wrapper">
              <SpreadsheetPreview 
                :data="getPreviewData(file.key)" 
                :height="450"
              />
            </div>
          </div>
        </div>
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
  padding-bottom: 24px;
  border-bottom: 1px dashed #e2e8f0;
}

.file-card:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.file-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.required-mark {
  color: #ef4444;
}

.file-desc {
  font-size: 12px;
  color: #94a3b8;
}

.title-icon {
  font-size: 18px;
  color: var(--primary-color);
}

.segment-label {
  display: flex;
  gap: 6px;
  align-items: center;
}

.segment-icon {
  font-size: 14px;
}

/* Upload Style */
.upload-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  cursor: pointer;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  transition: all 0.2s;
}

.upload-drop-zone:hover,
.upload-drop-zone.is-dragover {
  background: #eff6ff;
  border-color: var(--primary-color);
}

.drop-content {
  text-align: center;
}

.upload-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  font-size: 24px;
  color: var(--primary-color);
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgb(0 0 0 / 5%);
}

.upload-main-text {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.upload-sub-text {
  font-size: 12px;
  color: #94a3b8;
}

/* Preview Card */
.file-preview-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.file-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.file-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.success-icon {
  color: #10b981;
}

.filename {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.filesize {
  font-size: 12px;
  color: #64748b;
}

.tag-local {
  padding: 1px 6px;
  font-size: 10px;
  color: #3b82f6;
  background: #eff6ff;
  border-radius: 4px;
}

.spreadsheet-preview-wrapper {
  padding: 8px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
}

/* My Data */
.my-data-wrapper {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.data-tree-select {
  width: 100%;
}

.helper-text {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

/* Example Card */
.example-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.example-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
}

.example-card.active {
  background: #f0f9ff;
  border-color: var(--primary-color);
}

.example-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  color: var(--primary-color);
  background: #eff6ff;
  border-radius: 8px;
}

.example-info {
  flex: 1;
}

.example-name {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.example-desc {
  font-size: 12px;
  color: #64748b;
}

.selection-indicator .circle {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
}

.selection-indicator .iconify {
  font-size: 20px;
  color: var(--primary-color);
}

.mt-2 {
  margin-top: 8px;
}

.empty-config {
  padding: 20px;
  color: #94a3b8;
  text-align: center;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}
</style>
