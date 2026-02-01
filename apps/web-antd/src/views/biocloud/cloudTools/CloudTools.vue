<script setup lang="ts">
import type { AnalysisTool } from '#/api/analysis-tools';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Search,
  X,
} from 'lucide-vue-next';

import {
  getAnalysisToolCategories,
  getAnalysisToolList,
} from '#/api/analysis-tools';
import AuthModal from '#/views/biocloud/landing/components/AuthModal.vue';

const router = useRouter();
const accessStore = useAccessStore();
const showAuthModal = ref(false);

const isLoggedIn = computed(() => !!accessStore.accessToken);

// API 基础 URL（用于图片路径拼接）
const apiBaseUrl = import.meta.env.VITE_GLOB_API_URL || '';
const getFullImageUrl = (url: null | string | undefined) => {
  if (!url) return '';
  if (url.startsWith('http') || !url.includes('/')) {
    return url;
  }
  return `${apiBaseUrl}${url}`;
};

// 搜索与筛选
const searchQuery = ref('');
const selectedCategory = ref('全部');

// 分类选项（从后端获取）
const omicsCategories = ref<string[]>([]);
const allCategories = computed(() => ['全部', ...omicsCategories.value]);

// 工具列表数据
const tools = ref<AnalysisTool[]>([]);
const loading = ref(false);
const total = ref(0);

// 分页状态
const currentPage = ref(1);
const itemsPerPage = 12;

// 获取分类列表
const fetchCategories = async () => {
  try {
    const res = await getAnalysisToolCategories();
    omicsCategories.value = res.omics || [];
  } catch (error) {
    console.error('获取分类失败:', error);
  }
};

// 获取工具列表
const fetchTools = async () => {
  loading.value = true;
  try {
    const res = await getAnalysisToolList({
      page: currentPage.value,
      size: itemsPerPage,
      search: searchQuery.value || undefined,
      omics:
        selectedCategory.value === '全部' ? undefined : selectedCategory.value,
    });
    tools.value = res.items || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error('获取工具列表失败:', error);
    tools.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 分页计算
const totalPages = computed(() => Math.ceil(total.value / itemsPerPage));

// 搜索或筛选变化时重置页码并刷新
watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
  fetchTools();
});

// 页码变化时刷新
watch(currentPage, () => {
  fetchTools();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 初始化
onMounted(() => {
  fetchCategories();
  fetchTools();
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const handleToolClick = (tool: AnalysisTool) => {
  // 允许游客浏览工具详情，提交分析时再检查登录
  router.push(`/tool/${tool.id}`);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Hero / Header Section -->
    <div
      class="border-b border-slate-200 bg-white px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div class="mx-auto px-4 sm:px-16 lg:px-40">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">云工具广场</h1>
        <p class="max-w-2xl text-slate-500">
          探索超过 {{ total }}+
          款专业生物信息分析工具，从基础绘图到高级多组学挖掘，一键即用。
        </p>

        <!-- Search & Filter Bar -->
        <div class="mt-8 flex flex-col gap-4 md:flex-row">
          <div class="relative max-w-lg flex-1">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
            >
              <Search class="h-5 w-5 text-slate-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              class="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 leading-5 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
              placeholder="搜索工具名称、功能描述..."
            />
            <!-- 清除按钮 -->
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Category Chips -->
          <div
            class="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2 md:pb-0"
          >
            <button
              v-for="category in allCategories"
              :key="category"
              @click="selectedCategory = category"
              class="whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all"
              :class="[
                selectedCategory === category
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
              ]"
            >
              {{ category }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tools Grid -->
    <div class="mx-auto mt-8 px-4 sm:px-16 lg:px-40">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 class="h-8 w-8 animate-spin text-blue-600" />
        <span class="ml-3 text-slate-500">加载中...</span>
      </div>

      <!-- Tools Grid - 水平卡片布局 -->
      <div
        v-else-if="tools.length > 0"
        class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="tool in tools"
          :key="tool.id"
          @click="handleToolClick(tool)"
          class="group flex min-h-[200px] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
        >
          <!-- 左侧图片区域 -->
          <div class="relative w-32 flex-shrink-0 overflow-hidden bg-slate-50">
            <!-- 如果有图片路径，显示图片 -->
            <img
              v-if="tool.icon && tool.icon.includes('/')"
              :src="getFullImageUrl(tool.icon)"
              :alt="tool.title"
              class="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
            <!-- 否则显示渐变背景和首字母 -->
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
                :style="{ backgroundColor: tool.color || '#3b82f6' }"
              >
                <span class="text-lg font-bold text-white">{{
                  tool.title?.charAt(0) || 'T'
                }}</span>
              </div>
            </div>

            <!-- Lock Overlay if not logged in -->
            <div
              v-if="!isLoggedIn"
              class="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              title="登录后使用"
            >
              <Lock class="h-3 w-3" />
            </div>
          </div>

          <!-- 右侧内容区域 -->
          <div class="flex flex-1 flex-col justify-between p-3">
            <!-- 标题 -->
            <h3
              class="mb-1.5 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600"
            >
              {{ tool.title }}
            </h3>

            <!-- 标签 -->
            <div class="mb-2 flex flex-wrap items-center gap-1.5">
              <span
                class="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
              >
                {{ tool.omics_category }}
              </span>
              <span
                v-if="tool.func_category"
                class="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600"
              >
                {{ tool.func_category }}
              </span>
            </div>

            <!-- 描述 -->
            <p
              class="mb-2 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500"
            >
              {{ tool.description }}
            </p>

            <!-- 底部：统计 -->
            <div class="flex items-center gap-3 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <svg
                  class="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {{ tool.views }} 浏览
              </span>
              <span class="flex items-center gap-1">
                <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  />
                </svg>
                {{ tool.stars }} 收藏
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-20 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
        >
          <Search class="h-8 w-8 text-slate-400" />
        </div>
        <h3 class="text-lg font-medium text-slate-900">未找到相关工具</h3>
        <p class="mt-1 text-slate-500">换个关键词试试，或者浏览全部工具。</p>
        <button
          @click="
            searchQuery = '';
            selectedCategory = '全部';
          "
          class="mt-4 font-medium text-blue-600 hover:text-blue-700"
        >
          清除筛选
        </button>
      </div>

      <!-- 分页控件 -->
      <div
        v-if="tools.length > 0 && totalPages > 1"
        class="mt-12 flex items-center justify-center gap-2"
      >
        <!-- 上一页 -->
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="flex h-10 w-10 items-center justify-center rounded-lg border transition-all"
          :class="
            currentPage === 1
              ? 'cursor-not-allowed border-slate-200 text-slate-300'
              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100'
          "
        >
          <ChevronLeft class="h-5 w-5" />
        </button>

        <!-- 页码 -->
        <template v-for="page in totalPages" :key="page">
          <button
            v-if="
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            "
            @click="goToPage(page)"
            class="flex h-10 w-10 items-center justify-center rounded-lg border font-medium transition-all"
            :class="
              page === currentPage
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100'
            "
          >
            {{ page }}
          </button>
          <span
            v-else-if="page === currentPage - 2 || page === currentPage + 2"
            class="text-slate-400"
            >...</span
          >
        </template>

        <!-- 下一页 -->
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="flex h-10 w-10 items-center justify-center rounded-lg border transition-all"
          :class="
            currentPage === totalPages
              ? 'cursor-not-allowed border-slate-200 text-slate-300'
              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100'
          "
        >
          <ChevronRight class="h-5 w-5" />
        </button>

        <!-- 页码信息 -->
        <span class="ml-4 text-sm text-slate-500">
          第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 个工具
        </span>
      </div>
    </div>

    <!-- Global Auth Modal (Reused) -->
    <AuthModal :is-open="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>

<style scoped>
/* Hide scrollbar for category list */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
