<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Search Bar -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-full mx-auto px-8 py-4">
        <div class="relative max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索"
            class="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- Header Navigation -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-full mx-auto px-8 py-4">
        <!-- Primary Categories -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-gray-600 font-medium">组学分类</span>
          <div class="flex gap-1">
            <div v-if="categoriesLoading" class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span class="text-sm text-gray-500">加载中...</span>
            </div>
            <div v-else-if="categoriesError" class="flex items-center gap-2">
              <span class="text-sm text-red-500">加载失败</span>
              <button 
                @click="loadCategories"
                class="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
              >
                重试
              </button>
            </div>
            <button
              v-else
              v-for="category in primaryCategories"
              :key="category"
              @click="selectedPrimaryCategory = category"
              :class="[
                'px-4 py-2 rounded text-sm font-medium transition-colors',
                selectedPrimaryCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <!-- Functional Categories -->
        <div class="flex items-center gap-2 mb-6">
          <span class="text-gray-600 font-medium">功能分类</span>
          <div class="flex gap-1 flex-wrap">
            <div v-if="categoriesLoading" class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              <span class="text-sm text-gray-500">加载中...</span>
            </div>
            <div v-else-if="categoriesError" class="flex items-center gap-2">
              <span class="text-sm text-red-500">加载失败</span>
              <button 
                @click="loadCategories"
                class="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
              >
                重试
              </button>
            </div>
            <button
              v-else
              v-for="category in functionalCategories"
              :key="category"
              @click="toggleFunctionalCategory(category)"
              :class="[
                'px-4 py-2 rounded text-sm font-medium transition-colors',
                selectedFunctionalCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ category }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tools Grid -->
    <div class="max-w-full mx-auto px-8 py-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        <div
          v-for="tool in paginatedTools"
          :key="tool.id"
          @click="openTool(tool)"
          class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group"
        >
          <!-- Tool Image - Top -->
          <div class="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <img 
              v-if="tool.image_url" 
              :src="tool.image_url" 
              :alt="tool.name"
              class="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
              @error="handleImageError"
            />
            <div 
              v-else 
              class="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg"
            >
              <div class="text-center">
                <BarChart3 class="w-10 h-10 text-blue-500 mx-auto mb-1" />
                <span class="text-xs text-blue-600 font-medium">工具</span>
              </div>
            </div>
          </div>
          
          <!-- Tool Information - Bottom -->
          <div class="space-y-3">
            <!-- Title and Favorite -->
            <div class="flex items-start justify-between">
              <h3 class="font-semibold text-gray-900 text-lg leading-tight flex-1 pr-2">
                {{ tool.name }}
              </h3>
              <button
                @click.stop="toggleFavorite(tool)"
                :class="['flex-shrink-0', tool.is_favorite ? 'text-yellow-400' : 'text-gray-300', 'hover:text-yellow-500', 'focus:outline-none', 'transition-colors']"
                title="收藏"
              >
                <Star class="w-5 h-5" :fill="tool.is_favorite ? 'currentColor' : 'none'" />
              </button>
            </div>
            
            <!-- Categories -->
            <div class="flex gap-2 flex-wrap">
              <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{{ tool.category }}</span>
              <span class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">{{ tool.type }}</span>
            </div>
            
            <!-- Description -->
            <p class="text-gray-600 text-sm leading-relaxed line-clamp-3">{{ tool.description }}</p>
            
            <!-- Stats -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <div class="flex items-center gap-1">
                  <Eye class="w-4 h-4" />
                  {{ tool.views }}
                </div>
                <div class="flex items-center gap-1">
                  <Star class="w-4 h-4" />
                  {{ tool.likes }}
                </div>
              </div>
              <div class="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                点击查看详情 →
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex justify-end items-center gap-2 mt-8">
        <button
          @click="currentPage > 1 && (currentPage--)"
          :disabled="currentPage === 1"
          class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <div class="flex gap-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="currentPage = page"
            :class="[
              'px-3 py-2 border rounded',
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            ]"
          >
            {{ page }}
          </button>
        </div>
        <button
          @click="currentPage < totalPages && (currentPage++)"
          :disabled="currentPage === totalPages"
          class="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="paginatedTools.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-2">
          <Search class="w-12 h-12 mx-auto" />
        </div>
        <p class="text-gray-500">没有找到符合条件的工具</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  ChevronDown,
  Eye,
  Star,
  Heart,
  Search,
  BarChart3
} from 'lucide-vue-next'
import { fetchAnalysisToolList, fetchAnalysisToolCategories, fetchAnalysisToolFuncTypes, toggleAnalysisToolFavorite } from '#/api/analysisTool'

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const selectedPrimaryCategory = ref('全部')
const selectedFunctionalCategory = ref('全部')

// 动态获取的筛选选项
const primaryCategories = ref(['全部'])
const functionalCategories = ref(['全部'])

const tools = ref([])
const total = ref(0)
const loading = ref(false)
const categoriesLoading = ref(false)
const categoriesError = ref(false)

// 缓存相关
const CACHE_KEY = 'analysis_tool_categories'
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 缓存工具函数
function getCachedCategories() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data
      }
    }
  } catch (error) {
    console.warn('Failed to get cached categories:', error)
  }
  return null
}

function setCachedCategories(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.warn('Failed to cache categories:', error)
  }
}

// 默认图片URL
const defaultImageUrl = '/images/tools/default-tool.svg'

// 处理工具数据
const processedTools = computed(() => {
  return tools.value.map(tool => ({
    ...tool,
    image_url: tool.image_url || defaultImageUrl
  }))
})

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.src = defaultImageUrl
}

// 加载筛选选项
async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = false
  
  // 先尝试从缓存获取
  const cached = getCachedCategories()
  if (cached) {
    primaryCategories.value = ['全部', ...(cached.categories || [])]
    functionalCategories.value = ['全部', ...(cached.funcTypes || [])]
    categoriesLoading.value = false
    return
  }
  
  try {
    // 并行获取分类和功能类型
    const [categoriesRes, funcTypesRes] = await Promise.all([
      fetchAnalysisToolCategories(),
      fetchAnalysisToolFuncTypes()
    ])
    
    const categories = categoriesRes || []
    const funcTypes = funcTypesRes || []
    
    // 更新组学分类（保留"全部"选项）
    if (Array.isArray(categories)) {
      primaryCategories.value = ['全部', ...categories]
    }
    
    // 更新功能分类（保留"全部"选项）
    if (Array.isArray(funcTypes)) {
      functionalCategories.value = ['全部', ...funcTypes]
    }
    
    // 缓存数据
    setCachedCategories({
      categories,
      funcTypes
    })
  } catch (error) {
    console.error('Failed to load categories:', error)
    categoriesError.value = true
    // 降级方案：使用默认分类
    primaryCategories.value = ['全部', '组学通用', '单细胞转录组', '蛋白组学', '其他']
    functionalCategories.value = ['全部', '富集分析', '可视化绘图', 'h5ad相关', '统计分析', '特征转换', '序列处理']
  } finally {
    categoriesLoading.value = false
  }
}

function loadTools() {
  loading.value = true
  fetchAnalysisToolList({
    page: currentPage.value,
    page_size: itemsPerPage,
    category: selectedPrimaryCategory.value === '全部' ? '' : selectedPrimaryCategory.value,
    func_type: selectedFunctionalCategory.value === '全部' ? '' : selectedFunctionalCategory.value,
    search: searchQuery.value
  })
    .then(res => {
      total.value = res.total
      tools.value = (res.items || []).map(tool => ({
        ...tool,
        is_favorite: tool.is_favorite
      }))
    })
    .finally(() => {
      loading.value = false
    })
}

watch([selectedPrimaryCategory, selectedFunctionalCategory, searchQuery], () => {
  currentPage.value = 1
  loadTools()
})
watch(currentPage, () => {
  loadTools()
})

onMounted(async () => {
  // 先加载分类选项，再加载工具列表
  await loadCategories()
  loadTools()
})

const paginatedTools = computed(() => processedTools.value)
const totalPages = computed(() => Math.ceil(total.value / itemsPerPage))
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function toggleFunctionalCategory(category) {
  if (selectedFunctionalCategory.value === category) {
    selectedFunctionalCategory.value = '全部'
  } else {
    selectedFunctionalCategory.value = category
  }
}

function toggleFavorite(tool) {
  const newFavoriteStatus = !tool.is_favorite
  
  toggleAnalysisToolFavorite(tool.id, newFavoriteStatus)
    .then(() => {
      tool.is_favorite = newFavoriteStatus
    })
    .catch(error => {
      console.error('Failed to toggle favorite:', error)
      // 如果API调用失败，不改变UI状态
    })
}

function openTool(tool) {
  // 这里可以根据需要实现工具详情页面跳转或弹窗
  console.log('打开工具:', tool)
  // 示例：跳转到工具详情页
  // router.push(`/tools/${tool.id}`)
  // 或者打开工具详情弹窗
  // showToolDetail(tool)
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>