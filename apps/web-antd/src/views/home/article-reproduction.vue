<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
    <CommonHeader
      search-placeholder="搜索文章..."
      @search="val => searchQuery = val"
    />
    <main class="pt-16">
      <!-- 页面标题 -->
      <section class="bg-gradient-to-r from-green-600 to-teal-600 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
            文章复现
          </h1>
          <p class="text-xl text-green-100 max-w-3xl mx-auto">
            重现经典生物信息学研究，学习前沿分析方法
          </p>
        </div>
      </section>

      <!-- 筛选区域 -->
      <section class="py-8 bg-gradient-to-b from-transparent to-white/50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-wrap gap-4">
            <select
              v-model="selectedJournal"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">所有期刊</option>
              <option v-for="journal in journals" :key="journal" :value="journal">
                {{ journal }}
              </option>
            </select>
            
            <select
              v-model="selectedYear"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">所有年份</option>
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
            
            <select
              v-model="selectedField"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">所有领域</option>
              <option v-for="field in fields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- 文章列表 -->
      <section class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 gap-8">
            <div
              v-for="article in filteredArticles"
              :key="article.id"
              class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div class="p-8">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <BookOpen class="h-5 w-5 text-green-600 mr-2" />
                      <span class="text-sm font-medium text-green-600">{{ article.journal }}</span>
                      <span class="mx-2 text-gray-300">•</span>
                      <span class="text-sm text-gray-500">{{ article.year }}</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ article.title }}</h3>
                    <p class="text-gray-600 leading-relaxed mb-4">{{ article.abstract }}</p>
                  </div>
                  <div class="ml-6 flex-shrink-0">
                    <div class="w-16 h-16 bg-gradient-to-br from-green-100 to-teal-100 rounded-lg flex items-center justify-center">
                      <component :is="article.icon" class="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <!-- 文章信息 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div class="flex items-center text-sm text-gray-600">
                    <Users class="h-4 w-4 mr-2" />
                    <span>{{ article.authors }}</span>
                  </div>
                  <div class="flex items-center text-sm text-gray-600">
                    <Tag class="h-4 w-4 mr-2" />
                    <span>{{ article.field }}</span>
                  </div>
                  <div class="flex items-center text-sm text-gray-600">
                    <Clock class="h-4 w-4 mr-2" />
                    <span>复现时间: {{ article.reproductionTime }}</span>
                  </div>
                </div>

                <!-- 关键技术 -->
                <div class="flex flex-wrap gap-2 mb-6">
                  <span
                    v-for="method in article.methods"
                    :key="method"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {{ method }}
                  </span>
                </div>

                <!-- 操作按钮 -->
                <div class="flex items-center space-x-4">
                  <button class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    开始复现
                  </button>
                  <button class="text-green-600 hover:text-green-800 px-6 py-2 rounded-lg border border-green-200 hover:border-green-300 font-medium transition-colors">
                    查看详情
                  </button>
                  <button class="text-gray-600 hover:text-gray-800 px-6 py-2 rounded-lg border border-gray-200 hover:border-gray-300 font-medium transition-colors">
                    下载数据
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
import CommonHeader from '../../components/CommonHeader.vue'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, BookOpen, Users, Tag, Clock, Dna, Microscope, 
  BarChart3, Network, Activity, Zap
} from 'lucide-vue-next'

// 获取当前路由
const route = useRoute()

// 响应式数据
const searchQuery = ref('')
const selectedJournal = ref('')
const selectedYear = ref('')
const selectedField = ref('')

// 筛选选项
const journals = ref(['Nature', 'Science', 'Cell', 'Nature Biotechnology', 'Bioinformatics', 'Genome Research'])
const years = ref(['2024', '2023', '2022', '2021', '2020'])
const fields = ref(['基因组学', '转录组学', '蛋白质组学', '单细胞分析', '系统生物学', '计算生物学'])

// 文章数据
const articles = ref([
  {
    id: 1,
    title: 'Single-cell RNA sequencing reveals cellular heterogeneity in human pancreatic islets',
    abstract: '本研究通过单细胞RNA测序技术揭示了人类胰岛细胞的异质性，发现了新的细胞亚型并阐明了其在糖尿病发病机制中的作用。研究为理解胰岛功能和疾病机制提供了新的视角。',
    journal: 'Nature',
    year: '2023',
    authors: 'Smith et al.',
    field: '单细胞分析',
    icon: Microscope,
    methods: ['scRNA-seq', '细胞聚类', '轨迹分析', '差异表达'],
    reproductionTime: '4-6小时'
  },
  {
    id: 2,
    title: 'Comprehensive genomic characterization of head and neck squamous cell carcinomas',
    abstract: '通过全面的基因组学分析，本研究揭示了头颈部鳞状细胞癌的分子特征，识别了新的治疗靶点和预后标志物，为精准医疗提供了重要依据。',
    journal: 'Cell',
    year: '2023',
    authors: 'Johnson et al.',
    field: '基因组学',
    icon: Dna,
    methods: ['WGS', '突变分析', '拷贝数变异', '融合基因'],
    reproductionTime: '6-8小时'
  },
  {
    id: 3,
    title: 'Proteome-wide analysis reveals novel therapeutic targets in Alzheimer\'s disease',
    abstract: '本研究通过蛋白质组学分析揭示了阿尔茨海默病的蛋白质表达谱变化，发现了新的治疗靶点，为药物开发提供了新的方向。',
    journal: 'Science',
    year: '2022',
    authors: 'Brown et al.',
    field: '蛋白质组学',
    icon: BarChart3,
    methods: ['质谱分析', '蛋白定量', '功能富集', '网络分析'],
    reproductionTime: '5-7小时'
  },
  {
    id: 4,
    title: 'Systems biology approach to understanding metabolic reprogramming in cancer',
    abstract: '采用系统生物学方法研究癌症中的代谢重编程现象，整合多组学数据构建代谢网络模型，揭示了癌细胞代谢适应的分子机制。',
    journal: 'Nature Biotechnology',
    year: '2022',
    authors: 'Davis et al.',
    field: '系统生物学',
    icon: Network,
    methods: ['代谢组学', '转录组学', '网络建模', '通路分析'],
    reproductionTime: '8-10小时'
  }
])

// 计算属性
const filteredArticles = computed(() => {
  let filtered = articles.value

  if (selectedJournal.value) {
    filtered = filtered.filter(article => article.journal === selectedJournal.value)
  }

  if (selectedYear.value) {
    filtered = filtered.filter(article => article.year === selectedYear.value)
  }

  if (selectedField.value) {
    filtered = filtered.filter(article => article.field === selectedField.value)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(article => 
      article.title.toLowerCase().includes(query) || 
      article.abstract.toLowerCase().includes(query)
    )
  }

  return filtered
})
</script>
