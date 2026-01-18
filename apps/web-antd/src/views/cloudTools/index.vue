<script lang="ts" setup>
import type { AnalysisTool } from '#/api/analysis-tools';

import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Card,
  Checkbox,
  Empty,
  Input,
  Pagination,
  Radio,
  Spin,
} from 'ant-design-vue';

const router = useRouter();

const searchText = ref('');
const activeOmics = ref('all');
const activeFunc = ref<string[]>([]);
const sortBy = ref('updated_time');
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const tools = ref<AnalysisTool[]>([]);
const loading = ref(false);

// Mock Data Definitions
const mockOmicsOptions = [
  '组学通用',
  '单细胞转录组',
  '空间转录组',
  '蛋白组学',
  '代谢组学',
  '微生物组',
  '表观组学',
  '基因组学',
  '其他',
];

const mockFuncOptions = [
  'ID转换',
  '富集分析',
  '可视化绘图',
  'h5ad相关',
  '差异可视化',
  '亚细胞定位',
  '统计分析',
  '机器学习',
  '特征筛选',
  '降维分析',
  '特征转换',
  '序列处理',
  '功能注释',
  '互作网络',
];

const mockToolsData: AnalysisTool[] = [
  {
    id: 1,
    title: 'GO富集柱状图',
    description:
      '柱形图还可以使用不同的颜色表示不同的GO分类，例如生物学过程、细胞组分和分子功能。',
    omics_category: '组学通用',
    func_category: '富集分析',
    icon: 'mdi:chart-bar',
    color: '#1890ff',
    views: 605,
    stars: 12,
    status: 1,
    sort: 1,
    created_time: '2024-01-01',
    updated_time: '2024-01-15',
  },
  {
    id: 2,
    title: '蛋白亚细胞定位',
    description:
      '亚细胞定位是指某种蛋白或表达产物在细胞内的具体存在部位。真核细胞主要的亚细胞定位...',
    omics_category: '蛋白组学',
    func_category: '亚细胞定位',
    icon: 'mdi:chart-donut',
    color: '#52c41a',
    views: 529,
    stars: 8,
    status: 1,
    sort: 2,
    created_time: '2024-01-02',
    updated_time: '2024-01-10',
  },
  {
    id: 3,
    title: '火山图',
    description:
      '火山图 (Volcano Plot) 是一类用来展示组间差异数据的图像，可以方便直观的展示两组样...',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:volcano',
    color: '#f5222d',
    views: 1268,
    stars: 45,
    status: 1,
    sort: 3,
    created_time: '2024-01-03',
    updated_time: '2024-01-20',
  },
  {
    id: 4,
    title: '小提琴图',
    description:
      '分析的单细胞转录组数据，绘制指定基因的表达量小提琴图，常用于展示基因表达分布。',
    omics_category: '单细胞转录组',
    func_category: '可视化绘图',
    icon: 'mdi:violin',
    color: '#722ed1',
    views: 2349,
    stars: 67,
    status: 1,
    sort: 4,
    created_time: '2024-01-04',
    updated_time: '2024-01-18',
  },
  {
    id: 5,
    title: 'VENN分析',
    description:
      '韦恩 (Venn) 图用于展示不同的元素集合的重叠区域的图示，在生物信息分析中，常用于...',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:chart-bell-curve',
    color: '#13c2c2',
    views: 848,
    stars: 23,
    status: 1,
    sort: 5,
    created_time: '2024-01-05',
    updated_time: '2024-01-05',
  },
  {
    id: 6,
    title: '(堆叠) 柱形图',
    description:
      '堆叠柱形图是一种用于可视化多个类别之间的组成关系的图表。它将不同类别的数值以柱...',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:chart-bar-stacked',
    color: '#fa8c16',
    views: 197,
    stars: 5,
    status: 1,
    sort: 6,
    created_time: '2024-01-06',
    updated_time: '2024-01-12',
  },
  {
    id: 7,
    title: 'Significance A分析',
    description:
      '一般应用于组学数据中，重复性实验（即组内包含的样本数量）不满足3次的情况下，比较...',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:sigma',
    color: '#eb2f96',
    views: 196,
    stars: 3,
    status: 1,
    sort: 7,
    created_time: '2024-01-07',
    updated_time: '2024-01-08',
  },
  {
    id: 8,
    title: '散点图拟合',
    description:
      '使用一系列的散点展示变量在直角坐标系中的分布，并通过线性拟合来呈现它们的趋势。',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:chart-scatter-plot',
    color: '#2f54eb',
    views: 267,
    stars: 10,
    status: 1,
    sort: 8,
    created_time: '2024-01-08',
    updated_time: '2024-01-16',
  },
  {
    id: 9,
    title: 'ROC分析',
    description:
      'ROC是评估生物标志物预测性能的一种图形工具，用于指示一个生物...',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:chart-line',
    color: '#a0d911',
    views: 213,
    stars: 9,
    status: 1,
    sort: 9,
    created_time: '2024-01-09',
    updated_time: '2024-01-15',
  },
  {
    id: 10,
    title: 'PCA分析',
    description:
      'PCA的工作就是从原始的空间中顺序地找一组相互正交的坐标轴，新的坐标轴的选择与数据...',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:axis-arrow',
    color: '#1890ff',
    views: 1417,
    stars: 88,
    status: 1,
    sort: 10,
    created_time: '2024-01-10',
    updated_time: '2024-01-22',
  },
  {
    id: 11,
    title: '基因ID转换',
    description:
      '支持多种数据库ID之间的相互转换，包括Ensembl, NCBI Gene ID, Symbol等。',
    omics_category: '组学通用',
    func_category: 'ID转换',
    icon: 'mdi:identifier',
    color: '#fa541c',
    views: 3421,
    stars: 156,
    status: 1,
    sort: 11,
    created_time: '2024-01-11',
    updated_time: '2024-01-25',
  },
  {
    id: 12,
    title: 'Seurat聚类分析',
    description: '基于Seurat流程的单细胞聚类分析，支持自定义分辨率和降维参数。',
    omics_category: '单细胞转录组',
    func_category: '统计分析',
    icon: 'mdi:dots-hexagon',
    color: '#722ed1',
    views: 892,
    stars: 45,
    status: 1,
    sort: 12,
    created_time: '2024-01-12',
    updated_time: '2024-01-19',
  },
  {
    id: 13,
    title: 'KEGG富集分析',
    description:
      '基于KEGG数据库的通路富集分析，帮助理解基因列表在生物通路中的功能分布。',
    omics_category: '组学通用',
    func_category: '富集分析',
    icon: 'mdi:dna',
    color: '#eb2f96',
    views: 750,
    stars: 30,
    status: 1,
    sort: 13,
    created_time: '2024-02-01',
    updated_time: '2024-02-05',
  },
  {
    id: 14,
    title: '热图绘制',
    description:
      '用于展示基因表达数据的聚类热图，直观呈现样本间的相似性和基因表达模式。',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:grid-large',
    color: '#fa541c',
    views: 1120,
    stars: 55,
    status: 1,
    sort: 14,
    created_time: '2024-02-02',
    updated_time: '2024-02-08',
  },
  {
    id: 15,
    title: 'Motif分析',
    description:
      '分析DNA或蛋白质序列中的保守基序（Motif），识别潜在的转录因子结合位点。',
    omics_category: '基因组学',
    func_category: '序列处理',
    icon: 'mdi:text-box-search-outline',
    color: '#1890ff',
    views: 430,
    stars: 15,
    status: 1,
    sort: 15,
    created_time: '2024-02-03',
    updated_time: '2024-02-10',
  },
  {
    id: 16,
    title: 'Circos图',
    description:
      '用于展示基因组结构、变异及基因间相互关系的环状图，适合多维数据展示。',
    omics_category: '基因组学',
    func_category: '可视化绘图',
    icon: 'mdi:loading',
    color: '#13c2c2',
    views: 680,
    stars: 28,
    status: 1,
    sort: 16,
    created_time: '2024-02-04',
    updated_time: '2024-02-12',
  },
  {
    id: 17,
    title: '生存分析',
    description:
      '基于Kaplan-Meier方法的生存曲线绘制及Log-rank检验，评估临床预后。',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:hospital-box-outline',
    color: '#f5222d',
    views: 950,
    stars: 40,
    status: 1,
    sort: 17,
    created_time: '2024-02-05',
    updated_time: '2024-02-15',
  },
  {
    id: 18,
    title: '相关性分析',
    description:
      '计算变量间的相关系数（如Pearson, Spearman），并绘制相关性热图或散点图。',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:relation-many-to-many',
    color: '#722ed1',
    views: 560,
    stars: 22,
    status: 1,
    sort: 18,
    created_time: '2024-02-06',
    updated_time: '2024-02-18',
  },
  {
    id: 19,
    title: '网络图分析',
    description:
      '基于互作关系（PPI等）构建网络图，展示关键节点及网络拓扑结构。',
    omics_category: '蛋白组学',
    func_category: '互作网络',
    icon: 'mdi:graph-outline',
    color: '#52c41a',
    views: 1300,
    stars: 60,
    status: 1,
    sort: 19,
    created_time: '2024-02-07',
    updated_time: '2024-02-20',
  },
  {
    id: 20,
    title: '箱线图',
    description:
      '用于展示一组数据分散情况资料的统计图，包含最大值、最小值、中位数、上四分位数和下四分位数。',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:chart-box-outline',
    color: '#fa8c16',
    views: 880,
    stars: 35,
    status: 1,
    sort: 20,
    created_time: '2024-02-08',
    updated_time: '2024-02-22',
  },
  {
    id: 21,
    title: 'Upset图',
    description:
      '用于展示多个集合之间交集的图表，比韦恩图更适合展示多于5个集合的交互关系。',
    omics_category: '组学通用',
    func_category: '统计分析',
    icon: 'mdi:chart-bar',
    color: '#2f54eb',
    views: 490,
    stars: 18,
    status: 1,
    sort: 21,
    created_time: '2024-02-09',
    updated_time: '2024-02-24',
  },
  {
    id: 22,
    title: '桑基图',
    description:
      '用来表示数据的流向，主要体现了数据流动的分支，适合展示不同分类间的转移关系。',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:waves',
    color: '#eb2f96',
    views: 620,
    stars: 25,
    status: 1,
    sort: 22,
    created_time: '2024-02-10',
    updated_time: '2024-02-26',
  },
  {
    id: 23,
    title: '气泡图',
    description:
      '一种多变量图表，是散点图的变体，通过气泡的大小展示第三个变量的数据。',
    omics_category: '组学通用',
    func_category: '可视化绘图',
    icon: 'mdi:chart-bubble',
    color: '#a0d911',
    views: 710,
    stars: 29,
    status: 1,
    sort: 23,
    created_time: '2024-02-11',
    updated_time: '2024-02-28',
  },
  {
    id: 24,
    title: '词云图',
    description: '通过文字的大小和颜色来展示文本数据中关键词的频率或重要性。',
    omics_category: '其他',
    func_category: '可视化绘图',
    icon: 'mdi:cloud-outline',
    color: '#f5222d',
    views: 350,
    stars: 12,
    status: 1,
    sort: 24,
    created_time: '2024-02-12',
    updated_time: '2024-02-29',
  },
];

const omicsOptions = ref<string[]>(mockOmicsOptions);
const funcOptions = ref<string[]>(mockFuncOptions);

const fetchTools = async () => {
  loading.value = true;
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = [...mockToolsData];

    // Filter by text
    if (searchText.value) {
      const lower = searchText.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower),
      );
    }

    // Filter by Omics
    if (activeOmics.value !== 'all') {
      filtered = filtered.filter(
        (item) => item.omics_category === activeOmics.value,
      );
    }

    // Filter by Function
    if (activeFunc.value.length > 0) {
      filtered = filtered.filter((item) =>
        activeFunc.value.includes(item.func_category),
      );
    }

    // Sort Logic
    filtered.sort((a: any, b: any) => {
      const field = sortBy.value;
      if (field === 'updated_time') {
        return (b.updated_time || '').localeCompare(a.updated_time || '');
      }
      return b[field] - a[field];
    });

    // Pagination Logic
    total.value = filtered.length;
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    tools.value = filtered.slice(start, end);
  } catch (error) {
    console.error('Failed to fetch tools:', error);
  } finally {
    loading.value = false;
  }
};

// Watch filters and fetch data
watch(
  [searchText, activeOmics, activeFunc, sortBy, currentPage],
  () => {
    fetchTools();
  },
  { deep: true },
);

// Reset page when filters change
const resetPage = () => {
  currentPage.value = 1;
};

// Functions to handle filter changes
const handleOmicsChange = () => {
  resetPage();
};

const handleFuncChange = () => {
  resetPage();
};

// Navigate to tool detail page
const goToDetail = (toolId: number) => {
  router.push(`/analysis/tool/${toolId}`);
};

// Initial fetch
onMounted(() => {
  fetchTools();
});
</script>

<template>
  <Page>
    <!-- Search Bar -->
    <div class="mb-4">
      <Input
        v-model:value="searchText"
        placeholder="搜索关键字"
        size="large"
        class="search-input"
        style="width: 460px"
        allow-clear
        @press-enter="resetPage"
      >
        <template #suffix>
          <Icon
            icon="mdi:magnify"
            class="text-xl text-gray-400"
            style="cursor: pointer"
          />
        </template>
      </Input>
    </div>

    <!-- Filter Card -->
    <div class="bg-card mb-4 rounded-lg p-6">
      <!-- 组学分类 -->
      <div class="filter-row">
        <span class="filter-label">组学分类</span>
        <div class="filter-content">
          <Radio.Group
            v-model:value="activeOmics"
            button-style="solid"
            @change="handleOmicsChange"
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button
              v-for="omics in omicsOptions"
              :key="omics"
              :value="omics"
            >
              {{ omics }}
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <!-- 功能分类 -->
      <div class="filter-row">
        <span class="filter-label">功能分类</span>
        <div class="filter-content">
          <Checkbox.Group v-model:value="activeFunc" @change="handleFuncChange">
            <Checkbox v-for="func in funcOptions" :key="func" :value="func">
              {{ func }}
            </Checkbox>
          </Checkbox.Group>
        </div>
      </div>
    </div>

    <Spin :spinning="loading">
      <!-- 空状态提示 -->
      <Empty
        v-if="!loading && tools.length === 0"
        description="暂无符合条件的工具"
        class="py-12"
      />

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          v-for="tool in tools"
          :key="tool.id"
          class="tool-card cursor-pointer transition-all hover:shadow-lg"
          :bordered="false"
          @click="goToDetail(tool.id)"
        >
          <div class="flex items-start">
            <div class="tool-icon-wrapper mr-3">
              <Icon
                :icon="tool.icon || 'mdi:chart-bar'"
                class="text-3xl"
                :style="{ color: tool.color || '#1890ff' }"
              />
            </div>
            <div class="flex-1 overflow-hidden">
              <h3
                class="mb-1 truncate text-base font-bold text-gray-800 dark:text-gray-100"
              >
                {{ tool.title }}
              </h3>
              <div class="flex flex-wrap gap-1 text-xs text-gray-500">
                <span>{{ tool.omics_category }}</span>
                <span>{{ tool.func_category }}</span>
              </div>
            </div>
          </div>

          <p class="my-4 line-clamp-2 h-10 text-xs text-gray-500">
            {{ tool.description }}
          </p>

          <div class="flex items-center justify-between text-xs text-gray-400">
            <div class="flex gap-3">
              <span class="flex items-center gap-1">
                <Icon icon="mdi:eye-outline" /> {{ tool.views }}
              </span>
              <span class="flex items-center gap-1">
                <Icon icon="mdi:star-outline" /> {{ tool.stars }}
              </span>
            </div>
            <span class="font-medium text-blue-600">限时免费</span>
          </div>
        </Card>
      </div>
    </Spin>

    <div class="mt-6 flex justify-end">
      <Pagination
        v-model:current="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :show-total="(total) => `共 ${total} 条`"
        :show-size-changer="false"
      />
    </div>
  </Page>
</template>

<style scoped>
/* Customize Button Styles to match image better */
.filter-btn {
  color: rgb(0 0 0 / 85%);
  background-color: transparent; /* Default bg */
  border-color: #d9d9d9;
  border-radius: 2px;
  box-shadow: none;
}

.dark .filter-btn {
  color: rgb(255 255 255 / 85%);
  border-color: #424242;
}

/* Ensure non-primary buttons look like the image (white bg, gray border) */
.filter-btn:not(.ant-btn-primary) {
  background-color: #fff;
}

.dark .filter-btn:not(.ant-btn-primary) {
  background-color: transparent;
}

/* ... existing styles ... */
.filter-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 16px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  flex-shrink: 0;
  width: 80px;

  /* Removed margin-top to rely on baseline alignment or flex-start centering */
  font-weight: 600;
  color: var(--text-color);
}

.filter-content {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-card {
  border: 1px solid var(--border-color);
}

.tool-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.dark .tool-icon-wrapper {
  background-color: #303030;
}
</style>
