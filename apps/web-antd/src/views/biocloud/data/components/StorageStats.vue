<script setup lang="ts">
/**
 * 存储统计面板
 * 显示文件/文件夹数量、存储用量和格式分类分布
 */
import { computed } from 'vue';

import { Database, File, Folder, HardDrive } from 'lucide-vue-next';

import { getCategoryStats } from '../utils/fileFormats';

// 属性
const props = defineProps<{
  fileCount: number;
  filenames: string[];
  folderCount: number;
  loading?: boolean;
  totalSize: number;
}>();

// 假设 50GB 配额
const STORAGE_QUOTA = 50 * 1024 * 1024 * 1024;

// 使用率百分比
const usagePercent = computed(() =>
  Math.min(100, (props.totalSize / STORAGE_QUOTA) * 100),
);

// 格式分类统计
const categoryStats = computed(() => getCategoryStats(props.filenames));

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

// 进度条颜色
const barColor = computed(() => {
  if (usagePercent.value > 90) return 'bg-red-500';
  if (usagePercent.value > 70) return 'bg-amber-500';
  return 'bg-blue-500';
});
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
      ></div>
      <span class="ml-3 text-sm text-slate-500">加载存储信息...</span>
    </div>

    <div v-else class="p-5">
      <!-- 标题行 -->
      <div class="mb-4 flex items-center gap-2">
        <HardDrive class="h-5 w-5 text-blue-600" />
        <h3 class="text-sm font-semibold text-slate-900">存储概览</h3>
      </div>

      <!-- 统计数字 -->
      <div class="mb-4 grid grid-cols-3 gap-4">
        <div class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <File class="h-4 w-4 text-blue-500" />
          <div>
            <div class="text-lg font-bold text-slate-900">
              {{ fileCount }}
            </div>
            <div class="text-xs text-slate-500">文件</div>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <Folder class="h-4 w-4 text-amber-500" />
          <div>
            <div class="text-lg font-bold text-slate-900">
              {{ folderCount }}
            </div>
            <div class="text-xs text-slate-500">文件夹</div>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <Database class="h-4 w-4 text-emerald-500" />
          <div>
            <div class="text-lg font-bold text-slate-900">
              {{ formatSize(totalSize) }}
            </div>
            <div class="text-xs text-slate-500">已用</div>
          </div>
        </div>
      </div>

      <!-- 存储进度条 -->
      <div class="mb-4">
        <div class="mb-1 flex items-center justify-between text-xs">
          <span class="text-slate-500">存储用量</span>
          <span class="font-medium text-slate-700">
            {{ formatSize(totalSize) }} / {{ formatSize(STORAGE_QUOTA) }}
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor"
            :style="{ width: `${usagePercent}%` }"
          ></div>
        </div>
      </div>

      <!-- 格式分类标签 -->
      <div v-if="categoryStats.length > 0">
        <div class="mb-2 text-xs font-medium text-slate-500">格式分布</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="stat in categoryStats"
            :key="stat.category"
            class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
            :style="{
              backgroundColor: `${stat.color}15`,
              color: stat.color,
            }"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :style="{ backgroundColor: stat.color }"
            ></span>
            {{ stat.label }}
            <span class="opacity-70">{{ stat.count }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
