<script setup lang="ts">
import { ref } from 'vue';

import { Search } from 'lucide-vue-next';

const emit = defineEmits(['search', 'filter', 'sort']);

const searchQuery = ref('');
const activeTab = ref('all');
const selectedFunctions = ref<string[]>([]);
const sortBy = ref('update');

const categories = [
  { id: 'all', label: '全部' },
  { id: 'common', label: '组学通用' },
  { id: 'scrna', label: '单细胞转录组' },
  { id: 'proteomics', label: '蛋白组学' },
  { id: 'other', label: '其他' },
];

const functions = [
  { id: 'id-convert', label: 'ID转换' },
  { id: 'enrichment', label: '富集分析' },
  { id: 'visualization', label: '可视化绘图' },
  { id: 'h5ad', label: 'h5ad相关' },
  { id: 'diff-viz', label: '差异可视化' },
  { id: 'subcell', label: '亚细胞定位' },
  { id: 'stats', label: '统计分析' },
  { id: 'ml', label: '机器学习' },
];

const sortOptions = [
  { value: 'update', label: '更新时间' },
  { value: 'price', label: '价格' },
  { value: 'hot', label: '热度' },
  { value: 'fav', label: '收藏' },
];

function handleTabChange(id: string) {
  activeTab.value = id;
  emit('filter', { category: id, functions: selectedFunctions.value });
}

function toggleFunction(id: string) {
  if (selectedFunctions.value.includes(id)) {
    selectedFunctions.value = selectedFunctions.value.filter((i) => i !== id);
  } else {
    selectedFunctions.value.push(id);
  }
  emit('filter', {
    category: activeTab.value,
    functions: selectedFunctions.value,
  });
}

function handleSearch() {
  emit('search', searchQuery.value);
}

function handleSort(value: string) {
  sortBy.value = value;
  emit('sort', sortBy.value);
}
</script>

<template>
  <div
    class="mb-8 space-y-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800"
  >
    <!-- Top: Search Bar -->
    <div class="relative mx-auto max-w-2xl">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索工具名称、关键词..."
        class="w-full rounded-full border-2 border-slate-100 bg-slate-50 px-6 py-3 pl-12 text-base outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-600"
        @input="handleSearch"
      />
      <Search
        class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
      />
    </div>

    <!-- Middle: Category Tabs (Capsule Style) -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2">
      <span
        class="shrink-0 text-sm font-bold text-slate-700 dark:text-slate-200"
        >组学分类</span
      >
      <div class="h-4 w-px bg-slate-200 dark:bg-slate-600"></div>
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
        :class="
          activeTab === cat.id
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/50'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
        "
        @click="handleTabChange(cat.id)"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Bottom: Function Checkboxes -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <span
        class="shrink-0 text-sm font-bold text-slate-700 dark:text-slate-200"
        >功能分类</span
      >
      <div class="h-4 w-px bg-slate-200 dark:bg-slate-600"></div>
      <label
        v-for="func in functions"
        :key="func.id"
        class="flex cursor-pointer items-center gap-2"
      >
        <div
          class="flex h-4 w-4 items-center justify-center rounded border transition-colors"
          :class="
            selectedFunctions.includes(func.id)
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-700'
          "
        >
          <svg
            v-if="selectedFunctions.includes(func.id)"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <input
          type="checkbox"
          class="hidden"
          :value="func.id"
          @change="toggleFunction(func.id)"
        />
        <span
          class="text-sm transition-colors"
          :class="
            selectedFunctions.includes(func.id)
              ? 'font-medium text-blue-600'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          "
        >
          {{ func.label }}
        </span>
      </label>
    </div>

    <!-- Sort Options -->
    <div
      class="flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-700"
    >
      <span class="text-sm font-bold text-slate-700 dark:text-slate-200"
        >排列方式</span
      >
      <button
        v-for="opt in sortOptions"
        :key="opt.value"
        class="flex items-center gap-1 text-sm transition-colors"
        :class="
          sortBy === opt.value
            ? 'font-medium text-blue-600'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
        "
        @click="handleSort(opt.value)"
      >
        {{ opt.label }}
        <svg
          v-if="sortBy === opt.value"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
