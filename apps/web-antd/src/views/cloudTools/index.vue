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

import {
  getAnalysisToolCategories,
  getAnalysisToolList,
} from '#/api/analysis-tools';

const router = useRouter();

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
      omics: activeOmics.value !== 'all' ? activeOmics.value : undefined,
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
