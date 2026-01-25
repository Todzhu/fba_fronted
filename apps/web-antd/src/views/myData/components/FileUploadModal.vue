<script setup lang="ts">
import type { UploadChangeParam, UploadProps } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { message, Modal, Progress, Upload } from 'ant-design-vue';

interface Props {
  open: boolean;
  loading?: boolean;
  progress?: { current: number; fileName: string; total: number };
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  progress: () => ({ current: 0, total: 0, fileName: '' }),
});
const emit = defineEmits(['update:open', 'upload']);

const fileList = ref<UploadProps['fileList']>([]);

// 计算进度百分比
const progressPercent = computed(() => {
  if (!props.progress || props.progress.total === 0) return 0;
  return Math.round((props.progress.current / props.progress.total) * 100);
});

const handleChange = (info: UploadChangeParam) => {
  let resFileList = [...info.fileList];
  resFileList = resFileList.slice(-10); // 限制最多10个文件
  fileList.value = resFileList;
};

const handleOk = async () => {
  if (!fileList.value || fileList.value.length === 0) {
    message.warning('请先选择文件');
    return;
  }

  // 提取真正的File对象
  const filesToUpload = fileList.value
    .map((f) => f.originFileObj as File)
    .filter((f) => f !== undefined && f !== null) as File[];

  if (filesToUpload.length === 0) {
    message.warning('没有有效的文件');
    return;
  }

  emit('upload', filesToUpload);
  // 注意：不在这里关闭弹窗，由父组件控制
};

const handleCancel = () => {
  if (!props.loading) {
    fileList.value = [];
    emit('update:open', false);
  }
};

const customRequest = ({ onSuccess }: any) => {
  setTimeout(() => {
    onSuccess('ok');
  }, 0);
};
</script>

<template>
  <Modal
    :open="open"
    title="上传文件"
    @ok="handleOk"
    @cancel="handleCancel"
    :confirm-loading="loading"
    :ok-text="loading ? '上传中...' : '开始上传'"
    :cancel-button-props="{ disabled: loading }"
    :closable="!loading"
    :mask-closable="!loading"
    width="520px"
  >
    <div class="mt-4">
      <!-- 上传区域 -->
      <Upload.Dragger
        v-if="!loading"
        v-model:file-list="fileList"
        name="file"
        :multiple="true"
        :custom-request="customRequest"
        @change="handleChange"
      >
        <p class="ant-upload-drag-icon">
          <IconifyIcon
            icon="ant-design:cloud-upload-outlined"
            class="text-4xl text-blue-500"
          />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此处上传</p>
        <p class="ant-upload-hint">支持多文件上传，单文件最大支持 500MB</p>
      </Upload.Dragger>

      <!-- 上传进度区域 -->
      <div v-else class="upload-progress-area">
        <div class="progress-icon">
          <IconifyIcon
            icon="ant-design:cloud-upload-outlined"
            class="animate-pulse text-5xl text-blue-500"
          />
        </div>
        <div class="progress-info">
          <div class="progress-title">
            正在上传 ({{ progress.current }}/{{ progress.total }})
          </div>
          <div class="progress-filename" :title="progress.fileName">
            {{ progress.fileName }}
          </div>
          <Progress
            :percent="progressPercent"
            status="active"
            :stroke-color="{ from: '#108ee9', to: '#87d068' }"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-upload-drag-icon) {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.upload-progress-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
}

.progress-icon {
  margin-bottom: 24px;
}

.progress-info {
  width: 100%;
  text-align: center;
}

.progress-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.progress-filename {
  max-width: 300px;
  margin-right: auto;
  margin-bottom: 16px;
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
