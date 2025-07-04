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
            <div class="w-12 h-12 rounded-lg flex items-center justify-center" :style="{ backgroundColor: tool.iconBg }">
              <component :is="tool.icon" class="w-6 h-6" :style="{ color: tool.iconColor }" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 mb-1">{{ tool.name }}</h3>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

// Reactive data
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 8
const selectedPrimaryCategory = ref('全部')
const selectedFunctionalCategory = ref('')

// Categories
const primaryCategories = ['全部', '组学通用', '单细胞转录组', '蛋白组学', '其他']
const functionalCategories = ['富集分析', '可视化绘图', 'h5ad相关', '统计分析', '特征转换', '序列处理']

// Sample tools data
const tools = ref([
  {
    id: 1,
    name: 'GO富集柱状图',
    category: '组学通用',
    type: '富集分析',
    description: '柱状图可以使用不同的颜色表示不同的GO分类，例如生物学过程、细胞组分和分子功能...',
    views: 500,
    likes: 1,
    icon: BarChart3,
    iconBg: '#e0f2fe',
    iconColor: '#0277bd',
    isFavorite: false
  },
  {
    id: 2,
    name: '蛋白亚细胞定位',
    category: '蛋白组学',
    type: '可视化绘图',
    description: '亚细胞定位是指某种蛋白质或其他生物分子内的具体位置，真核细胞主要的亚细胞...',
    views: 492,
    likes: 4,
    icon: Target,
    iconBg: '#fff3e0',
    iconColor: '#f57c00',
    isFavorite: true
  },
  {
    id: 3,
    name: '火山图',
    category: '组学通用',
    type: '可视化绘图',
    description: '火山图（Volcano Plot）是一种用来展示组学数据的图表，可以方便直观地展示两组样品...',
    views: 1144,
    likes: 0,
    icon: TrendingUp,
    iconBg: '#f3e5f5',
    iconColor: '#7b1fa2',
    isFavorite: false
  },
  {
    id: 4,
    name: '小提琴图',
    category: '单细胞转录组',
    type: 'h5ad相关',
    description: '分析的单细胞转录组数据，经过归一化处理的基因表达小提琴图...',
    views: 1487,
    likes: 0,
    icon: Activity,
    iconBg: '#e8f5e8',
    iconColor: '#2e7d32',
    isFavorite: false
  },
  {
    id: 5,
    name: 'VENN分析',
    category: '组学通用',
    type: '统计分析',
    description: '韦恩（Venn）图是用于显示不同元素集合的重叠区域的图形，在生物信息学分析中，常用...',
    views: 639,
    likes: 0,
    icon: PieChart,
    iconBg: '#e1f5fe',
    iconColor: '#0288d1',
    isFavorite: true
  },
  {
    id: 6,
    name: '柱形图',
    category: '组学通用',
    type: '可视化绘图',
    description: '柱状图形图是一种用可视化的个体数据，它包含不同类别之间的数据比较...',
    views: 191,
    likes: 0,
    icon: BarChart3,
    iconBg: '#fff8e1',
    iconColor: '#f9a825',
    isFavorite: false
  },
  {
    id: 7,
    name: 'Significance A分析',
    category: '组学通用',
    type: '统计分析',
    description: '一般用于比较数据间，是算算实验，间隔内包含的样本数）不满足3次的情况下，比较...',
    views: 194,
    likes: 3,
    icon: Zap,
    iconBg: '#fce4ec',
    iconColor: '#c2185b',
    isFavorite: false
  },
  {
    id: 8,
    name: '散点图组合',
    category: '组学通用',
    type: '统计分析',
    description: '使用一系列的散点来显示变量自身的标志点的分析，并通过线性回归来更好地它的趋势...',
    views: 266,
    likes: 1,
    icon: GitBranch,
    iconBg: '#e3f2fd',
    iconColor: '#1976d2',
    isFavorite: false
  }
])

// Computed filtered tools
const filteredTools = computed(() => {
  let filtered = tools.value

  // Filter by primary category
  if (selectedPrimaryCategory.value !== '全部') {
    filtered = filtered.filter(tool => tool.category === selectedPrimaryCategory.value)
  }

  // Filter by functional category (single selection)
  if (selectedFunctionalCategory.value) {
    filtered = filtered.filter(tool => tool.type === selectedFunctionalCategory.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(tool => 
      tool.name.toLowerCase().includes(query) || 
      tool.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

const paginatedTools = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredTools.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredTools.value.length / itemsPerPage)
})

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Methods
const toggleFunctionalCategory = (category) => {
  if (selectedFunctionalCategory.value === category) {
    selectedFunctionalCategory.value = ''
  } else {
    selectedFunctionalCategory.value = category
  }
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