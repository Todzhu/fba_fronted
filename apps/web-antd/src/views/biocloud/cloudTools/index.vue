<script setup lang="ts">
import { computed, ref } from 'vue';

import FilterBar from './components/FilterBar.vue';
import ToolCard from './components/ToolCard.vue';

// Mock Data
const allTools = [
  {
    id: '1',
    name: 'GO富集柱状图',
    description:
      '柱形图还可以使用不同的颜色表示不同的GO分类，例如生物学过程、细胞组分和分子功能。',
    category: '组学通用',
    tags: ['富集分析', '可视化绘图'],
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop', // Data viz placeholder
    views: 605,
    stars: 1,
    isFree: true,
    updateTime: '2025-12-01',
    price: 0,
  },
  {
    id: '2',
    name: '蛋白亚细胞定位',
    description:
      '亚细胞定位是指某种蛋白或表达产物在细胞内的具体存在部位。真核细胞主要的亚细胞定位...',
    category: '蛋白组学',
    tags: ['亚细胞定位', '可视化绘图'],
    imageUrl:
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=800&auto=format&fit=crop', // Cell placeholder
    views: 529,
    stars: 4,
    isFree: true,
    updateTime: '2025-11-20',
    price: 0,
  },
  {
    id: '3',
    name: '火山图',
    description:
      '火山图 (Volcano Plot) 是一类用来展示组间差异数据的图像。可以方便直观的展示两组样本...',
    category: '组学通用',
    tags: ['可视化绘图', '差异可视化的'],
    imageUrl:
      'https://images.unsplash.com/photo-1558494949-efafd32ea770?q=80&w=800&auto=format&fit=crop', // Scatter plot lookalike
    views: 1279,
    stars: 0,
    isFree: true,
    updateTime: '2026-01-15',
    price: 0,
  },
  {
    id: '4',
    name: '小提琴图',
    description: '分析的单细胞转录组数据，绘制指定基因的表达量小提琴图。',
    category: '单细胞转录组',
    tags: ['h5ad相关', '可视化绘图'],
    imageUrl:
      'https://images.unsplash.com/photo-1543286386-713df548e9cc?q=80&w=800&auto=format&fit=crop', // Abstract shape
    views: 2412,
    stars: 0,
    isFree: true,
    updateTime: '2026-01-20',
    price: 0,
  },
  {
    id: '5',
    name: 'VENN分析',
    description:
      '韦恩 (Venn) 图是用于展示不同的元素集合的重叠区域的图示。在生物信息总分析中，常用...',
    category: '组学通用',
    tags: ['统计分析'],
    imageUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop', // Circles
    views: 849,
    stars: 0,
    isFree: true,
    updateTime: '2025-10-10',
    price: 0,
  },
  {
    id: '6',
    name: '(堆叠) 柱形图',
    description:
      '堆叠柱形图是一种用于可视化多个类别之间的组成关系的图表。它将不同类别的数据以柱...',
    category: '组学通用',
    tags: ['可视化绘图'],
    imageUrl:
      'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800&auto=format&fit=crop', // Charts
    views: 197,
    stars: 0,
    isFree: true,
    updateTime: '2025-12-15',
    price: 0,
  },
  {
    id: '7',
    name: 'Significance A分析',
    description:
      '一般应用于组学数据中，重复性实验（即组内包含的样本数量）不满足3次的情况下，比较...',
    category: '组学通用',
    tags: ['统计分析'],
    imageUrl:
      'https://images.unsplash.com/photo-1624969862293-b749659ccc4e?q=80&w=800&auto=format&fit=crop', // Math curve
    views: 196,
    stars: 3,
    isFree: true,
    updateTime: '2025-09-01',
    price: 0,
  },
  {
    id: '8',
    name: '散点图拟合',
    description:
      '使用一系列的散点展示变量在直角坐标系中的分布，并通过线性拟合来呈现它们的趋势。',
    category: '组学通用',
    tags: ['统计分析', '可视化绘图'],
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    views: 267,
    stars: 1,
    isFree: true,
    updateTime: '2026-01-05',
    price: 0,
  },
];

// Reactive State
const keyword = ref('');
const currentCategory = ref('all');
const currentFunctions = ref<string[]>([]);
const currentSort = ref('update');

// Computed Filtered Tools
const filteredTools = computed(() => {
  let result = [...allTools];

  // 1. Keyword search
  if (keyword.value) {
    const k = keyword.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(k) ||
        t.description.toLowerCase().includes(k),
    );
  }

  // 2. Category filter
  if (currentCategory.value !== 'all') {
    // Note: In real app, IDs should match specific logic. Here we match by text loosely for mock
    const map: Record<string, string> = {
      common: '组学通用',
      scrna: '单细胞转录组',
      proteomics: '蛋白组学',
      other: '其他',
    };
    const target = map[currentCategory.value];
    if (target) {
      result = result.filter((t) => t.category === target);
    }
  }

  // 3. Function/Tags filter
  // Note: Mock logic - if any function tag matches
  // In real app, we need mapping from English IDs to Chinese Tags
  const tagMap: Record<string, string> = {
    visualization: '可视化绘图',
    stats: '统计分析',
    enrichment: '富集分析',
    h5ad: 'h5ad相关',
    'diff-viz': '差异可视化',
    subcell: '亚细胞定位',
  };

  if (currentFunctions.value.length > 0) {
    result = result.filter((t) => {
      // Check if tool matches ANY of the selected function tags
      const toolTags = t.tags;
      return currentFunctions.value.some((funcId) => {
        const tagName = tagMap[funcId];
        return tagName && toolTags.includes(tagName);
      });
    });
  }

  // 4. Sort
  result.sort((a, b) => {
    switch (currentSort.value) {
      case 'fav': {
        // 'stars'
        return b.stars - a.stars;
      }
      case 'hot':
      case 'views': {
        // 'hot' in FilterBar maps to 'views' logic
        return b.views - a.views;
      }
      case 'price': {
        return a.price - b.price;
      }
      case 'update': {
        return (
          new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
        );
      }
      default: {
        return 0;
      }
    }
  });

  return result;
});

// Handlers
function onSearch(q: string) {
  keyword.value = q;
}

function onFilter({
  category,
  functions,
}: {
  category: string;
  functions: string[];
}) {
  currentCategory.value = category;
  currentFunctions.value = functions;
}

function onSort(sortBy: string) {
  currentSort.value = sortBy;
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
    <div class="mx-auto max-w-7xl">
      <!-- Filter Bar -->
      <FilterBar @search="onSearch" @filter="onFilter" @sort="onSort" />

      <!-- Tool Grid -->
      <div
        v-if="filteredTools.length > 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <ToolCard v-for="tool in filteredTools" :key="tool.id" v-bind="tool" />
      </div>

      <!-- Empty State -->
      <div v-else class="py-20 text-center">
        <div class="mb-4 text-4xl">🔍</div>
        <h3 class="text-lg font-medium text-slate-900 dark:text-white">
          没有找到相关工具
        </h3>
        <p class="text-slate-500">试试其他关键词或筛选条件</p>
      </div>

      <!-- Pagination (Mock) -->
      <div v-if="filteredTools.length > 0" class="mt-12 flex justify-center">
        <button
          class="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          加载更多...
        </button>
      </div>
    </div>
  </div>
</template>
