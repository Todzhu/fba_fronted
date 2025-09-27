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
            <button
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
        <div class="flex items-start gap-2">
          <span class="text-gray-600 font-medium mt-2">功能分类</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="func in functionalCategories"
              :key="func"
              @click="toggleFunctionalCategory(func)"
              :class="[
                'px-3 py-1.5 rounded text-sm transition-colors',
                selectedFunctionalCategory === func
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ func }}
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
          class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <!-- Tool Header -->
          <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :style="{ backgroundColor: tool.icon_bg }">
              <component :is="tool.icon" class="w-6 h-6" :style="{ color: tool.icon_color }" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 mb-1 flex items-center">
                {{ tool.name }}
                <button
                  @click.stop="toggleFavorite(tool)"
                  :class="['ml-2', tool.is_favorite ? 'text-yellow-400' : 'text-gray-300', 'hover:text-yellow-500', 'focus:outline-none']"
                  title="收藏"
                >
                  <Star class="w-5 h-5" :fill="tool.is_favorite ? 'currentColor' : 'none'" />
                </button>
              </h3>
              <div class="flex gap-2">
                <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{{ tool.category }}</span>
                <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">{{ tool.type }}</span>
              </div>
            </div>
          </div>

          <!-- Tool Description -->
          <p class="text-gray-600 text-sm mb-4 line-clamp-3">{{ tool.description }}</p>

          <!-- Tool Stats -->
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
  BarChart3,
  GitBranch,
  Zap,
  Target,
  Layers,
  TrendingUp,
  Network,
  Shuffle,
  PieChart,
  Activity
} from 'lucide-vue-next'
import { fetchAnalysisToolList, fetchAnalysisToolCategories } from '#/api/analysisTool'

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const selectedPrimaryCategory = ref('全部')
const selectedFunctionalCategory = ref('全部')

const primaryCategories = ['全部', '组学通用', '单细胞转录组', '蛋白组学', '其他']
const functionalCategories = ['全部', '富集分析', '可视化绘图', 'h5ad相关', '统计分析', '特征转换', '序列处理']

const tools = ref([])
const total = ref(0)
const loading = ref(false)

const iconMap = {
  BarChart3,
  GitBranch,
  Zap,
  Target,
  Layers,
  TrendingUp,
  Network,
  Shuffle,
  PieChart,
  Activity
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
        icon: iconMap[tool.icon] || BarChart3,
        icon_bg: tool.icon_bg,
        icon_color: tool.icon_color,
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

onMounted(() => {
  loadTools()
})

const paginatedTools = computed(() => tools.value)
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
  tool.is_favorite = !tool.is_favorite
  // TODO: Implement actual favorite/unfavorite logic
  console.log('Toggling favorite for tool:', tool.name, 'is_favorite:', tool.is_favorite)
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