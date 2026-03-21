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
// 登录成功后跳转的目标路径（记录用户意图）
const authRedirectPath = ref('');

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
  if (!isLoggedIn.value) {
    // 未登录：弹出登录注册框，记录目标工具路径
    authRedirectPath.value = `/tool/${tool.id}`;
    showAuthModal.value = true;
    return;
  }
  // 已登录：直接跳转到工具详情页
  router.push(`/tool/${tool.id}`);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Compact Banner Header -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
      <div class="flex items-center justify-between rounded-xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] px-5 py-3.5">
        <div class="flex items-center gap-4">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-inner ring-1 ring-black/5">
            <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div class="flex flex-col justify-center">
            <h1 class="text-[17px] font-bold tracking-tight text-slate-900">云工具</h1>
            <p class="mt-0.5 text-xs font-medium text-slate-500">
              探索超过 {{ total }}+ 款专业生物信息分析工具，从基础绘图到高级多组学挖掘，一键即用。
            </p>
          </div>
        </div>
      </div>

      <!-- 搜索 & 筛选条 -->
      <div class="mt-6 mb-4 flex flex-col gap-4 md:flex-row">
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

    <!-- ========== 工具网格 ========== -->
    <div class="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- 加载中 -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24">
        <Loader2 class="mb-3 h-10 w-10 animate-spin text-blue-500" />
        <span class="text-sm text-slate-500">加载工具中...</span>
      </div>

      <!-- 工具卡片网格 - 横向饱和排版 -->
      <div
        v-else-if="tools.length > 0"
        class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
      >
        <div
          v-for="tool in tools"
          :key="tool.id"
          @click="handleToolClick(tool)"
          class="group flex min-h-[160px] cursor-pointer items-stretch rounded-[20px] border border-slate-200/60 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/30"
        >
          <!-- 左侧：宽幅画廊满高框，拒绝上下留空 -->
          <div class="relative shrink-0 overflow-hidden rounded-[14px] bg-slate-50 w-[110px] sm:w-[130px] md:w-[136px]">
            <!-- ========== 有图片 ========== -->
            <template v-if="tool.icon && tool.icon.includes('/')">
              <!-- 沉浸式模糊背景 -->
              <img
                :src="getFullImageUrl(tool.icon)"
                class="absolute inset-0 h-full w-full object-cover opacity-50 blur-lg transition-all duration-500 group-hover:scale-110 group-hover:opacity-75"
                alt=""
              />
              <div class="absolute inset-0 bg-white/55"></div>
              
              <!-- 居中最美视效留白的清晰原图 -->
              <div class="absolute inset-2 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-md sm:inset-2.5">
                <img
                  :src="getFullImageUrl(tool.icon)"
                  :alt="tool.title"
                  class="h-full w-full object-contain p-1.5"
                />
              </div>
            </template>
            
            <!-- ========== 无图片：高纯度凝胶方块 ========== -->
            <template v-else>
              <div
                class="absolute inset-0 transition-opacity duration-500 group-hover:opacity-100 opacity-60"
                :style="{ background: `radial-gradient(circle at center, ${tool.color || '#3b82f6'}15 0%, transparent 80%)` }"
              ></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div
                  class="flex h-16 w-16 items-center justify-center rounded-[14px] bg-gradient-to-br shadow-lg transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-[18px]"
                  :style="{
                    backgroundImage: `linear-gradient(135deg, ${tool.color || '#3b82f6'}e6, ${tool.color ? tool.color + 'b3' : '#1d4ed8'}e6)`,
                    boxShadow: `0 8px 16px -4px ${tool.color || '#3b82f6'}40`
                  }"
                >
                  <span class="text-3xl font-black text-white drop-shadow-sm sm:text-[36px]">
                    {{ tool.title?.charAt(0) || 'C' }}
                  </span>
                </div>
              </div>
            </template>

            <!-- 登录锁定遮罩 -->
            <div
              v-if="!isLoggedIn"
              class="absolute bottom-1.5 right-1.5 z-20 rounded-full bg-slate-900/60 p-1.5 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100"
            >
              <Lock class="h-3.5 w-3.5" />
            </div>
          </div>

          <!-- 右侧：自然拉升撑满上下的动态排印 (移除 justify-center) -->
          <div class="ml-4 flex min-w-0 flex-1 flex-col py-0.5 pr-1 justify-between sm:ml-5">
            <div class="flex flex-col gap-2">
              <div class="flex items-start justify-between gap-2">
                 <!-- 工具名称显示完整、不加过粗字重 -->
                 <h3 class="text-base font-semibold text-slate-800 transition-colors group-hover:text-blue-600 sm:text-[17px] leading-snug">
                   {{ tool.title }}
                 </h3>
                 <ArrowRight class="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transform -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-blue-500 group-hover:opacity-100 sm:opacity-100" />
              </div>

              <!-- 工业感微标（Tag） -->
              <div class="flex flex-wrap gap-1.5">
                <span class="rounded bg-slate-50 px-1.5 py-[3px] text-[10px] font-semibold uppercase tracking-wider text-slate-500 border border-slate-200/60">
                  {{ tool.omics_category }}
                </span>
                <span
                  v-if="tool.func_category"
                  class="rounded bg-blue-50/40 px-1.5 py-[3px] text-[10px] font-semibold uppercase tracking-wider text-blue-500 border border-blue-100/50"
                >
                  {{ tool.func_category }}
                </span>
              </div>

              <!-- 描述文本，靠紧上方，充分利用中段空间 -->
              <p class="line-clamp-3 text-[12.5px] leading-[1.65] text-slate-500/90 sm:text-[13px]">
                {{ tool.description }}
              </p>
            </div>

            <!-- 底栏数据紧贴卡片底部沿线 -->
            <div class="mt-3 flex items-center gap-4 text-[11px] font-medium tracking-wide text-slate-400">
              <span class="flex items-center gap-1.5 transition-colors group-hover:text-slate-600">
                <Eye class="h-3.5 w-3.5" /> {{ tool.views }}
              </span>
              <span class="flex items-center gap-1.5 transition-colors group-hover:text-amber-500">
                <Star class="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-amber-500" /> {{ tool.stars }}
              </span>
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
    <AuthModal
      :is-open="showAuthModal"
      :redirect-path="authRedirectPath"
      @close="showAuthModal = false"
    />
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
