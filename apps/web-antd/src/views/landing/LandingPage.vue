<script setup lang="ts">
import type { AnalysisTool } from '#/api';

import { computed, onMounted, ref, watch } from 'vue';

import {
  Activity,
  ArrowUpDown,
  Bot,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dna,
  Eye,
  FileText,
  Filter,
  Flame,
  Globe,
  Heart,
  Layers,
  LockOpen,
  LogIn,
  Moon,
  Search,
  XCircle,
} from 'lucide-vue-next';

import { fetchAnalysisToolCategories, fetchAnalysisToolList } from '#/api';

// Router is provided by Vue Router

// Loading State
const loading = ref(false);

// Search & Filter State
const searchQuery = ref('');
const activeCategory = ref('');

// Data from API
const tools = ref<AnalysisTool[]>([]);
const categoryList = ref<string[]>([]);
const totalCount = ref(0);

// Pagination
const currentPage = ref(1);
const pageSize = 9;

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));

const displayPages = computed(() => {
  const pages: number[] = [];
  const maxDisplay = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxDisplay / 2));
  const end = Math.min(totalPages.value, start + maxDisplay - 1);

  if (end - start + 1 < maxDisplay) {
    start = Math.max(1, end - maxDisplay + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

// Category Icon Mapping
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    组学通用: Box,
    单细胞转录组: Activity,
    蛋白组学: Layers,
    其他: FileText,
    Genomics: Dna,
    Transcriptomics: Activity,
    Proteomics: Layers,
  };
  return iconMap[category] || Box;
};

// Default Images by Category
const getDefaultImage = (category?: string) => {
  const imageMap: Record<string, string> = {
    组学通用:
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop',
    单细胞转录组:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    蛋白组学:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop',
    其他: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=800&auto=format&fit=crop',
  };
  return (
    imageMap[category || ''] ||
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop'
  );
};

// Format Date
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Fetch Tools from API
const loadTools = async () => {
  loading.value = true;
  try {
    const response = await fetchAnalysisToolList({
      page: currentPage.value,
      page_size: pageSize,
      category: activeCategory.value || undefined,
      search: searchQuery.value || undefined,
    });

    // requestClient 已通过 responseReturn:'data' 解包响应
    // 所以 response 直接就是 { items: [...], total: number }
    if (response && response.items) {
      tools.value = response.items;
      totalCount.value = response.total || 0;
      // Tools loaded successfully
    } else {
      console.warn('Unexpected response format:', response);
      tools.value = [];
      totalCount.value = 0;
    }
  } catch (error) {
    console.error('Failed to load tools:', error);
    tools.value = [];
    totalCount.value = 0;
  } finally {
    loading.value = false;
  }
};

// Fetch Categories from API
const loadCategories = async () => {
  try {
    const response = await fetchAnalysisToolCategories();
    // requestClient 已通过 responseReturn:'data' 解包响应
    // 所以 response 直接就是 string[] 分类数组
    if (response && Array.isArray(response)) {
      categoryList.value = response;
      // Categories loaded successfully
    } else {
      console.warn('Unexpected categories format:', response);
      categoryList.value = [];
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
    categoryList.value = [];
  }
};

// Set Category Filter
const setCategory = (category: string) => {
  activeCategory.value = category;
  currentPage.value = 1;
};

// Handle Search
const handleSearch = () => {
  currentPage.value = 1;
  loadTools();
};

// Clear Filters
const clearFilters = () => {
  searchQuery.value = '';
  activeCategory.value = '';
  currentPage.value = 1;
  loadTools();
};

// Change Page
const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Watch for filter/pagination changes
watch([activeCategory, currentPage], () => {
  loadTools();
});

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadTools();
  }, 300);
});

// Initial Data Load
onMounted(() => {
  loadCategories();
  loadTools();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-900">
    <!-- Header -->
    <header
      class="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md"
    >
      <div class="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo & Nav -->
          <div class="flex items-center gap-8">
            <a href="/" class="group flex items-center gap-2">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 text-lg font-bold text-white shadow-sm transition-all group-hover:shadow-md"
              >
                B
              </div>
              <span
                class="bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-xl font-bold text-transparent"
              >
                BioCloud
              </span>
            </a>

            <nav
              class="ml-8 hidden items-center gap-1 rounded-xl border border-gray-100 bg-gray-100/50 p-1 md:flex"
            >
              <a
                href="/landing"
                class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-600 shadow-sm ring-1 ring-black/5 transition-all"
              >
                <Globe class="h-4 w-4" />
                工具广场
              </a>
              <a
                href="/dashboard"
                class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-white/50 hover:text-gray-900"
              >
                <Bot class="h-4 w-4" />
                项目管理
              </a>
            </nav>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-4">
            <button
              class="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <Moon class="h-5 w-5" />
            </button>
            <router-link
              to="/auth/login"
              class="hidden transform items-center justify-center rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-lg sm:flex"
            >
              <LogIn class="mr-2 h-4 w-4" />
              登录
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section (Full Width) -->
    <div class="w-full border-b border-gray-200 bg-gray-50">
      <div
        class="mx-auto max-w-screen-2xl space-y-4 px-4 py-12 text-center sm:px-6 lg:px-8"
      >
        <h1
          class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl"
        >
          BioCloud 工具广场
        </h1>
        <p class="text-lg text-gray-500">
          发现优质生物信息分析工具，让科研更高效
        </p>

        <!-- Search Bar -->
        <div class="group relative mx-auto mt-8 max-w-2xl">
          <div
            class="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-rose-400 to-rose-600 opacity-20 blur transition duration-500 group-hover:opacity-40"
          ></div>
          <div
            class="relative flex items-center rounded-xl bg-white p-2 shadow-sm"
          >
            <Search class="ml-3 h-6 w-6 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索感兴趣的生信工具..."
              class="h-12 w-full border-none bg-transparent pl-4 pr-10 text-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0"
              @keyup.enter="handleSearch"
            />
            <button
              v-if="searchQuery"
              @click="clearFilters"
              class="absolute right-3 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <XCircle class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="flex flex-col items-start gap-8 lg:flex-row">
        <!-- Sidebar Filters -->
        <aside class="sticky top-24 w-full flex-shrink-0 space-y-8 lg:w-64">
          <!-- Filter Group -->
          <div>
            <div class="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <Filter class="h-4 w-4 text-rose-500" />
              <span>筛选条件</span>
            </div>

            <div class="space-y-1">
              <button
                class="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-200"
                :class="
                  activeCategory === ''
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                "
                @click="setCategory('')"
              >
                <Box
                  class="h-4 w-4"
                  :class="
                    activeCategory === '' ? 'text-white' : 'text-gray-400'
                  "
                />
                全部工具
              </button>
              <button
                v-for="cat in categoryList"
                :key="cat"
                class="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-200"
                :class="
                  activeCategory === cat
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                "
                @click="setCategory(cat)"
              >
                <component
                  :is="getCategoryIcon(cat)"
                  class="h-4 w-4"
                  :class="
                    activeCategory === cat ? 'text-white' : 'text-gray-400'
                  "
                />
                {{ cat }}
              </button>
            </div>
          </div>

          <!-- Sort Group -->
          <div>
            <div class="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <ArrowUpDown class="h-4 w-4 text-rose-500" />
              <span>排序方式</span>
            </div>
            <div class="space-y-1">
              <button
                class="flex w-full items-center gap-3 rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600"
              >
                <Clock class="h-4 w-4" />
                最新发布
              </button>
              <button
                class="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
              >
                <Flame class="h-4 w-4 text-gray-400" />
                最热门
              </button>
            </div>
          </div>

          <!-- Ad Placeholder -->
          <div
            class="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-100 text-xs text-gray-400"
          >
            <span>广告位招租</span>
          </div>
        </aside>

        <!-- Main Grid -->
        <div class="w-full flex-1">
          <!-- Loading State -->
          <div
            v-if="loading"
            class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            <div
              v-for="i in 6"
              :key="i"
              class="overflow-hidden rounded-xl border border-gray-100 bg-white"
            >
              <div class="h-40 animate-pulse bg-gray-200"></div>
              <div class="space-y-3 p-5">
                <div class="h-5 w-3/4 animate-pulse rounded bg-gray-200"></div>
                <div class="h-4 animate-pulse rounded bg-gray-100"></div>
                <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100"></div>
              </div>
            </div>
          </div>

          <div v-else-if="tools.length > 0">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="tool in tools"
                :key="tool.id"
                class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <!-- Cover Image -->
                <div class="relative h-40 w-full overflow-hidden">
                  <div
                    class="absolute inset-0 animate-pulse bg-gray-200"
                    v-if="!tool.image_url"
                  ></div>
                  <img
                    :src="tool.image_url || getDefaultImage(tool.category)"
                    alt="cover"
                    class="h-full w-full transform object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <!-- Overlay Gradient -->
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                  ></div>
                </div>

                <!-- Content Container -->
                <div class="flex flex-1 flex-col p-5">
                  <!-- Header: Title & Badges -->
                  <div class="mb-3 flex items-start justify-between">
                    <h3
                      class="line-clamp-1 flex-1 pr-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-rose-600"
                    >
                      {{ tool.name }}
                    </h3>
                    <div class="flex flex-shrink-0 items-center gap-2">
                      <span
                        class="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600"
                      >
                        <LockOpen class="mr-1 h-3 w-3" />
                        免费
                      </span>
                      <span
                        class="flex inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
                      >
                        <Heart class="h-3 w-3" /> {{ tool.likes }}
                      </span>
                    </div>
                  </div>

                  <!-- Tags -->
                  <div class="mb-3 flex flex-wrap gap-2">
                    <span
                      v-if="tool.category"
                      class="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600"
                    >
                      {{ tool.category }}
                    </span>
                    <span
                      v-if="tool.type"
                      class="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
                    >
                      {{ tool.type }}
                    </span>
                  </div>

                  <!-- Description -->
                  <p
                    class="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500"
                  >
                    {{ tool.description }}
                  </p>

                  <!-- Footer -->
                  <div
                    class="mt-auto flex items-center justify-between border-t border-gray-50 pt-4"
                  >
                    <div class="flex items-center gap-2">
                      <Eye class="h-4 w-4 text-gray-400" />
                      <span class="text-xs text-gray-500"
                        >{{ tool.views }} 次浏览</span
                      >
                    </div>
                    <span class="text-xs text-gray-400">{{
                      formatDate(tool.created_time)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="mt-12 flex justify-center" v-if="totalPages > 1">
              <nav class="flex items-center gap-2">
                <button
                  @click="changePage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft class="h-5 w-5" />
                </button>

                <button
                  v-for="page in displayPages"
                  :key="page"
                  @click="changePage(page)"
                  class="flex h-10 w-10 items-center justify-center rounded-lg font-medium transition-all duration-200"
                  :class="
                    currentPage === page
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  "
                >
                  {{ page }}
                </button>

                <button
                  @click="changePage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight class="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20"
          >
            <div
              class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50"
            >
              <Search class="h-10 w-10 text-gray-300" />
            </div>
            <h3 class="mb-2 text-lg font-bold text-gray-900">未找到相关工具</h3>
            <p class="max-w-sm text-center text-gray-500">
              我们找不到与 "{{ searchQuery }}"
              相关的任何工具。请尝试使用不同的关键词或清除筛选条件。
            </p>
            <button
              @click="clearFilters"
              class="mt-6 rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="mt-12 border-t border-gray-100 bg-white py-12 text-sm text-gray-600"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div class="col-span-1 md:col-span-2">
            <div class="mb-4 flex items-center gap-2">
              <div
                class="flex h-6 w-6 items-center justify-center rounded bg-rose-600 text-xs font-bold text-white"
              >
                B
              </div>
              <span class="text-lg font-bold text-gray-900">BioCloud</span>
            </div>
            <p class="max-w-xs text-gray-500">
              专业的生物信息学数据分析云平台，致力于降低生信分析门槛，提供高效、准确、易用的分析工具。
            </p>
          </div>
          <div>
            <h4 class="mb-4 font-bold text-gray-900">产品服务</h4>
            <ul class="space-y-2">
              <li><a href="#" class="hover:text-rose-600">工具广场</a></li>
              <li><a href="#" class="hover:text-rose-600">API 文档</a></li>
              <li><a href="#" class="hover:text-rose-600">定制开发</a></li>
            </ul>
          </div>
          <div>
            <h4 class="mb-4 font-bold text-gray-900">联系我们</h4>
            <ul class="space-y-2">
              <li><a href="#" class="hover:text-rose-600">关于我们</a></li>
              <li><a href="#" class="hover:text-rose-600">技术支持</a></li>
              <li><a href="#" class="hover:text-rose-600">反馈建议</a></li>
            </ul>
          </div>
        </div>
        <div
          class="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row"
        >
          <p>&copy; 2026 BioCloud Team. All rights reserved.</p>
          <div class="flex gap-6">
            <a href="#" class="hover:text-gray-900">隐私政策</a>
            <a href="#" class="hover:text-gray-900">服务条款</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Custom Scrollbar for Sidebar */
aside::-webkit-scrollbar {
  width: 4px;
}

aside::-webkit-scrollbar-track {
  background: transparent;
}

aside::-webkit-scrollbar-thumb {
  background-color: #f1f5f9;
  border-radius: 20px;
}

aside:hover::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
}

/* Glassmorphism utilities */
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
</style>
