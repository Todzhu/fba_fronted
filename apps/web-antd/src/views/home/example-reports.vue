<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
    <!-- 顶部导航栏 -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">BC</span>
              </div>
              <span class="ml-2 text-xl font-bold text-gray-900">BioCloud</span>
            </div>
          </div>

          <!-- 导航菜单 -->
          <nav class="hidden md:flex items-center space-x-8">
            <router-link 
              to="/index"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/index'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              云工具
            </router-link>
            <router-link 
              to="/cloud-workflows"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/cloud-workflows'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              云流程
            </router-link>
            <router-link 
              to="/article-reproduction"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/article-reproduction'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              文章复现
            </router-link>
            <router-link 
              to="/example-reports"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/example-reports'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              示例报告
            </router-link>
            <router-link 
              to="/data-management"
              :class="[
                'px-3 py-2 rounded-md text-base font-semibold transition-all duration-200',
                $route.path === '/data-management'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              数据管理
            </router-link>
          </nav>

          <!-- 搜索框和登录注册按钮 -->
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search class="h-4 w-4 text-gray-400" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索报告..."
                class="block w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button class="text-gray-800 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-semibold transition-colors">
              登录
            </button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              注册
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="pt-16">
      <!-- 页面标题 -->
      <section class="bg-gradient-to-r from-green-600 to-teal-600 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
            示例报告
          </h1>
          <p class="text-xl text-orange-100 max-w-3xl mx-auto">
            查看专业的生物信息学分析报告，学习最佳实践
          </p>
        </div>
      </section>

      <!-- 报告分类 -->
      <section class="py-8 bg-gradient-to-b from-transparent to-white/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex overflow-x-auto space-x-4 pb-2">
            <button
              v-for="category in reportCategories"
              :key="category.id"
              @click="setActiveReportCategory(category.id)"
              :class="[
                'flex-shrink-0 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200',
                activeReportCategory === category.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              ]"
            >
              {{ category.name }}
            </button>
          </div>
        </div>
      </section>

      <!-- 报告网格 -->
      <section class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div
              v-for="report in filteredReports"
              :key="report.id"
              class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-gray-100"
            >
              <!-- 报告预览图 -->
              <div class="h-48 bg-gradient-to-br from-green-100 to-teal-100 relative overflow-hidden">
                <div class="absolute inset-0 flex items-center justify-center">
                  <component :is="report.icon" class="h-16 w-16 text-green-600 opacity-50" />
                </div>
                <div class="absolute top-4 right-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getReportCategoryColor(report.category)
                    ]"
                  >
                    {{ getReportCategoryName(report.category) }}
                  </span>
                </div>
              </div>
              
              <div class="p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ report.title }}</h3>
                <p class="text-gray-600 text-sm leading-relaxed mb-4">{{ report.description }}</p>
                
                <!-- 报告信息 -->
                <div class="space-y-2 mb-4 text-sm text-gray-600">
                  <div class="flex items-center">
                    <Calendar class="h-4 w-4 mr-2" />
                    <span>{{ report.date }}</span>
                  </div>
                  <div class="flex items-center">
                    <FileText class="h-4 w-4 mr-2" />
                    <span>{{ report.pages }} 页</span>
                  </div>
                  <div class="flex items-center">
                    <Download class="h-4 w-4 mr-2" />
                    <span>{{ report.downloads }} 次下载</span>
                  </div>
                </div>

                <!-- 技术标签 -->
                <div class="flex flex-wrap gap-1 mb-4">
                  <span
                    v-for="tech in report.technologies"
                    :key="tech"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                  >
                    {{ tech }}
                  </span>
                </div>
                
                <!-- 操作按钮 -->
                <div class="flex items-center space-x-2">
                  <button class="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                    查看报告
                  </button>
                  <button class="px-3 py-2 text-green-600 hover:text-green-800 border border-green-200 hover:border-green-300 rounded-lg transition-colors">
                    <Download class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, Calendar, FileText, Download, Microscope, Dna, 
  BarChart3, Network, Activity, Zap
} from 'lucide-vue-next'

// 获取当前路由
const route = useRoute()

// 响应式数据
const searchQuery = ref('')
const activeReportCategory = ref('all')

// 报告分类
const reportCategories = ref([
  { id: 'all', name: '全部报告' },
  { id: 'genomics', name: '基因组学' },
  { id: 'transcriptomics', name: '转录组学' },
  { id: 'proteomics', name: '蛋白质组学' },
  { id: 'single-cell', name: '单细胞分析' },
  { id: 'microbiome', name: '微生物组' }
])

// 报告数据
const reports = ref([
  {
    id: 1,
    title: '人类基因组变异分析报告',
    description: '基于全基因组测序数据的变异检测和注释分析，包含SNP、InDel和结构变异的全面分析。',
    category: 'genomics',
    icon: Dna,
    date: '2024-01-15',
    pages: 45,
    downloads: 1250,
    technologies: ['WGS', 'GATK', 'SnpEff', 'VEP']
  },
  {
    id: 2,
    title: 'RNA-seq差异表达分析',
    description: '转录组测序数据的质控、比对、定量和差异表达分析，包含功能富集和通路分析。',
    category: 'transcriptomics',
    icon: BarChart3,
    date: '2024-01-10',
    pages: 38,
    downloads: 980,
    technologies: ['RNA-seq', 'DESeq2', 'GSEA', 'KEGG']
  },
  {
    id: 3,
    title: '单细胞转录组聚类分析',
    description: '单细胞RNA测序数据的降维聚类分析，细胞类型注释和发育轨迹推断。',
    category: 'single-cell',
    icon: Microscope,
    date: '2024-01-08',
    pages: 52,
    downloads: 1580,
    technologies: ['scRNA-seq', 'Seurat', 'Monocle', 'CellChat']
  },
  {
    id: 4,
    title: '蛋白质组定量分析报告',
    description: '基于质谱的蛋白质组定量分析，包含蛋白鉴定、定量和功能注释。',
    category: 'proteomics',
    icon: Activity,
    date: '2024-01-05',
    pages: 41,
    downloads: 720,
    technologies: ['LC-MS/MS', 'MaxQuant', 'Perseus', 'STRING']
  },
  {
    id: 5,
    title: '微生物群落多样性分析',
    description: '16S rRNA测序数据的微生物群落组成和多样性分析，包含物种注释和功能预测。',
    category: 'microbiome',
    icon: Network,
    date: '2024-01-03',
    pages: 35,
    downloads: 890,
    technologies: ['16S rRNA', 'QIIME2', 'PICRUSt2', 'LEfSe']
  },
  {
    id: 6,
    title: '空间转录组分析报告',
    description: '空间转录组数据的空间表达模式分析和组织结构识别。',
    category: 'transcriptomics',
    icon: Zap,
    date: '2023-12-28',
    pages: 48,
    downloads: 650,
    technologies: ['Visium', 'Scanpy', 'SpatialDE', 'CellPhoneDB']
  }
])

// 计算属性
const filteredReports = computed(() => {
  let filtered = reports.value

  if (activeReportCategory.value !== 'all') {
    filtered = filtered.filter(report => report.category === activeReportCategory.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(report => 
      report.title.toLowerCase().includes(query) || 
      report.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

// 方法
const setActiveReportCategory = (categoryId) => {
  activeReportCategory.value = categoryId
}

const getReportCategoryName = (categoryId) => {
  const category = reportCategories.value.find(cat => cat.id === categoryId)
  return category ? category.name : ''
}

const getReportCategoryColor = (categoryId) => {
  const colors = {
    'genomics': 'bg-blue-100 text-blue-800',
    'transcriptomics': 'bg-green-100 text-green-800',
    'proteomics': 'bg-purple-100 text-purple-800',
    'single-cell': 'bg-pink-100 text-pink-800',
    'microbiome': 'bg-cyan-100 text-cyan-800'
  }
  return colors[categoryId] || 'bg-gray-100 text-gray-800'
}
</script>
