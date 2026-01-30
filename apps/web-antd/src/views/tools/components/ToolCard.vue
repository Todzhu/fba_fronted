<script setup lang="ts">
import { Eye, Star } from 'lucide-vue-next';

interface ToolProps {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  tags: string[];
  views: number;
  stars: number;
  isFree?: boolean;
}

defineProps<ToolProps>();
</script>

<template>
  <div
    class="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
  >
    <!-- Card Header / Image Area -->
    <div class="relative h-40 w-full overflow-hidden bg-slate-100">
      <img
        :src="imageUrl"
        :alt="name"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <!-- Price Badge -->
      <div
        class="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm dark:bg-black/60"
        :class="isFree ? 'text-blue-600' : 'text-orange-500'"
      >
        {{ isFree ? '限时免费' : '付费工具' }}
      </div>
    </div>

    <!-- Card Content -->
    <div class="flex flex-1 flex-col p-4">
      <div class="mb-2 flex items-start justify-between">
        <h3
          class="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-blue-600 dark:text-slate-100"
        >
          {{ name }}
        </h3>
      </div>

      <div class="mb-3 flex flex-wrap gap-1">
        <span
          class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400"
        >
          {{ category }}
        </span>
        <span
          v-for="tag in tags.slice(0, 2)"
          :key="tag"
          class="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        >
          {{ tag }}
        </span>
      </div>

      <p
        class="mb-4 line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400"
      >
        {{ description }}
      </p>

      <!-- Card Footer -->
      <div
        class="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-700"
      >
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <Eye class="h-3.5 w-3.5" />
            {{ views }}
          </span>
          <span class="flex items-center gap-1 hover:text-yellow-500">
            <Star class="h-3.5 w-3.5" />
            {{ stars }}
          </span>
        </div>
        <button
          class="font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100"
        >
          立即使用 &rarr;
        </button>
      </div>
    </div>
  </div>
</template>
