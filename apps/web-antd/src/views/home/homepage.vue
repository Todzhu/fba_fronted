<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <!-- 顶部导航栏 -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 transition-all duration-300">
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
            <!-- 搜索框 -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search class="h-4 w-4 text-gray-400" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索工具..."
                class="block w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button @click="clearSearch" class="text-gray-400 hover:text-gray-600">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <!-- 登录注册按钮 -->
            <a href="/auth/register" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              注册
            </a>
            <router-link to="/auth/login" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              登录
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- 主标题区 -->
    <section class="bg-gradient-to-br from-blue-50 to-cyan-50 py-16 pt-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          发现强大的生物信息分析工具
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          探索各类专业分析工具，加速您的科研发现
        </p>
      </div>
    </section>

    <!-- 分类筛选区 -->
    <section class="py-8 bg-gradient-to-b from-transparent to-white/50 border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex overflow-x-auto space-x-4 pb-2">
          <button
            v-for="category in categories"
            :key="category.id"
            @click="setActiveCategory(category.id)"
            :class="[
              'flex-shrink-0 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            ]"
          >
            {{ category.name }}
          </button>
        </div>
      </div>
    </section>

    <!-- 工具展示区 -->
    <section class="py-12 bg-gradient-to-b from-transparent to-white/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="tool in filteredTools"
            :key="tool.id"
            class="bg-white/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <!-- 工具示例图 -->
            <div class="h-48 bg-gray-100 overflow-hidden">
              <img 
                :src="tool.image" 
                :alt="tool.name"
                class="w-full h-full object-cover"
              />
            </div>
            
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ tool.name }}</h3>
                  <p class="text-gray-600 text-sm leading-relaxed line-clamp-2">{{ tool.description }}</p>
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <span
                  :class="[
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                    getCategoryColor(tool.category)
                  ]"
                >
                  {{ getCategoryName(tool.category) }}
                </span>
                
                <button 
                  @click="openDetailModal(tool)"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-if="filteredTools.length === 0" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <Search class="h-12 w-12 mx-auto" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">未找到相关工具</h3>
          <p class="text-gray-600">请尝试调整搜索关键词或选择其他分类</p>
        </div>
      </div>
    </section>

    <!-- 平台介绍 -->
    <section class="py-16 bg-gradient-to-r from-gray-50 to-blue-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">平台介绍</h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            BioCloud是专为生物信息学研究设计的云端分析平台，提供全面的数据分析解决方案
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database class="h-8 w-8 text-blue-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">海量数据处理</h3>
            <p class="text-gray-600">支持TB级别的生物数据处理，高效的云端计算资源</p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 class="h-8 w-8 text-green-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">专业分析工具</h3>
            <p class="text-gray-600">涵盖基因组学、转录组学、蛋白质组学等多个领域</p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users class="h-8 w-8 text-purple-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">协作研究</h3>
            <p class="text-gray-600">支持团队协作，数据共享，加速科研进程</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 关于我们 -->
    <section class="py-16 bg-gradient-to-l from-white to-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-6">关于我们</h2>
            <p class="text-lg text-gray-600 mb-6">
              BioCloud团队由来自顶尖科研院所的生物信息学专家和软件工程师组成，致力于为全球科研工作者提供最先进的生物数据分析平台。
            </p>
            <p class="text-lg text-gray-600 mb-8">
              我们深知生物信息学研究的复杂性和挑战性，因此专注于开发易用、高效、可靠的分析工具，让研究人员能够专注于科学发现本身。
            </p>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <div class="text-2xl font-bold text-blue-600 mb-1">10,000+</div>
                <div class="text-gray-600">活跃用户</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600 mb-1">50+</div>
                <div class="text-gray-600">分析工具</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600 mb-1">1PB+</div>
                <div class="text-gray-600">数据处理量</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600 mb-1">99.9%</div>
                <div class="text-gray-600">服务可用性</div>
              </div>
            </div>
          </div>
          <div class="lg:pl-8">
            <img 
              src="./placeholder.svg?height=400&width=500" 
              alt="团队介绍"
              class="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 联系我们 -->
    <section class="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">联系我们</h2>
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          有任何问题或建议？我们的专业团队随时为您提供支持
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div class="flex flex-col items-center">
            <Mail class="h-8 w-8 text-blue-600 mb-2" />
            <h3 class="font-semibold text-gray-900 mb-1">邮箱联系</h3>
            <p class="text-gray-600">support@biocloud.com</p>
          </div>
          <div class="flex flex-col items-center">
            <MessageCircle class="h-8 w-8 text-blue-600 mb-2" />
            <h3 class="font-semibold text-gray-900 mb-1">在线客服</h3>
            <p class="text-gray-600">7×24小时在线支持</p>
          </div>
          <div class="flex flex-col items-center">
            <BookOpen class="h-8 w-8 text-blue-600 mb-2" />
            <h3 class="font-semibold text-gray-900 mb-1">帮助文档</h3>
            <p class="text-gray-600">详细的使用指南</p>
          </div>
        </div>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
          立即联系
        </button>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="bg-gray-50 border-t border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="text-gray-600 text-sm mb-4 md:mb-0">
            © 2024 BioCloud. 保留所有权利。
          </div>
          <div class="flex space-x-6">
            <a href="#" class="text-gray-600 hover:text-blue-600 text-sm transition-colors">关于我们</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 text-sm transition-colors">帮助中心</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 text-sm transition-colors">联系我们</a>
            <a href="#" class="text-gray-600 hover:text-blue-600 text-sm transition-colors">隐私政策</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- 工具详情模态框 -->
    <div v-if="showDetailModal && selectedTool" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-semibold text-gray-900">{{ selectedTool.name }}</h3>
          <button
            @click="closeDetailModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="h-6 w-6" />
          </button>
        </div>
        
        <div class="p-6">
          <!-- 功能描述 -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-3">功能描述</h4>
            <p class="text-gray-600 leading-relaxed">{{ selectedTool.detailedDescription }}</p>
          </div>

          <!-- 主要功能 -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-3">主要功能</h4>
            <ul class="space-y-2">
              <li v-for="feature in selectedTool.features" :key="feature" class="flex items-start">
                <div class="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span class="text-gray-600">{{ feature }}</span>
              </li>
            </ul>
          </div>

          <!-- 使用场景 -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-3">使用场景</h4>
            <ul class="space-y-2">
              <li v-for="useCase in selectedTool.useCases" :key="useCase" class="flex items-start">
                <div class="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span class="text-gray-600">{{ useCase }}</span>
              </li>
            </ul>
          </div>

          <!-- 使用方法 -->
          <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-900 mb-3">使用方法</h4>
            <p class="text-gray-600 leading-relaxed">{{ selectedTool.usage }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end">
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              访问工具
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, X, Database, BarChart3, Users, Mail, MessageCircle, BookOpen
} from 'lucide-vue-next'

// 获取当前路由
const route = useRoute()

// 响应式数据
const searchQuery = ref('')
const activeCategory = ref('all')
const showDetailModal = ref(false)
const selectedTool = ref(null)

// 分类数据
const categories = ref([
  { id: 'all', name: '全部' },
  { id: 'single-cell', name: '单细胞数据分析' },
  { id: 'spatial', name: '空间转录组分析' },
  { id: 'proteomics', name: '蛋白质组学分析' },
  { id: 'genomics', name: '基因组学工具' },
  { id: 'metabolomics', name: '代谢组学分析' },
  { id: 'microbiome', name: '微生物组分析' }
])

// 工具数据
const tools = ref([
  {
    id: 1,
    name: 'SingleCell Pro',
    description: '专业的单细胞RNA测序数据分析平台，支持细胞聚类、轨迹分析和差异表达基因检测',
    category: 'single-cell',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '基于最新算法的单细胞RNA测序数据分析平台，提供从数据预处理到高级分析的完整解决方案。支持多种单细胞测序技术，包括10x Genomics、Smart-seq2等主流平台数据。',
    features: [
      '高精度细胞聚类分析',
      '细胞发育轨迹推断',
      '差异表达基因检测',
      '功能富集分析',
      '交互式数据可视化',
      '批量效应校正',
      '细胞类型注释'
    ],
    useCases: [
      '肿瘤异质性研究',
      '发育生物学研究',
      '免疫细胞分析',
      '干细胞研究',
      '神经科学研究'
    ],
    usage: '上传单细胞测序数据（支持10x、h5、csv等格式），选择分析参数，系统将自动进行质控、降维、聚类等分析步骤，并生成可视化结果报告。整个分析过程通常需要30分钟到2小时，具体时间取决于数据规模。'
  },
  {
    id: 2,
    name: 'SpatialViz',
    description: '空间转录组数据可视化工具，提供高质量的空间表达图谱和组织结构分析',
    category: 'spatial',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '专业的空间转录组数据分析和可视化平台，支持Visium、Slide-seq、MERFISH等多种空间转录组技术数据的处理和分析。',
    features: [
      '空间基因表达可视化',
      '组织结构识别',
      '空间聚类分析',
      '空间差异表达分析',
      '细胞通讯分析',
      '3D空间重建'
    ],
    useCases: [
      '肿瘤微环境研究',
      '器官发育分析',
      '疾病病理研究',
      '药物作用机制研究'
    ],
    usage: '上传空间转录组数据和组织图像，系统将自动进行数据预处理、空间聚类、差异分析等步骤，生成高质量的空间表达图谱和分析报告。'
  },
  {
    id: 3,
    name: 'ProteomeAnalyzer',
    description: '蛋白质组学数据处理和分析套件，包含蛋白质鉴定、定量和功能注释功能',
    category: 'proteomics',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '全面的蛋白质组学数据分析平台，支持Label-free、TMT、iTRAQ等多种定量蛋白质组学实验数据的处理和分析。',
    features: [
      '蛋白质鉴定和定量',
      '差异蛋白质分析',
      '功能富集分析',
      '蛋白质相互作用网络',
      '翻译后修饰分析',
      '质谱数据质控'
    ],
    useCases: [
      '疾病标志物发现',
      '药物作用机制研究',
      '蛋白质功能研究',
      '代谢通路分析'
    ],
    usage: '上传质谱原始数据或蛋白质定量结果，选择实验设计参数，系统将进行蛋白质鉴定、定量分析、统计检验和功能注释，输出详细的分析报告。'
  },
  {
    id: 4,
    name: 'GenomeAssembly',
    description: '基因组组装和注释工具，支持短读长和长读长测序数据的高质量组装',
    category: 'genomics',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '先进的基因组组装平台，集成多种组装算法，支持从细菌到哺乳动物等不同复杂度基因组的组装和注释。',
    features: [
      '混合组装策略',
      '基因组质量评估',
      '基因预测和注释',
      '重复序列识别',
      '比较基因组学分析',
      '变异检测'
    ],
    useCases: [
      '新物种基因组测序',
      '基因组进化研究',
      '功能基因组学研究',
      '育种辅助选择'
    ],
    usage: '上传测序数据（支持Illumina、PacBio、Oxford Nanopore等平台），选择组装参数和参考基因组，系统将自动进行组装、质控、注释等步骤。'
  },
  {
    id: 5,
    name: 'MetaboPath',
    description: '代谢组学通路分析工具，提供代谢物鉴定和代谢通路富集分析功能',
    category: 'metabolomics',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '专业的代谢组学数据分析平台，整合KEGG、MetaCyc等主要代谢通路数据库，提供全面的代谢物分析解决方案。',
    features: [
      '代谢物鉴定和定量',
      '代谢通路富集分析',
      '代谢网络构建',
      '差异代谢物分析',
      '时间序列分析',
      '多组学整合分析'
    ],
    useCases: [
      '疾病代谢标志物研究',
      '药物代谢研究',
      '营养代谢研究',
      '环境代谢组学'
    ],
    usage: '上传代谢组学数据（支持mzML、mzXML等格式），系统将进行峰检测、代谢物鉴定、统计分析和通路富集分析，生成可视化结果。'
  },
  {
    id: 6,
    name: 'MicrobiomeKit',
    description: '微生物组数据分析平台，支持物种组成分析、多样性计算和功能预测',
    category: 'microbiome',
    image: '/placeholder.svg?height=200&width=300',
    detailedDescription: '全面的微生物组数据分析工具包，支持16S rRNA、宏基因组、宏转录组等多种微生物组学数据的分析。',
    features: [
      '物种组成分析',
      'Alpha和Beta多样性分析',
      '差异物种检测',
      '功能预测分析',
      '微生物网络分析',
      '时间序列分析'
    ],
    useCases: [
      '肠道微生物研究',
      '环境微生物监测',
      '疾病相关微生物研究',
      '益生菌功能研究'
    ],
    usage: '上传微生物组测序数据或OTU表，选择分析参数和元数据，系统将进行物种注释、多样性分析、差异检测和功能预测。'
  }
])

// 计算属性
const filteredTools = computed(() => {
  let filtered = tools.value

  // 按分类筛选
  if (activeCategory.value !== 'all') {
    filtered = filtered.filter(tool => tool.category === activeCategory.value)
  }

  // 按搜索关键词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(tool => 
      tool.name.toLowerCase().includes(query) || 
      tool.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

// 方法
const setActiveCategory = (categoryId) => {
  activeCategory.value = categoryId
}

const clearSearch = () => {
  searchQuery.value = ''
}

const getCategoryName = (categoryId) => {
  const category = categories.value.find(cat => cat.id === categoryId)
  return category ? category.name : ''
}

const getCategoryColor = (categoryId) => {
  const colors = {
    'single-cell': 'bg-blue-100 text-blue-800',
    'spatial': 'bg-green-100 text-green-800',
    'proteomics': 'bg-purple-100 text-purple-800',
    'genomics': 'bg-orange-100 text-orange-800',
    'metabolomics': 'bg-pink-100 text-pink-800',
    'microbiome': 'bg-cyan-100 text-cyan-800'
  }
  return colors[categoryId] || 'bg-gray-100 text-gray-800'
}

const openDetailModal = (tool) => {
  selectedTool.value = tool
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedTool.value = null
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 自定义滚动条样式 */
.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
