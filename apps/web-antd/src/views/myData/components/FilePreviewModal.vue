<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Modal, Image, Button } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { FileItem } from '../mock';

interface Props {
  open: boolean;
  file: FileItem | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open']);

const handleCancel = () => {
  emit('update:open', false);
};

const fileType = computed(() => {
    if (!props.file) return 'unknown';
    const ext = props.file.name.split('.').pop()?.toLowerCase();
    
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['json', 'js', 'ts', 'txt', 'md', 'py', 'sql', 'css', 'html'].includes(ext || '')) return 'code';
    
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
    destroyOnClose
  >
    <div class="min-h-[300px] flex flex-col justify-center items-center bg-gray-50 rounded p-4">
        
        <!-- Image -->
        <div v-if="fileType === 'image'" class="w-full flex justify-center">
            <!-- Using placeholder for mock since we don't have real file URLs -->
            <Image
                src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
                :preview="false"
                height="400px"
                class="object-contain"
            />
            <p class="text-gray-400 mt-2 text-sm">(Mock 图片预览)</p>
        </div>

        <!-- Video -->
        <div v-else-if="fileType === 'video'" class="w-full text-center">
            <video controls class="w-full max-h-[400px] bg-black rounded">
                 <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
                 Your browser does not support HTML video.
            </video>
            <p class="text-gray-400 mt-2 text-sm">(Mock 视频预览)</p>
        </div>

        <!-- Audio -->
        <div v-else-if="fileType === 'audio'" class="w-full flex flex-col items-center p-10">
            <IconifyIcon icon="ant-design:audio-outlined" class="text-6xl text-blue-500 mb-4" />
            <audio controls class="w-full max-w-md">
                 <!-- Mock audio source -->
                 <source src="" type="audio/mpeg">
                 Your browser does not support the audio element.
            </audio>
            <p class="text-gray-400 mt-2 text-sm">(Mock 音频预览)</p>
        </div>

        <!-- Code / Text -->
        <div v-else-if="fileType === 'code'" class="w-full h-[400px] bg-[#1e1e1e] text-gray-300 p-4 rounded overflow-auto font-mono text-sm whitespace-pre">
            {{ mockCodeContent }}
        </div>

        <!-- Other / PDF -->
        <div v-else class="text-center py-10">
            <IconifyIcon :icon="file?.icon ? `ant-design:${file.icon}-outlined` : 'ant-design:file-outlined'" class="text-6xl text-gray-300 mb-4" />
            <p class="text-gray-500 mb-4">该文件类型暂不支持在线预览</p>
            <Button type="primary">下载文件</Button>
        </div>

    </div>
  </Modal>
</template>
