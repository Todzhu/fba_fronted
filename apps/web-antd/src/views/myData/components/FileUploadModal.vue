<script setup lang="ts">
import { ref } from 'vue';
import { Modal, Upload, Button, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { UploadChangeParam, UploadProps } from 'ant-design-vue';

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'upload']);

const fileList = ref<UploadProps['fileList']>([]);
const uploading = ref(false);

const handleChange = (info: UploadChangeParam) => {
  let resFileList = [...info.fileList];
  // Limit to 5 files for mock demo
  resFileList = resFileList.slice(-5);
  fileList.value = resFileList;
};

const handleOk = () => {
  if (!fileList.value || fileList.value.length === 0) {
    message.warning('请先选择文件');
    return;
  }
  
  uploading.value = true;
  
  // Simulate upload delay
  setTimeout(() => {
    // Emit uploaded files details to parent
    const filesToUpload = fileList.value?.map(f => ({
      name: f.name,
      size: f.size ? (f.size / 1024).toFixed(1) + ' KB' : '0 KB',
      type: f.name.split('.').pop() || 'file'
    }));
    
    emit('upload', filesToUpload);
    
    uploading.value = false;
    fileList.value = [];
    emit('update:open', false);
    message.success('文件上传成功');
  }, 1500);
};

const handleCancel = () => {
  if (!uploading.value) {
    fileList.value = [];
    emit('update:open', false);
  }
};

const customRequest = ({ onSuccess }: any) => {
    // Mock successful upload immediately for the UI state
    setTimeout(() => {
       onSuccess("ok");
    }, 0);
};
</script>

<template>
  <Modal
    :open="open"
    title="上传文件"
    @ok="handleOk"
    @cancel="handleCancel"
    :confirmLoading="uploading"
    :okText="uploading ? '上传中...' : '开始上传'"
    :cancelButtonProps="{ disabled: uploading }"
    width="500px"
  >
    <div class="mt-4">
        <Upload.Dragger
            v-model:fileList="fileList"
            name="file"
            :multiple="true"
            :customRequest="customRequest"
            @change="handleChange"
        >
            <p class="ant-upload-drag-icon">
                <IconifyIcon icon="ant-design:cloud-upload-outlined" class="text-4xl text-blue-500" />
            </p>
            <p class="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p class="ant-upload-hint">支持多文件上传，Mock 模式下仅模拟过程</p>
        </Upload.Dragger>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-upload-drag-icon) {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}
</style>
