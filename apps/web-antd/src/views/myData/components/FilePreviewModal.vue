<script setup lang="ts">
import type { FileItem } from '../mock';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Image, message, Modal } from 'ant-design-vue';

import { downloadMyDataFile } from '#/api/my-data';

interface Props {
  open: boolean;
  file: FileItem | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open']);

const handleCancel = () => {
  emit('update:open', false);
};

// 下载文件
const handleDownload = async () => {
  if (!props.file || props.file.type !== 'file') return;

  message.loading({
    content: `正在准备下载 ${props.file.name}...`,
    key: 'download',
  });
  try {
    const res = await downloadMyDataFile(Number(props.file.id));
    const blob = new Blob([res as any]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = props.file.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    message.success({ content: '下载开始', key: 'download' });
  } catch (error: any) {
    message.error({ content: error.message || '下载失败', key: 'download' });
  }
};

const fileType = computed(() => {
  if (!props.file) return 'unknown';
  const ext = props.file.name.split('.').pop()?.toLowerCase();

  if (['gif', 'jpeg', 'jpg', 'png', 'svg'].includes(ext || '')) return 'image';
  if (['mov', 'mp4', 'webm'].includes(ext || '')) return 'video';
  if (['mp3', 'ogg', 'wav'].includes(ext || '')) return 'audio';
  if (['pdf'].includes(ext || '')) return 'pdf';
  if (
    ['css', 'html', 'js', 'json', 'md', 'py', 'sql', 'ts', 'txt'].includes(
      ext || '',
    )
  )
    return 'code';

  return 'other';
});

// Mock content for code/text
const mockCodeContent = `// This is a preview of the file content
{
  "name": "example",
  "version": "1.0.0",
  "description": "Mock file content for preview"
}
`;
</script>

<template>
  <Modal
    :open="open"
    :title="file?.name || '文件预览'"
    @cancel="handleCancel"
    :footer="null"
    width="800px"
    centered
    destroy-on-close
  >
    <div
      class="flex min-h-[300px] flex-col items-center justify-center rounded bg-gray-50 p-4"
    >
      <!-- Image -->
      <div v-if="fileType === 'image'" class="flex w-full justify-center">
        <!-- Using placeholder for mock since we don't have real file URLs -->
        <Image
          src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
          :preview="false"
          height="400px"
          class="object-contain"
        />
        <p class="mt-2 text-sm text-gray-400">(Mock 图片预览)</p>
      </div>

      <!-- Video -->
      <div v-else-if="fileType === 'video'" class="w-full text-center">
        <video controls class="max-h-[400px] w-full rounded bg-black">
          <source
            src="https://www.w3schools.com/html/mov_bbb.mp4"
            type="video/mp4"
          />
          Your browser does not support HTML video.
        </video>
        <p class="mt-2 text-sm text-gray-400">(Mock 视频预览)</p>
      </div>

      <!-- Audio -->
      <div
        v-else-if="fileType === 'audio'"
        class="flex w-full flex-col items-center p-10"
      >
        <IconifyIcon
          icon="ant-design:audio-outlined"
          class="mb-4 text-6xl text-blue-500"
        />
        <audio controls class="w-full max-w-md">
          <!-- Mock audio source -->
          <source src="" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
        <p class="mt-2 text-sm text-gray-400">(Mock 音频预览)</p>
      </div>

      <!-- Code / Text -->
      <div
        v-else-if="fileType === 'code'"
        class="h-[400px] w-full overflow-auto whitespace-pre rounded bg-[#1e1e1e] p-4 font-mono text-sm text-gray-300"
      >
        {{ mockCodeContent }}
      </div>

      <!-- Other / PDF -->
      <div v-else class="py-10 text-center">
        <IconifyIcon
          :icon="
            file?.icon
              ? `ant-design:${file.icon}-outlined`
              : 'ant-design:file-outlined'
          "
          class="mb-4 text-6xl text-gray-300"
        />
        <p class="mb-4 text-gray-500">该文件类型暂不支持在线预览</p>
        <Button type="primary" @click="handleDownload">下载文件</Button>
      </div>
    </div>
  </Modal>
</template>
