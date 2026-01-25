<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, Image, message, Upload } from 'ant-design-vue';

import { uploadToolIconApi } from '#/api';

const props = defineProps<{
  value?: string;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
}>();

const uploading = ref(false);
const previewUrl = ref(props.value || '');

// 获取 API 基础 URL
const apiBaseUrl = import.meta.env.VITE_GLOB_API_URL || '';

// 获取完整图片 URL（处理相对路径）
const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || !url.includes('/')) {
    return url;
  }
  return `${apiBaseUrl}${url}`;
};

// 计算完整的预览图片 URL
const fullPreviewUrl = computed(() => getFullImageUrl(previewUrl.value));

// 同步外部值
watch(
  () => props.value,
  (newVal) => {
    previewUrl.value = newVal || '';
  },
);

// 判断是否是图片URL
const isImageUrl = (url: string) => {
  return url && url.includes('/');
};

// 处理上传
const handleUpload = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    message.error('请上传图片文件');
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    message.error('图片大小不能超过 5MB');
    return false;
  }

  uploading.value = true;
  try {
    const res = await uploadToolIconApi(file);
    const url = res.url;
    previewUrl.value = url;
    emit('update:value', url);
    message.success('上传成功');
  } catch (error) {
    console.error('上传失败:', error);
    message.error('上传失败');
  } finally {
    uploading.value = false;
  }

  return false;
};

// 清除图片
const handleClear = () => {
  previewUrl.value = '';
  emit('update:value', '');
};

// 手动输入图标标识
const handleInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  previewUrl.value = target.value;
  emit('update:value', target.value);
};
</script>

<template>
  <div class="icon-uploader-container">
    <!-- 左侧：预览区域 -->
    <div class="preview-section">
      <div class="preview-box">
        <!-- 图片预览 -->
        <template v-if="isImageUrl(previewUrl)">
          <Image :src="fullPreviewUrl" :preview="true" class="preview-image" />
          <button class="clear-btn" @click="handleClear">
            <Icon icon="mdi:close" class="text-xs" />
          </button>
        </template>
        <!-- 图标预览 -->
        <template v-else-if="previewUrl">
          <Icon :icon="previewUrl" class="preview-icon" />
        </template>
        <!-- 空状态 -->
        <template v-else>
          <div class="empty-state">
            <Icon icon="mdi:image-plus-outline" class="empty-icon" />
            <span class="empty-text">暂无图标</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 右侧：操作区域 -->
    <div class="action-section">
      <!-- 上传按钮 -->
      <Upload
        :before-upload="handleUpload"
        :show-upload-list="false"
        accept="image/*"
      >
        <Button :loading="uploading" type="primary" class="upload-btn">
          <template #icon>
            <Icon icon="mdi:cloud-upload-outline" />
          </template>
          {{ uploading ? '上传中...' : '上传图片' }}
        </Button>
      </Upload>

      <!-- 分隔线 -->
      <div class="divider">
        <span class="divider-text">或</span>
      </div>

      <!-- 输入框 -->
      <div class="input-section">
        <label class="input-label">图标标识</label>
        <input
          :value="previewUrl"
          class="icon-input"
          placeholder="例如：mdi:chart-bar"
          @input="handleInputChange"
        />
      </div>

      <!-- 提示文字 -->
      <div class="tips">
        <Icon icon="mdi:information-outline" class="tips-icon" />
        <span>支持 Material Design Icons 图标</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-uploader-container {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.dark .icon-uploader-container {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-color: #334155;
}

/* 预览区域 */
.preview-section {
  flex-shrink: 0;
}

.preview-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 100px;
  overflow: hidden;
  background: #fff;
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.preview-box:hover {
  border-color: #3b82f6;
}

.dark .preview-box {
  background: #1e293b;
  border-color: #475569;
}

.dark .preview-box:hover {
  border-color: #60a5fa;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-box :deep(.ant-image) {
  width: 100%;
  height: 100%;
}

.preview-box :deep(.ant-image img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-icon {
  font-size: 48px;
  color: #3b82f6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.empty-icon {
  font-size: 32px;
  color: #94a3b8;
}

.empty-text {
  font-size: 12px;
  color: #94a3b8;
}

.clear-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: #fff;
  cursor: pointer;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.preview-box:hover .clear-btn {
  opacity: 1;
}

.clear-btn:hover {
  background: #dc2626;
}

/* 操作区域 */
.action-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.upload-btn {
  width: 100%;
  height: 36px;
  font-weight: 500;
}

.divider {
  display: flex;
  gap: 12px;
  align-items: center;
}

.divider::before,
.divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background: #e2e8f0;
}

.dark .divider::before,
.dark .divider::after {
  background: #334155;
}

.divider-text {
  font-size: 12px;
  color: #94a3b8;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.dark .input-label {
  color: #94a3b8;
}

.icon-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  transition: all 0.2s;
}

.icon-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}

.icon-input::placeholder {
  color: #94a3b8;
}

.dark .icon-input {
  color: #f1f5f9;
  background: #0f172a;
  border-color: #475569;
}

.dark .icon-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgb(96 165 250 / 15%);
}

.tips {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
}

.tips-icon {
  font-size: 14px;
}
</style>
