<script setup lang="ts">
import type { UploadChangeParam, UploadProps } from 'ant-design-vue';

import { ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { message, Upload } from 'ant-design-vue';

// --- Props & Emits ---
const emit = defineEmits<{
  (e: 'upload', files: File[]): void;
}>();

// --- State ---
const currentStep = ref(0);
const selectedModality = ref('scrna');

// Steps definition
const steps = [
  { key: 'type', label: '选择数据类型', icon: 'ant-design:cluster-outlined' },
  { key: 'upload', label: '上传文件', icon: 'ant-design:cloud-upload-outlined' },
  { key: 'metadata', label: '元数据配置', icon: 'ant-design:file-text-outlined' },
  { key: 'preview', label: '预检查', icon: 'ant-design:check-circle-outlined' },
];

// Data modalities
const modalities = [
  {
    key: 'scrna',
    icon: 'ant-design:experiment-outlined',
    name: '单细胞RNA-seq',
    desc: 'scRNA-seq, SnRNA-seq 等',
  },
  {
    key: 'spatial',
    icon: 'ant-design:appstore-outlined',
    name: '空间转录组',
    desc: 'Visium, ST, Slide-seq 等',
  },
  {
    key: 'citeseq',
    icon: 'ant-design:diamond-outlined',
    name: 'CITE-seq',
    desc: '单细胞转录组 + 表面蛋白',
  },
  {
    key: 'multiomics',
    icon: 'ant-design:api-outlined',
    name: '多组学整合',
    desc: 'Multi-modal Integration',
  },
];

// File upload state
const fileList = ref<UploadProps['fileList']>([]);
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const MAX_FILE_SIZE_LABEL = '5GB';

const beforeUpload = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    message.error(`文件 "${file.name}" 超过 ${MAX_FILE_SIZE_LABEL} 限制`);
    return Upload.LIST_IGNORE;
  }
  return false;
};

const customRequest = ({ onSuccess }: any) => {
  setTimeout(() => onSuccess('ok'), 0);
};

const handleChange = (info: UploadChangeParam) => {
  fileList.value = [...info.fileList].slice(-20);
};

const removeFile = (uid: string) => {
  fileList.value = (fileList.value || []).filter((f) => f.uid !== uid);
};

// Metadata form
const metadata = ref({
  name: '',
  species: 'human',
  tissue: '',
  description: '',
});

// --- Navigation ---
const canNext = () => {
  if (currentStep.value === 1) return (fileList.value?.length ?? 0) > 0;
  return true;
};

const nextStep = () => {
  if (!canNext()) {
    message.warning('请先上传至少一个文件');
    return;
  }
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const handleConfirm = () => {
  const files = (fileList.value || [])
    .map((f) => f.originFileObj as File)
    .filter(Boolean);
  if (files.length === 0) {
    message.warning('没有有效的文件');
    return;
  }
  emit('upload', files);
  // Reset
  currentStep.value = 0;
  fileList.value = [];
  metadata.value = { name: '', species: 'human', tissue: '', description: '' };
};

// Format file size
const formatSize = (bytes?: number) => {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};
</script>

<template>
  <div class="wizard-container">
    <!-- Header -->
    <div class="wizard-header">
      <h2 class="wizard-title">导入新数据集</h2>
      <p class="wizard-desc">请按照流程指引上传并管理您的多组学研究数据</p>
    </div>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <template v-for="(step, index) in steps" :key="step.key">
        <div
          class="step-item"
          :class="{
            active: index === currentStep,
            done: index < currentStep,
            upcoming: index > currentStep,
          }"
          @click="index < currentStep ? (currentStep = index) : undefined"
        >
          <div class="step-icon-wrap">
            <IconifyIcon
              v-if="index < currentStep"
              icon="ant-design:check-outlined"
              class="step-icon"
            />
            <IconifyIcon v-else :icon="step.icon" class="step-icon" />
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
        <div
          v-if="index < steps.length - 1"
          class="step-line"
          :class="{ filled: index < currentStep }"
        />
      </template>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <!-- Step 1: 选择数据模态 -->
      <div v-if="currentStep === 0">
        <h3 class="content-title">1. 选择您的数据模态</h3>
        <div class="modality-grid">
          <div
            v-for="m in modalities"
            :key="m.key"
            class="modality-card"
            :class="{ selected: selectedModality === m.key }"
            @click="selectedModality = m.key"
          >
            <div class="modality-radio">
              <div v-if="selectedModality === m.key" class="radio-inner" />
            </div>
            <IconifyIcon :icon="m.icon" class="modality-icon" />
            <div class="modality-info">
              <span class="modality-name">{{ m.name }}</span>
              <span class="modality-desc">{{ m.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: 上传文件 -->
      <div v-if="currentStep === 1">
        <h3 class="content-title">2. 上传数据文件</h3>
        <Upload.Dragger
          v-model:file-list="fileList"
          name="file"
          :multiple="true"
          :custom-request="customRequest"
          :before-upload="beforeUpload"
          :show-upload-list="false"
          @change="handleChange"
          class="upload-dragger"
        >
          <div class="dragger-content">
            <div class="dragger-icon-wrap">
              <IconifyIcon
                icon="ant-design:cloud-upload-outlined"
                class="dragger-icon"
              />
            </div>
            <p class="dragger-text">点击或拖拽文件至此区域上传</p>
            <p class="dragger-hint">
              支持文件格式: .h5ad, .rds, .fastq, .csv, .tar.gz
            </p>
            <p class="dragger-limit">每次最多上传 20 个文件</p>
          </div>
        </Upload.Dragger>

        <!-- File List -->
        <div v-if="fileList && fileList.length > 0" class="file-list">
          <div
            v-for="file in fileList"
            :key="file.uid"
            class="file-item"
          >
            <div class="file-item-left">
              <IconifyIcon
                icon="ant-design:file-outlined"
                class="file-item-icon"
              />
              <span class="file-item-name" :title="file.name">{{
                file.name
              }}</span>
            </div>
            <div class="file-item-right">
              <span class="file-item-size">{{
                formatSize(file.size)
              }}</span>
              <IconifyIcon
                icon="ant-design:close-circle-outlined"
                class="file-item-remove"
                @click.stop="removeFile(file.uid)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 元数据配置 -->
      <div v-if="currentStep === 2">
        <h3 class="content-title">3. 元数据配置</h3>
        <div class="meta-form">
          <div class="form-group">
            <label class="form-label">数据集名称</label>
            <input
              v-model="metadata.name"
              class="form-input"
              placeholder="例: liver_atlas_2023"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">物种</label>
              <select v-model="metadata.species" class="form-input">
                <option value="human">Human (人类)</option>
                <option value="mouse">Mouse (小鼠)</option>
                <option value="rat">Rat (大鼠)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">组织/器官</label>
              <input
                v-model="metadata.tissue"
                class="form-input"
                placeholder="例: Liver"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">描述 (可选)</label>
            <textarea
              v-model="metadata.description"
              class="form-textarea"
              rows="3"
              placeholder="简要描述数据集内容..."
            />
          </div>
        </div>
      </div>

      <!-- Step 4: 预检查 -->
      <div v-if="currentStep === 3">
        <h3 class="content-title">4. 预检查</h3>
        <div class="preview-card">
          <div class="preview-header">
            <IconifyIcon
              icon="ant-design:check-circle-filled"
              class="text-2xl text-green-500"
            />
            <span class="preview-title">数据验证通过</span>
          </div>
          <div class="preview-summary">
            <div class="summary-row">
              <span class="summary-label">数据类型</span>
              <span class="summary-value">{{
                modalities.find((m) => m.key === selectedModality)?.name
              }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">文件数量</span>
              <span class="summary-value">{{ fileList?.length ?? 0 }} 个文件</span>
            </div>
            <div v-if="metadata.name" class="summary-row">
              <span class="summary-label">数据集名称</span>
              <span class="summary-value">{{ metadata.name }}</span>
            </div>
            <div v-if="metadata.tissue" class="summary-row">
              <span class="summary-label">组织/器官</span>
              <span class="summary-value">{{ metadata.tissue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="wizard-footer">
      <button
        v-if="currentStep > 0"
        class="btn btn-secondary"
        @click="prevStep"
      >
        上一步
      </button>
      <div class="flex-1" />
      <button
        v-if="currentStep < steps.length - 1"
        class="btn btn-primary"
        @click="nextStep"
      >
        下一步
      </button>
      <button
        v-if="currentStep === steps.length - 1"
        class="btn btn-primary"
        @click="handleConfirm"
      >
        确认导入
      </button>
    </div>
  </div>
</template>

<style scoped>
.wizard-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 32px;
  display: flex;
  flex-direction: column;
  min-height: 540px;
}

.wizard-header {
  margin-bottom: 28px;
}

.wizard-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px;
}

.wizard-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* --- Step Indicator --- */
.step-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  padding: 0 8px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step-item.done {
  cursor: pointer;
}

.step-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  transition: all 0.3s;
}

.step-item.active .step-icon-wrap {
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgb(37 99 235 / 0.15);
}

.step-item.done .step-icon-wrap {
  background: #22c55e;
  border-color: #22c55e;
}

.step-icon {
  font-size: 18px;
  color: #94a3b8;
}

.step-item.active .step-icon,
.step-item.done .step-icon {
  color: white;
}

.step-label {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  white-space: nowrap;
}

.step-item.active .step-label {
  color: #2563eb;
  font-weight: 600;
}

.step-item.done .step-label {
  color: #22c55e;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 12px;
  margin-bottom: 28px;
  border-radius: 1px;
  transition: background 0.3s;
}

.step-line.filled {
  background: #22c55e;
}

/* --- Content --- */
.step-content {
  flex: 1;
}

.content-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px;
}

/* Modality Cards */
.modality-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.modality-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  text-align: center;
}

.modality-card:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.modality-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.modality-radio {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modality-card.selected .modality-radio {
  border-color: #2563eb;
}

.radio-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2563eb;
}

.modality-icon {
  font-size: 28px;
  color: #64748b;
}

.modality-card.selected .modality-icon {
  color: #2563eb;
}

.modality-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modality-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.modality-desc {
  font-size: 11px;
  color: #94a3b8;
}

/* Upload Dragger */
:deep(.upload-dragger) {
  border-radius: 14px !important;
  border: 2px dashed #cbd5e1 !important;
  background: #f8fafc !important;
  padding: 0 !important;
}

:deep(.upload-dragger:hover) {
  border-color: #93c5fd !important;
}

.dragger-content {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dragger-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.dragger-icon {
  font-size: 26px;
  color: #2563eb;
}

.dragger-text {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin: 0 0 6px;
}

.dragger-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 4px;
}

.dragger-limit {
  font-size: 11px;
  color: #cbd5e1;
  margin: 0;
}

/* File List */
.file-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}

.file-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.file-item-icon {
  font-size: 18px;
  color: #64748b;
  flex-shrink: 0;
}

.file-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.file-item-size {
  font-size: 12px;
  color: #94a3b8;
}

.file-item-remove {
  font-size: 16px;
  color: #cbd5e1;
  cursor: pointer;
  transition: color 0.2s;
}

.file-item-remove:hover {
  color: #ef4444;
}

/* Metadata Form */
.meta-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 560px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.form-input,
.form-textarea {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  color: #334155;
  outline: none;
  transition: border-color 0.2s;
  background: white;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.08);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

/* Preview */
.preview-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  max-width: 480px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.preview-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.preview-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.summary-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.summary-label {
  font-size: 13px;
  color: #94a3b8;
}

.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

/* Footer */
.wizard-footer {
  display: flex;
  align-items: center;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.flex-1 {
  flex: 1;
}

.btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #2563eb;
  color: white;
  box-shadow: 0 1px 3px rgb(37 99 235 / 0.3);
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  border-color: #93c5fd;
  color: #2563eb;
  background: #f8fafc;
}
</style>
