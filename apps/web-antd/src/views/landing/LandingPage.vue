<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-900">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Nav -->
          <div class="flex items-center gap-8">
            <a href="/" class="flex items-center gap-2 group">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:shadow-md transition-all">
                B
              </div>
              <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-rose-500">
                BioCloud
              </span>
            </a>
            
            <nav class="hidden md:flex items-center gap-1 p-1 bg-gray-100/50 rounded-xl ml-8 border border-gray-100">
              <a href="/landing" class="px-4 py-2 rounded-lg text-sm font-bold bg-white text-rose-600 shadow-sm transition-all flex items-center gap-2 ring-1 ring-black/5">
                <Globe class="w-4 h-4" />
                工具广场
              </a>
              <a href="/dashboard" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 hover:bg-white/50">
                <Bot class="w-4 h-4" />
                项目管理
              </a>
            </nav>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-4">
            <button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <Moon class="w-5 h-5" />
            </button>
            <button 
              @click="showAuthModal = true"
              class="hidden sm:flex items-center justify-center px-5 py-2 rounded-full text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <LogIn class="w-4 h-4 mr-2" />
              登录
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section (Full Width) -->
    <div class="w-full bg-gray-50 border-b border-gray-200">
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-4">
        <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          BioCloud 工具广场
        </h1>
        <p class="text-gray-500 text-lg">
          发现优质生物信息分析工具，让科研更高效
        </p>
        
        <!-- Search Bar -->
        <div class="max-w-2xl mx-auto mt-8 relative group">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
          <div class="relative bg-white rounded-xl shadow-sm flex items-center p-2">
            <Search class="w-6 h-6 text-gray-400 ml-3" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索感兴趣的生信工具..." 
              class="w-full h-12 pl-4 pr-10 text-gray-700 bg-transparent border-none focus:ring-0 focus:outline-none placeholder-gray-400 text-lg"
              @keyup.enter="handleSearch"
            >
            <button 
              v-if="searchQuery" 
              @click="clearFilters"
              class="absolute right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XCircle class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div class="flex flex-col lg:flex-row gap-8 items-start">
        
        <!-- Sidebar Filters -->
        <aside class="w-full lg:w-64 flex-shrink-0 space-y-8 sticky top-24">
          <!-- Filter Group -->
          <div>
            <div class="flex items-center gap-2 mb-4 text-gray-900 font-bold">
              <Filter class="w-4 h-4 text-rose-500" />
              <span>筛选条件</span>
            </div>
            
            <div class="space-y-1">
              <button 
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200"
                :class="activeCategory === '' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'"
                @click="setCategory('')"
              >
                <Box class="w-4 h-4" :class="activeCategory === '' ? 'text-white' : 'text-gray-400'" />
                全部工具
              </button>
              <button 
                v-for="cat in categoryList" 
                :key="cat"
                class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200"
                :class="activeCategory === cat ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'"
                @click="setCategory(cat)"
              >
                <component :is="getCategoryIcon(cat)" class="w-4 h-4" :class="activeCategory === cat ? 'text-white' : 'text-gray-400'" />
                {{ cat }}
              </button>
            </div>
          </div>

          <!-- Sort Group -->
          <div>
            <div class="flex items-center gap-2 mb-4 text-gray-900 font-bold">
              <ArrowUpDown class="w-4 h-4 text-rose-500" />
              <span>排序方式</span>
            </div>
            <div class="space-y-1">
               <button class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm bg-rose-50 text-rose-600 font-medium">
                <Clock class="w-4 h-4" />
                最新发布
              </button>
              <button class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                <Flame class="w-4 h-4 text-gray-400" />
                最热门
              </button>
            </div>
          </div>
          
          <!-- Ad Placeholder -->
          <div class="h-48 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-xs">
            <span>广告位招租</span>
          </div>

        </aside>

        <!-- Main Grid -->
        <div class="flex-1 w-full">
          
          <!-- Loading State -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div class="h-40 bg-gray-200 animate-pulse"></div>
              <div class="p-5 space-y-3">
                <div class="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div class="h-4 bg-gray-100 rounded animate-pulse"></div>
                <div class="h-4 bg-gray-100 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>

          <div v-else-if="tools.length > 0">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              <div 
                v-for="tool in tools" 
                :key="tool.id"
                class="group bg-white rounded-xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                <!-- Cover Image -->
                <div class="h-40 w-full overflow-hidden relative">
                   <div class="absolute inset-0 bg-gray-200 animate-pulse" v-if="!tool.image_url"></div>
                   <img 
                    :src="tool.image_url || getDefaultImage(tool.category)" 
                    alt="cover" 
                    class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                   />
                   <!-- Overlay Gradient -->
                   <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                <!-- Content Container -->
                <div class="p-5 flex flex-col flex-1">
                  
                  <!-- Header: Title & Badges -->
                  <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1 flex-1 pr-2">
                      {{ tool.name }}
                    </h3>
                    <div class="flex items-center gap-2 flex-shrink-0">
                       <span 
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600"
                      >
                        <LockOpen class="w-3 h-3 mr-1" />
                        免费
                      </span>
                       <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 flex items-center gap-1">
                          <Heart class="w-3 h-3" /> {{ tool.likes }}
                       </span>
                    </div>
                  </div>

                  <!-- Tags -->
                  <div class="flex flex-wrap gap-2 mb-3">
                    <span 
                      v-if="tool.category"
                      class="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs rounded-md font-medium"
                    >
                      {{ tool.category }}
                    </span>
                    <span 
                      v-if="tool.type"
                      class="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md font-medium"
                    >
                      {{ tool.type }}
                    </span>
                  </div>
                  
                  <!-- Description -->
                  <p class="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {{ tool.description }}
                  </p>

                  <!-- Footer -->
                  <div class="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                     <div class="flex items-center gap-2">
                        <Eye class="w-4 h-4 text-gray-400" />
                        <span class="text-xs text-gray-500">{{ tool.views }} 次浏览</span>
                     </div>
                     <span class="text-xs text-gray-400">{{ formatDate(tool.created_time) }}</span>
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
                  class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft class="w-5 h-5" />
                </button>
                
                <button 
                  v-for="page in displayPages"
                  :key="page"
                  @click="changePage(page)"
                  class="w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-all duration-200"
                  :class="currentPage === page ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'"
                >
                  {{ page }}
                </button>

                <button 
                  @click="changePage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight class="w-5 h-5" />
                </button>
              </nav>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search class="w-10 h-10 text-gray-300" />
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">未找到相关工具</h3>
            <p class="text-gray-500 max-w-sm text-center">
              我们找不到与 "{{ searchQuery }}" 相关的任何工具。请尝试使用不同的关键词或清除筛选条件。
            </p>
            <button 
              @click="clearFilters"
              class="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              清除筛选
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-12 mt-12 text-sm text-gray-600">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div class="col-span-1 md:col-span-2">
               <div class="flex items-center gap-2 mb-4">
                  <div class="w-6 h-6 rounded bg-rose-600 flex items-center justify-center text-white font-bold text-xs">B</div>
                  <span class="font-bold text-gray-900 text-lg">BioCloud</span>
               </div>
               <p class="text-gray-500 max-w-xs">专业的生物信息学数据分析云平台，致力于降低生信分析门槛，提供高效、准确、易用的分析工具。</p>
            </div>
            <div>
               <h4 class="font-bold text-gray-900 mb-4">产品服务</h4>
               <ul class="space-y-2">
                  <li><a href="#" class="hover:text-rose-600">工具广场</a></li>
                  <li><a href="#" class="hover:text-rose-600">API 文档</a></li>
                  <li><a href="#" class="hover:text-rose-600">定制开发</a></li>
               </ul>
            </div>
            <div>
               <h4 class="font-bold text-gray-900 mb-4">联系我们</h4>
               <ul class="space-y-2">
                  <li><a href="#" class="hover:text-rose-600">关于我们</a></li>
                  <li><a href="#" class="hover:text-rose-600">技术支持</a></li>
                  <li><a href="#" class="hover:text-rose-600">反馈建议</a></li>
               </ul>
            </div>
         </div>
         <div class="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2026 BioCloud Team. All rights reserved.</p>
            <div class="flex gap-6">
               <a href="#" class="hover:text-gray-900">隐私政策</a>
               <a href="#" class="hover:text-gray-900">服务条款</a>
            </div>
         </div>
      </div>
    </footer>

    <!-- Auth Modal -->
    <AuthModal v-model:visible="showAuthModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { 
  Search, Moon, LogIn, Filter, ArrowUpDown, Clock, Flame, 
  ChevronLeft, ChevronRight, Eye, Heart,
  Box, Dna, Activity, Zap, Layers, FileText, LockOpen,
  Globe, Bot, XCircle
} from 'lucide-vue-next';
import AuthModal from './components/AuthModal.vue';
import { 
  fetchAnalysisToolList, 
  fetchAnalysisToolCategories,
  type AnalysisTool 
} from '#/api';

// Auth Modal State
const showAuthModal = ref(false);

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
  let end = Math.min(totalPages.value, start + maxDisplay - 1);
  
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
    '组学通用': Box,
    '单细胞转录组': Activity,
    '蛋白组学': Layers,
    '其他': FileText,
    'Genomics': Dna,
    'Transcriptomics': Activity,
    'Proteomics': Layers,
  };
  return iconMap[category] || Box;
};

// Default Images by Category
const getDefaultImage = (category?: string) => {
  const imageMap: Record<string, string> = {
    '组学通用': 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop',
    '单细胞转录组': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    '蛋白组学': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop',
    '其他': 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=800&auto=format&fit=crop',
  };
  return imageMap[category || ''] || 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop';
};

// Format Date
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
      console.log('Loaded tools:', tools.value.length, 'total:', totalCount.value);
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
      console.log('Loaded categories:', categoryList.value);
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
