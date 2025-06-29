<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
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
              to="/"
              :class="[
                'px-3 py-2 rounded-md text-lg font-semibold transition-all duration-200',
                $route.path === '/'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              首页
            </router-link>
            <router-link 
              to="/cloud-workflows"
              :class="[
                'px-3 py-2 rounded-md text-lg font-semibold transition-all duration-200',
                $route.path === '/cloud-workflows'
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-800 hover:text-blue-600 hover:bg-gray-50'
              ]"
            >
              云流程
            </router-link>
            <a 
              href="#" 
              class="text-gray-800 hover:text-blue-600 px-3 py-2 rounded-md text-lg font-semibold transition-colors"
            >
              云工具
            </a>
            <a 
              href="#" 
              class="text-gray-800 hover:text-blue-600 px-3 py-2 rounded-md text-lg font-semibold transition-colors"
            >
              文章复现
            </a>
            <a 
              href="#" 
              class="text-gray-800 hover:text-blue-600 px-3 py-2 rounded-md text-lg font-semibold transition-colors"
            >
              示例报告
            </a>
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
                placeholder="搜索流程..."
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

    <div class="pt-16 flex">
      <!-- 左侧分类导航 -->
      <aside class="w-80 bg-white/80 backdrop-blur-sm shadow-sm border-r border-gray-200 min-h-screen">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">分析分类</h2>
          <nav class="space-y-2">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="setActiveCategory(category.id)"
              :class="[
                'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                activeCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              ]"
            >
              <div class="flex items-center">
                <component :is="category.icon" class="h-5 w-5 mr-3" />
                {{ category.name }}
              </div>
            </button>
          </nav>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <main class="flex-1 p-8">
        <!-- 页面标题 -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">云流程</h1>
          <p class="text-gray-600">选择适合您研究需求的生物信息学分析流程</p>
        </div>

        <!-- 流程卡片网格 -->
        <div class="grid grid-cols-1 gap-8">
          <div
            v-for="workflow in filteredWorkflows"
            :key="workflow.id"
            class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
          >
            <div class="p-8">
              <div class="flex items-start space-x-6">
                <!-- 流程图标 -->
                <div class="flex-shrink-0">
                  <div class="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <component :is="workflow.icon" class="h-10 w-10 text-blue-600" />
                  </div>
                </div>

                <!-- 流程信息 -->
                <div class="flex-1">
                  <div class="flex items-center mb-3">
                    <Diamond class="h-4 w-4 text-blue-600 mr-2" />
                    <h3 class="text-xl font-semibold text-gray-900">{{ workflow.name }}</h3>
                  </div>
                  
                  <p class="text-gray-600 leading-relaxed mb-4">{{ workflow.description }}</p>
                  
                  <!-- 流程特性 -->
                  <div class="flex flex-wrap gap-2 mb-4">
                    <span
                      v-for="feature in workflow.features"
                      :key="feature"
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {{ feature }}
                    </span>
                  </div>

                  <!-- 技术规格 -->
                  <div class="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
                    <div class="flex items-center">
                      <Clock class="h-4 w-4 mr-2" />
                      <span>预计时间: {{ workflow.estimatedTime }}</span>
                    </div>
                    <div class="flex items-center">
                      <Database class="h-4 w-4 mr-2" />
                      <span>数据类型: {{ workflow.dataType }}</span>
                    </div>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex items-center space-x-4">
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                      立即使用
                    </button>
                    <button class="text-blue-600 hover:text-blue-800 px-6 py-2 rounded-lg border border-blue-200 hover:border-blue-300 font-medium transition-colors">
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredWorkflows.length === 0" class="text-center py-16">
          <div class="text-gray-400 mb-4">
            <Search class="h-16 w-16 mx-auto" />
          </div>
          <h3 class="text-xl font-medium text-gray-900 mb-2">未找到相关流程</h3>
          <p class="text-gray-600">请尝试调整搜索关键词或选择其他分类</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, Diamond, Clock, Database, Microscope, Dna, Leaf, 
  Zap, BarChart3, Network, Activity
} from 'lucide-vue-next'

// 获取当前路由
const route = useRoute()

// 响应式数据
const searchQuery = ref('')
const activeCategory = ref('microbiology')

// 分类数据
const categories = ref([
  { id: 'microbiology', name: '微生物', icon: Microscope },
  { id: 'transcriptome', name: '转录组测序', icon: Dna },
  { id: 'genomics', name: '基因组学', icon: Activity },
  { id: 'proteomics', name: '蛋白质组学', icon: BarChart3 },
  { id: 'metabolomics', name: '代谢组学', icon: Network },
  { id: 'other', name: '其他服务', icon: Zap }
])

// 流程数据
const workflows = ref([
  {
    id: 1,
    name: '微生物多样性云分析',
    description: '对质控后的reads进行OTU聚类分析和物种分类学分析，基于OTU聚类分析结果，可以对OTU进行多种多样性指数分析，以及对测序深度的检测，基于分类学信息，可以在各个分类水平上进行群落结构的统计分析。在上述分析的基础上，可以对多样本的群落组成和系统发育信息进行Beta多样性分析，分组检验分析，差异显著性检验，环境因子关联分析，关联与模型预测分析和功能预测等一系列深入的统计学和可视化分析。',
    category: 'microbiology',
    icon: Microscope,
    features: ['OTU聚类分析', '物种分类学分析', '多样性指数分析', 'Beta多样性分析', '功能预测'],
    estimatedTime: '2-4小时',
    dataType: 'FASTQ/FASTA'
  },
  {
    id: 2,
    name: '微生物多样性QIIME2流程',
    description: '微生物多样性QIIME2流程，可用于二代测序的双端测序和三代测序的单端测序列文件，利用dada2降噪方法对16S/18S/ITS功能基因等特定区域的高通量测序序列进行降噪处理，获得每个样本的ASV代表序列及其丰度表，基于序列结果进行微生物多样性分析，挖掘通道测序序列中的微生物物种组成结构，进化关系以及微生物与理化指标相互作用等信息。',
    category: 'microbiology',
    icon: Activity,
    features: ['DADA2降噪', 'ASV分析', '物种组成分析', '进化关系分析', '理化指标关联'],
    estimatedTime: '3-5小时',
    dataType: '16S/18S/ITS'
  },
  {
    id: 3,
    name: '微生物-上传otu表全流程',
    description: '适合上传OTU表，基于OTU聚类分析结果，可以对OTU进行多种多样性指数分析，以及对测序深度的检测，基于分类学信息，可以在各个分类水平上进行群落结构的统计分析。在上述分析的基础上，可以对多样本的群落组成和系统发育信息进行Beta多样性分析，分组检验分析，差异显著性检验，环境因子关联分析，关联与模型预测分析和功能预测等一系列深入的统计学和可视化分析。',
    category: 'microbiology',
    icon: Database,
    features: ['OTU表分析', '多样性指数', '群落结构分析', '差异检验', '功能预测'],
    estimatedTime: '1-2小时',
    dataType: 'OTU表格'
  },
  {
    id: 4,
    name: 'RNA-seq转录组分析',
    description: '全面的RNA测序数据分析流程，包括质控、比对、定量、差异表达分析和功能富集分析。支持多种模式生物和非模式生物的转录组分析。',
    category: 'transcriptome',
    icon: Dna,
    features: ['质控分析', '序列比对', '基因定量', '差异表达', '功能富集'],
    estimatedTime: '4-6小时',
    dataType: 'FASTQ'
  },
  {
    id: 5,
    name: '单细胞转录组分析',
    description: '专业的单细胞RNA测序数据分析流程，包括细胞质控、降维聚类、细胞类型注释、轨迹分析和细胞通讯分析。',
    category: 'transcriptome',
    icon: Network,
    features: ['细胞质控', '聚类分析', '轨迹推断', '细胞注释', '通讯分析'],
    estimatedTime: '3-5小时',
    dataType: '10x Genomics'
  },
  {
    id: 6,
    name: '全基因组关联分析',
    description: 'GWAS分析流程，用于识别与复杂性状相关的遗传变异。包括质控、群体结构分析、关联分析和结果可视化。',
    category: 'genomics',
    icon: BarChart3,
    features: ['SNP质控', '群体结构', '关联分析', 'Manhattan图', 'QQ图'],
    estimatedTime: '2-4小时',
    dataType: 'VCF/PLINK'
  }
])

// 计算属性
const filteredWorkflows = computed(() => {
  let filtered = workflows.value

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    filtered = filtered.filter(workflow => workflow.category === activeCategory.value)
  }

  // 按搜索关键词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(workflow => 
      workflow.name.toLowerCase().includes(query) || 
      workflow.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

// 方法
const setActiveCategory = (categoryId) => {
  activeCategory.value = categoryId
}
</script>
