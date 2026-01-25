<script lang="ts" setup>
import type { AnalysisTool } from '#/api/analysis-tools';

import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Checkbox,
  Empty,
  Input,
  Pagination,
  Radio,
  Spin,
} from 'ant-design-vue';

import {
  getAnalysisToolCategories,
  getAnalysisToolList,
} from '#/api/analysis-tools';

const router = useRouter();

// 获取 API 基础 URL
const apiBaseUrl = import.meta.env.VITE_GLOB_API_URL || '';

// 获取完整图片 URL（处理相对路径）
const getFullImageUrl = (url: null | string | undefined) => {
  if (!url) return '';
  // 如果已经是完整 URL 或者是图标标识，直接返回
  if (url.startsWith('http') || !url.includes('/')) {
    return url;
  }
  // 拼接 API 基础 URL
  return `${apiBaseUrl}${url}`;
};

// 分类颜色映射
const categoryColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  // 组学分类颜色
  转录组学: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
  蛋白组学: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  代谢组学: { bg: '#fce7f3', border: '#ec4899', text: '#be185d' },
  基因组学: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
  // 功能分类颜色
  可视化: { bg: '#d1fae5', border: '#10b981', text: '#047857' },
  富集分析: { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
  数据预处理: { bg: '#fed7aa', border: '#f97316', text: '#c2410c' },
  差异分析: { bg: '#fecaca', border: '#ef4444', text: '#b91c1c' },
  网络分析: { bg: '#a5f3fc', border: '#06b6d4', text: '#0e7490' },
  降维分析: { bg: '#bbf7d0', border: '#22c55e', text: '#15803d' },
};

// 获取分类颜色样式
const getCategoryStyle = (category: string) => {
  const color = categoryColors[category] || {
    bg: '#f3f4f6',
    border: '#9ca3af',
    text: '#4b5563',
  };
  return {
    backgroundColor: color.bg,
    borderColor: color.border,
    color: color.text,
  };
};

const searchText = ref('');
const activeOmics = ref('all');
const activeFunc = ref<string[]>([]);
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const tools = ref<AnalysisTool[]>([]);
const loading = ref(false);

const omicsOptions = ref<string[]>([]);
const funcOptions = ref<string[]>([]);

// Fetch categories on mount
const fetchCategories = async () => {
  try {
    const res = await getAnalysisToolCategories();
    omicsOptions.value = res.omics;
    funcOptions.value = res.func;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const fetchTools = async () => {
  loading.value = true;
  try {
    const res = await getAnalysisToolList({
      page: currentPage.value,
      size: pageSize.value,
      search: searchText.value || undefined,
      omics: activeOmics.value === 'all' ? undefined : activeOmics.value,
      func: activeFunc.value.length > 0 ? activeFunc.value : undefined,
    });

    tools.value = res.items;
    total.value = res.total;
  } catch (error) {
    console.error('Failed to fetch tools:', error);
  } finally {
    loading.value = false;
  }
};

// Watch filters and fetch data
watch(
  [searchText, activeOmics, activeFunc, currentPage],
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
  fetchCategories();
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

      <div
        v-else
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="tool in tools"
          :key="tool.id"
          class="tool-card group cursor-pointer"
          @click="goToDetail(tool.id)"
        >
          <!-- 左侧预览图区域 -->
          <div class="tool-preview">
            <img
              v-if="tool.icon && tool.icon.includes('/')"
              :src="getFullImageUrl(tool.icon)"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              alt="预览图"
            />
            <div v-else class="tool-preview-fallback">
              <Icon
                :icon="tool.icon || 'mdi:chart-bar'"
                class="text-5xl"
                :style="{ color: tool.color || '#3b82f6' }"
              />
            </div>
          </div>

          <!-- 右侧内容区域 -->
          <div class="tool-content">
            <!-- 工具名称 -->
            <h3 class="tool-title">{{ tool.title }}</h3>

            <!-- 分类标签 -->
            <div class="tool-tags">
              <span
                class="tool-tag"
                :style="getCategoryStyle(tool.omics_category)"
              >
                {{ tool.omics_category }}
              </span>
              <span
                v-if="tool.func_category"
                class="tool-tag"
                :style="getCategoryStyle(tool.func_category)"
              >
                {{ tool.func_category }}
              </span>
            </div>

            <!-- 描述 -->
            <p class="tool-description">
              {{ tool.description }}
            </p>

            <!-- 底部统计 -->
            <div class="tool-footer">
              <div class="tool-stats">
                <span class="tool-stat">
                  <Icon icon="mdi:eye-outline" class="text-sm" />
                  <span>{{ tool.views }} 浏览</span>
                </span>
                <span class="tool-stat">
                  <Icon icon="mdi:star-outline" class="text-sm" />
                  <span>{{ tool.stars }} 收藏</span>
                </span>
              </div>
            </div>
          </div>
        </div>
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
/* 筛选区域样式 */
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
  font-weight: 600;
  color: var(--text-color);
}

.filter-content {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
}

/* 工具卡片 - 水平布局 */
.tool-card {
  display: flex;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition: all 0.3s ease;
}

.tool-card:hover {
  border-color: #3b82f6;
  box-shadow:
    0 10px 25px -5px rgb(59 130 246 / 15%),
    0 8px 10px -6px rgb(59 130 246 / 10%);
  transform: translateY(-2px);
}

.dark .tool-card {
  background: #1f2937;
  border-color: #374151;
}

.dark .tool-card:hover {
  border-color: #60a5fa;
  box-shadow:
    0 10px 25px -5px rgb(96 165 250 / 20%),
    0 8px 10px -6px rgb(96 165 250 / 15%);
}

/* 左侧预览图区域 */
.tool-preview {
  position: relative;
  flex-shrink: 0;
  width: 140px;
  min-height: 140px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.dark .tool-preview {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
}

.tool-preview-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 右侧内容区域 */
.tool-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 20px;
}

/* 标题 */
.tool-title {
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
  white-space: nowrap;
}

.dark .tool-title {
  color: #f3f4f6;
}

/* 分类标签 - 边框样式 */
.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tool-tag {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
  border-radius: 2px;
}

.tool-tag-primary {
  color: #2563eb;
  background: #eff6ff;
  border-color: #3b82f6;
}

.tool-tag-secondary {
  color: #059669;
  background: #ecfdf5;
  border-color: #10b981;
}

.dark .tool-tag-primary {
  color: #93c5fd;
  background: rgb(59 130 246 / 15%);
  border-color: #60a5fa;
}

.dark .tool-tag-secondary {
  color: #6ee7b7;
  background: rgb(16 185 129 / 15%);
  border-color: #34d399;
}

/* 描述 */
.tool-description {
  display: -webkit-box;
  height: 40px;
  margin-bottom: 12px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
  -webkit-box-orient: vertical;
}

.dark .tool-description {
  color: #9ca3af;
}

/* 底部统计 */
.tool-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.dark .tool-footer {
  border-top-color: #374151;
}

.tool-stats {
  display: flex;
  gap: 12px;
}

.tool-stat {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #9ca3af;
}

.dark .tool-stat {
  color: #6b7280;
}

/* 限时免费按钮 - 更饱满 */
.tool-badge {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 20px;
  transition: all 0.2s;
}

.tool-badge:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: scale(1.02);
}
</style>
