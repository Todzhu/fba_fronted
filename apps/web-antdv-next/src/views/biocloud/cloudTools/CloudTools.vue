<script setup lang="ts">
import type { AnalysisTool } from '#/api/analysis-tools';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Star,
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
    <!-- ========== Header 区域（与云流程/我的数据一致） ========== -->
    <div
      class="border-b border-slate-200 bg-white px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div class="mx-auto max-w-7xl">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">云工具</h1>
        <p class="max-w-2xl text-slate-500">
          探索超过 {{ total }}+
          款专业生物信息分析工具，从基础绘图到高级多组学挖掘，一键即用。
        </p>

        <!-- 搜索 & 筛选条 -->
        <div class="mt-8 flex flex-col gap-4 md:flex-row">
          <!-- 搜索框 -->
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

          <!-- 分类标签 -->
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

    <!-- ========== 工具网格 ========== -->
    <div class="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 加载中 -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <Loader2 class="mb-3 h-10 w-10 animate-spin text-blue-500" />
        <span class="text-sm text-slate-500">加载工具中...</span>
      </div>

      <!-- 工具卡片网格 - 竖直布局，与 landing page 和云流程一致 -->
      <div
        v-else-if="tools.length > 0"
        class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="tool in tools"
          :key="tool.id"
          @click="handleToolClick(tool)"
          class="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
        >
          <!-- 顶部图片预览区 -->
          <div class="relative h-40 overflow-hidden sm:h-44">
            <!-- 有图片：显示工具产出图 -->
            <img
              v-if="tool.icon && tool.icon.includes('/')"
              :src="getFullImageUrl(tool.icon)"
              :alt="tool.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <!-- 无图片：渐变背景 + 首字母 -->
            <div
              v-else
              class="flex h-full w-full items-center justify-center"
              :style="{
                background: `linear-gradient(135deg, ${tool.color || '#3b82f6'}20, ${tool.color || '#6366f1'}10)`,
              }"
            >
              <div
                class="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110"
                :style="{
                  backgroundColor: tool.color || '#3b82f6',
                  boxShadow: `0 8px 24px ${tool.color || '#3b82f6'}30`,
                }"
              >
                <span class="text-2xl font-bold text-white">{{
                  tool.title?.charAt(0) || 'T'
                }}</span>
              </div>
            </div>


            <!-- 登录锁定遮罩 -->
            <div
              v-if="!isLoggedIn"
              class="absolute bottom-2 right-2 rounded-full bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
              title="登录后使用"
            >
              <Lock class="h-3.5 w-3.5" />
            </div>
          </div>

          <!-- 底部内容区 -->
          <div class="p-4">
            <!-- 标题 -->
            <h3
              class="mb-2 text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600"
            >
              {{ tool.title }}
            </h3>

            <!-- 分类标签 -->
            <div class="mb-3 flex flex-wrap gap-1.5">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {{ tool.omics_category }}
              </span>
              <span
                v-if="tool.func_category"
                class="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600"
              >
                {{ tool.func_category }}
              </span>
            </div>

            <!-- 描述 -->
            <p
              class="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500"
            >
              {{ tool.description }}
            </p>

            <!-- 底部统计 -->
            <div
              class="flex items-center justify-between border-t border-slate-100 pt-3"
            >
              <div class="flex items-center gap-3 text-xs text-slate-400">
                <span class="flex items-center gap-1">
                  <Eye class="h-3.5 w-3.5" />
                  {{ tool.views }} 浏览
                </span>
                <span class="flex items-center gap-1">
                  <Star class="h-3.5 w-3.5" />
                  {{ tool.stars }} 收藏
                </span>
              </div>
              <ArrowRight
                class="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-24 text-center">
        <div
          class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"
        >
          <Search class="h-10 w-10 text-slate-300" />
        </div>
        <h3 class="text-lg font-bold text-slate-900">未找到相关工具</h3>
        <p class="mt-2 text-sm text-slate-500">
          换个关键词试试，或者浏览全部工具。
        </p>
        <button
          @click="
            searchQuery = '';
            selectedCategory = '全部';
          "
          class="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-2.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-100"
        >
          <Sparkles class="h-4 w-4" />
          查看全部工具
        </button>
      </div>

      <!-- ========== 分页控件 ========== -->
      <div
        v-if="tools.length > 0 && totalPages > 1"
        class="mt-14 flex items-center justify-center gap-2"
      >
        <!-- 上一页 -->
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-all"
          :class="
            currentPage === 1
              ? 'cursor-not-allowed border-slate-200 text-slate-300'
              : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
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
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border font-medium transition-all"
            :class="
              page === currentPage
                ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
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
          class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-all"
          :class="
            currentPage === totalPages
              ? 'cursor-not-allowed border-slate-200 text-slate-300'
              : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
          "
        >
          <ChevronRight class="h-5 w-5" />
        </button>

        <!-- 页码信息 -->
        <span class="ml-4 text-sm text-slate-400">
          第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 个工具
        </span>
      </div>
    </div>

    <!-- Auth Modal -->
    <AuthModal :is-open="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>

<style scoped>
/* 隐藏分类滚动条 */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
