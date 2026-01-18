<script lang="ts" setup>
import type { AnalysisTool } from '#/api/analysis-tools';

import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Pagination,
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
const pageSize = ref(16);
const total = ref(0);
const tools = ref<AnalysisTool[]>([]);
const loading = ref(false);

// Dynamic category options from API
const omicsOptions = ref<string[]>([]);
const funcOptions = ref<string[]>([]);

// Fetch categories from API
const fetchCategories = async () => {
  try {
    const result = await getAnalysisToolCategories();
    omicsOptions.value = result.omics;
    funcOptions.value = result.func;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

// Fetch tools from API
const fetchTools = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      size: pageSize.value,
    };

    if (searchText.value) {
      params.search = searchText.value;
    }

    if (activeOmics.value !== 'all') {
      params.omics = activeOmics.value;
    }

    if (activeFunc.value.length > 0) {
      params.func = activeFunc.value;
    }

    const result = await getAnalysisToolList(params);
    tools.value = result.items;
    total.value = result.total;
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
const handleOmicsChange = (val: string) => {
  activeOmics.value = val;
  resetPage();
};

// Handle func filter change
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
    <div class="bg-card mb-4 rounded-lg p-4">
      <Input.Search
        v-model:value="searchText"
        placeholder="搜索关键字"
        enter-button
        size="large"
        class="max-w-md"
        @search="resetPage"
      />

      <div class="mt-6 space-y-4">
        <div class="flex items-start">
          <span class="mr-4 mt-1 shrink-0 font-bold">组学分类</span>
          <div class="flex flex-wrap gap-2">
            <Button
              :type="activeOmics === 'all' ? 'primary' : 'default'"
              @click="handleOmicsChange('all')"
            >
              全部
            </Button>
            <Button
              v-for="omics in omicsOptions"
              :key="omics"
              :type="activeOmics === omics ? 'primary' : 'default'"
              @click="handleOmicsChange(omics)"
            >
              {{ omics }}
            </Button>
          </div>
        </div>

        <div class="flex items-start">
          <span class="mr-4 mt-1 shrink-0 font-bold">功能分类</span>
          <Checkbox.Group
            v-model:value="activeFunc"
            :options="funcOptions"
            class="flex flex-wrap gap-x-6 gap-y-2"
            @change="handleFuncChange"
          />
        </div>
      </div>
    </div>

    <Spin :spinning="loading">
      <!-- 空状态提示 -->
      <Empty
        v-if="!loading && tools.length === 0"
        :description="
          searchText
            ? `未找到与「${searchText}」相关的工具`
            : '暂无符合条件的工具'
        "
        class="py-12"
      />

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          hoverable
          v-for="tool in tools"
          :key="tool.id"
          class="cursor-pointer"
          @click="goToDetail(tool.id)"
        >
          <div class="mb-4 flex items-start">
            <div class="mr-4 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
              <Icon
                :icon="tool.icon || 'mdi:tools'"
                class="text-3xl"
                :style="{ color: tool.color || '#1890ff' }"
              />
            </div>
            <div>
              <h3 class="mb-1 text-lg font-bold">{{ tool.title }}</h3>
              <p class="text-muted-foreground text-xs">
                {{ tool.omics_category }} {{ tool.func_category }}
              </p>
            </div>
          </div>
          <p class="mb-4 line-clamp-2 h-10 text-sm text-gray-500">
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
            <Icon
              icon="mdi:arrow-right-circle"
              class="text-2xl text-blue-500 transition-colors hover:text-blue-600"
            />
          </div>
        </Card>
      </div>
    </Spin>
    <div class="mt-4 flex justify-end">
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
