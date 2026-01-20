<script setup lang="ts">
import { Card, Checkbox, Tooltip } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { FileItem } from '../mock';
import { ref } from 'vue';

interface Props {
  files: FileItem[];
  loading?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['selection-change', 'download', 'delete', 'enter', 'preview']);

const selectedIds = ref<Set<string>>(new Set());

// ...

// In template:
// @dblclick="file.type === 'folder' ? emit('enter', file) : emit('preview', file)"

const getFileIcon = (type: string, icon?: string) => {
  if (type === 'folder') return 'ant-design:folder-outlined';
  switch (icon) {
    case 'image': return 'ant-design:file-image-outlined';
    case 'pdf': return 'ant-design:file-pdf-outlined';
    case 'excel': return 'ant-design:file-excel-outlined';
    case 'word': return 'ant-design:file-word-outlined';
    case 'markdown': return 'ant-design:file-markdown-outlined';
    case 'archive': return 'ant-design:file-zip-outlined';
    case 'audio': return 'ant-design:sound-outlined';
    case 'video': return 'ant-design:video-camera-outlined';
    case 'code': return 'ant-design:code-outlined';
    default: return 'ant-design:file-outlined';
  }
};

const getIconColor = (icon?: string) => {
  switch (icon) {
    case 'image': return '#ff4d4f';
    case 'pdf': return '#ff4d4f';
    case 'excel': return '#52c41a';
    case 'word': return '#1890ff';
    case 'markdown': return '#000000';
    case 'archive': return '#fa8c16';
    case 'audio': return '#faad14';
    case 'video': return '#722ed1';
    case 'code': return '#13c2c2';
    default: return '#8c8c8c';
  }
};

const toggleSelect = (file: FileItem) => {
  if (selectedIds.value.has(file.id)) {
    selectedIds.value.delete(file.id);
  } else {
    selectedIds.value.add(file.id);
  }
  emit('selection-change', props.files.filter(f => selectedIds.value.has(f.id)));
};

const isSelected = (id: string) => selectedIds.value.has(id);
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
    <Card 
      v-for="file in files" 
      :key="file.id"
      hoverable
      class="file-card relative"
      :class="{ 'ring-2 ring-blue-500': isSelected(file.id) }"
      @dblclick="file.type === 'folder' ? emit('enter', file) : emit('preview', file)"
    >
      <!-- Selection Checkbox -->
      <Checkbox 
        class="absolute top-2 left-2 z-10"
        :checked="isSelected(file.id)"
        @change="toggleSelect(file)"
      />
      
      <!-- File Icon -->
      <div class="flex flex-col items-center py-4">
        <IconifyIcon 
          :icon="getFileIcon(file.type, file.icon)" 
          class="text-5xl mb-3"
          :style="{ color: file.type === 'folder' ? '#faad14' : getIconColor(file.icon) }" 
        />
        <Tooltip :title="file.name">
          <div class="text-center font-medium text-gray-700 truncate w-full px-2">
            {{ file.name }}
          </div>
        </Tooltip>
        <div class="text-xs text-gray-400 mt-1">{{ file.size }}</div>
      </div>
      
      <!-- Actions on hover -->
      <div class="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip title="下载">
          <IconifyIcon 
            icon="ant-design:download-outlined" 
            class="text-gray-400 hover:text-blue-500 cursor-pointer" 
            @click.stop="emit('download', file)" 
          />
        </Tooltip>
        <Tooltip title="删除">
          <IconifyIcon 
            icon="ant-design:delete-outlined" 
            class="text-gray-400 hover:text-red-500 cursor-pointer" 
            @click.stop="emit('delete', file)" 
          />
        </Tooltip>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.file-card:hover .absolute.bottom-2 {
  opacity: 1;
}
</style>
