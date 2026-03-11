<script setup lang="ts">
import { Checkbox, Tooltip } from 'ant-design-vue';
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

// 获取文件图标
const getFileIcon = (type: string, icon?: string) => {
  if (type === 'folder') return 'ant-design:folder-filled';
  switch (icon) {
    case 'image': return 'ant-design:file-image-filled';
    case 'pdf': return 'ant-design:file-pdf-filled';
    case 'excel': return 'ant-design:file-excel-filled';
    case 'word': return 'ant-design:file-word-filled';
    case 'markdown': return 'ant-design:file-markdown-filled';
    case 'archive': return 'ant-design:file-zip-filled';
    case 'audio': return 'ant-design:sound-filled';
    case 'video': return 'ant-design:video-camera-filled';
    case 'code': return 'ant-design:code-filled';
    case 'data': return 'ant-design:database-filled';
    case 'rdata': return 'ant-design:experiment-filled';
    case 'bio': return 'ant-design:deployment-unit-outlined';
    default: return 'ant-design:file-filled';
  }
};

// 图标背景色映射
const getIconBg = (type: string, icon?: string) => {
  if (type === 'folder') return 'bg-amber-50';
  switch (icon) {
    case 'image': return 'bg-pink-50';
    case 'pdf': return 'bg-red-50';
    case 'excel': return 'bg-emerald-50';
    case 'word': return 'bg-blue-50';
    case 'markdown': return 'bg-slate-50';
    case 'archive': return 'bg-orange-50';
    case 'audio': return 'bg-yellow-50';
    case 'video': return 'bg-purple-50';
    case 'code': return 'bg-cyan-50';
    case 'data': return 'bg-emerald-50';
    case 'rdata': return 'bg-violet-50';
    case 'bio': return 'bg-sky-50';
    default: return 'bg-slate-50';
  }
};

// 图标颜色
const getIconColor = (type: string, icon?: string) => {
  if (type === 'folder') return '#f59e0b';
  switch (icon) {
    case 'image': return '#ec4899';
    case 'pdf': return '#ef4444';
    case 'excel': return '#10b981';
    case 'word': return '#3b82f6';
    case 'markdown': return '#475569';
    case 'archive': return '#f97316';
    case 'audio': return '#eab308';
    case 'video': return '#8b5cf6';
    case 'code': return '#06b6d4';
    case 'data': return '#10b981';
    case 'rdata': return '#8b5cf6';
    case 'bio': return '#0ea5e9';
    default: return '#94a3b8';
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
  <div class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    <div
      v-for="file in files"
      :key="file.id"
      class="group relative cursor-pointer select-none rounded-2xl border bg-white p-4 transition-all duration-200"
      :class="[
        isSelected(file.id)
          ? 'border-blue-400 bg-blue-50/30 shadow-md shadow-blue-100 ring-1 ring-blue-200'
          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-md',
      ]"
      @click="file.type === 'folder' ? emit('enter', file) : emit('preview', file)"
    >
      <!-- 勾选框 -->
      <div
        class="absolute left-3 top-3 z-10 transition-opacity"
        :class="isSelected(file.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        @click.stop
      >
        <Checkbox
          :checked="isSelected(file.id)"
          @change="toggleSelect(file)"
        />
      </div>

      <!-- 图标区域 -->
      <div class="flex flex-col items-center pt-2">
        <div
          class="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
          :class="getIconBg(file.type, file.icon)"
        >
          <IconifyIcon
            :icon="getFileIcon(file.type, file.icon)"
            class="text-4xl"
            :style="{ color: getIconColor(file.type, file.icon) }"
          />
        </div>

        <!-- 文件名 -->
        <Tooltip :title="file.name" placement="bottom">
          <div
            class="w-full truncate text-center text-sm font-semibold text-slate-800 transition-colors group-hover:text-blue-600"
          >
            {{ file.name }}
          </div>
        </Tooltip>

        <!-- 文件大小 -->
        <div class="mt-1 text-xs text-slate-400">
          {{ file.type === 'folder' ? '文件夹' : file.size }}
        </div>
      </div>

      <!-- 操作按钮 - hover 显示 -->
      <div
        class="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-white/90 px-1.5 py-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100"
      >
        <Tooltip title="下载">
          <button
            class="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
            @click.stop="emit('download', file)"
          >
            <IconifyIcon icon="ant-design:download-outlined" class="text-sm" />
          </button>
        </Tooltip>
        <Tooltip title="删除">
          <button
            class="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click.stop="emit('delete', file)"
          >
            <IconifyIcon icon="ant-design:delete-outlined" class="text-sm" />
          </button>
        </Tooltip>
      </div>
    </div>
  </div>
</template>
