<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  LineChart,
  Lock,
  PieChart,
  Search,
  Share2,
} from 'lucide-vue-next';

import AuthModal from '#/views/biocloud/landing/components/AuthModal.vue';

const router = useRouter();
const accessStore = useAccessStore();
const showAuthModal = ref(false);

const isLoggedIn = computed(() => !!accessStore.accessToken);

// Search & Filter
const searchQuery = ref('');
const selectedCategory = ref('全部');

const categories = [
  '全部',
  'Bulk RNA',
  'scRNA-seq',
  '可视化',
  'Enrichment',
  'Clinical',
  'Network',
];

// Mock Data
const tools = ref([
  {
    id: 1,
    name: 'ROE 富集分析',
    description: '计算基因集的观察/期望比值，评估富集程度。',
    category: 'Bulk RNA',
    icon: BarChart3,
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    popular: true,
  },
  {
    id: 2,
    name: '火山图',
    description: '差异表达基因可视化，快速识别显著基因。',
    category: 'Bulk RNA',
    icon: LineChart,
    image:
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=250&fit=crop',
    popular: true,
  },
  {
    id: 3,
    name: 'PCA 降维',
    description: '主成分分析与可视化，探索样本聚类关系。',
    category: 'scRNA-seq',
    icon: Layers,
    image:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=250&fit=crop',
  },
  {
    id: 4,
    name: '热图绘制',
    description: '表达量热图聚类可视化，展示基因表达模式。',
    category: '可视化',
    icon: Database,
    image:
      'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=250&fit=crop',
  },
  {
    id: 5,
    name: 'KEGG/GO 通路',
    description: '深入解析基因功能通路与生物学意义。',
    category: 'Enrichment',
    icon: BarChart3,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  },
  {
    id: 6,
    name: '生存分析',
    description: '临床预后评估与生存曲线绘制 (KM-Plot)。',
    category: 'Clinical',
    icon: Activity,
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557',
  },
  {
    id: 7,
    name: 'Venn 韦恩图',
    description: '多组数据交集与差异可视化。',
    category: 'Visualization',
    icon: PieChart,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9',
  },
  {
    id: 8,
    name: '互作网络',
    description: '探索关键基因与蛋白相互作用关系 (PPI)。',
    category: 'Network',
    icon: Share2,
    image: 'https://images.unsplash.com/photo-1529810314902-366916060c2c',
  },
]);

// 分页状态
const currentPage = ref(1);
const itemsPerPage = 8;

const filteredTools = computed(() => {
  return tools.value.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCategory =
      selectedCategory.value === '全部' ||
      tool.category === selectedCategory.value;
    return matchesSearch && matchesCategory;
  });
});

// 分页计算
const totalPages = computed(() =>
  Math.ceil(filteredTools.value.length / itemsPerPage),
);
const paginatedTools = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredTools.value.slice(start, start + itemsPerPage);
});

// 搜索或筛选变化时重置页码
watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleToolClick = (tool: any) => {
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
      <div class="mx-auto max-w-7xl">
        <h1 class="mb-2 text-3xl font-bold text-slate-900">云工具广场</h1>
        <p class="max-w-2xl text-slate-500">
          探索超过 50+
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
              class="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 leading-5 placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm"
              placeholder="搜索工具名称、功能描述..."
            />
          </div>

          <!-- Category Chips -->
          <div
            class="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2 md:pb-0"
          >
            <button
              v-for="category in categories"
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
    <div class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        v-if="filteredTools.length > 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="tool in paginatedTools"
          :key="tool.id"
          @click="handleToolClick(tool)"
          class="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <!-- Image -->
          <div class="relative h-40 overflow-hidden bg-slate-100">
            <img
              :src="tool.image"
              :alt="tool.name"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-black/5 transition-colors group-hover:bg-black/0"
            ></div>

            <!-- Lock Overlay if not logged in -->
            <div
              v-if="!isLoggedIn"
              class="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              title="登录后使用"
            >
              <Lock class="h-3 w-3" />
            </div>
          </div>

          <!-- Content -->
          <div class="flex flex-grow flex-col p-5">
            <div class="mb-2 flex items-start justify-between">
              <!-- Category Tag -->
              <span
                class="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {{ tool.category }}
              </span>
              <component
                :is="tool.icon"
                class="h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-600"
              />
            </div>

            <h3
              class="mb-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600"
            >
              {{ tool.name }}
            </h3>
            <p class="line-clamp-2 flex-grow text-sm text-slate-500">
              {{ tool.description }}
            </p>

            <div
              class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"
            >
              <span class="text-slate-400">v1.2.0</span>
              <span
                class="flex items-center gap-1 font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100"
              >
                开始分析 <span class="text-lg leading-none">→</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- User is likely searching for something that doesnt exist -->
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
        v-if="filteredTools.length > 0 && totalPages > 1"
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
          第 {{ currentPage }} / {{ totalPages }} 页，共
          {{ filteredTools.length }} 个工具
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
