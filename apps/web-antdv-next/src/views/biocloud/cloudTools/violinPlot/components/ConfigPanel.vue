<script setup lang="ts">
import { ref } from 'vue';

import {
  Button,
  Card,
  Input,
  Table,
  TabPane,
  Tabs,
  Upload,
} from 'ant-design-vue';
import {
  ArrowRight,
  Download,
  FileText,
  Settings,
  Sparkles,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-vue-next';

const activeTab = ref('data');

// Mock Data for Preview Table
const columns = [
  { title: '#', dataIndex: 'index', width: 50 },
  { title: 'value', dataIndex: 'value' },
  { title: 'group', dataIndex: 'group' },
  { title: 'facet', dataIndex: 'facet' },
];

const data = [
  { index: 1, value: 12.102_277_9, group: 'AML', facet: 'High' },
  { index: 2, value: 12.613_817_8, group: 'AML', facet: 'Mid' },
  { index: 3, value: 12.527_407_9, group: 'AML', facet: 'Low' },
  { index: 4, value: 12.679_903_5, group: 'AML', facet: 'High' },
  { index: 5, value: 12.648_365_9, group: 'AML', facet: 'Mid' },
  { index: 6, value: 12.121_463_03, group: 'AML', facet: 'Low' },
  { index: 7, value: 12.827_030_57, group: 'AML', facet: 'High' },
  { index: 8, value: 12.494_237_63, group: 'AML', facet: 'Mid' },
];
</script>

<template>
  <div class="relative flex h-full flex-col gap-4">
    <Card
      class="flex flex-grow flex-col rounded-xl border-none shadow-sm"
      :body-style="{ height: '100%', padding: '0' }"
    >
      <Tabs v-model:active-key="activeTab" class="custom-tabs h-full">
        <!-- DATA TAB -->
        <TabPane key="data">
          <template #tab>
            <span class="flex items-center gap-2 px-2">
              <FileText class="size-4" />
              数据文件
            </span>
          </template>

          <div class="flex h-full flex-col gap-6 overflow-y-auto p-4">
            <!-- Actions -->
            <div class="flex gap-2">
              <Button
                type="primary"
                size="small"
                class="flex items-center gap-1 bg-[#1677ff]"
              >
                <template #icon><Sparkles class="size-3" /></template>
                加载示例
              </Button>
              <Button size="small" class="flex items-center gap-1">
                <template #icon><Download class="size-3" /></template>
                下载模板
              </Button>
            </div>

            <!-- File Upload -->
            <div>
              <div class="mb-2 text-sm font-medium text-gray-700">
                数据表 (支持 txt/csv)
              </div>
              <div class="flex gap-2">
                <Input value="data.txt" readonly class="flex-grow bg-gray-50" />
                <Upload :show-upload-list="false">
                  <Button
                    type="primary"
                    class="flex items-center gap-1 bg-[#1677ff]"
                  >
                    <template #icon><UploadIcon class="size-3" /></template>
                    导入
                  </Button>
                </Upload>
                <Button class="flex items-center gap-1">
                  <template #icon><Trash2 class="size-3" /></template>
                  清空
                </Button>
              </div>
            </div>

            <!-- Data Preview -->
            <div class="flex min-h-0 flex-grow flex-col">
              <div class="mb-2 flex items-center justify-between">
                <div class="text-sm font-medium text-gray-700">数据预览</div>
                <div class="text-xs text-gray-500">共 27 行数据</div>
              </div>

              <div class="relative flex-grow overflow-hidden rounded-md border">
                <div class="absolute inset-0 overflow-auto">
                  <Table
                    :columns="columns"
                    :data-source="data"
                    size="small"
                    :pagination="false"
                    :scroll="{ y: 300 }"
                  />
                </div>
              </div>
            </div>

            <!-- Info Box -->
            <div
              class="flex items-start gap-2 rounded-md border border-[#d6e4ff] bg-[#f0f5ff] p-3 text-xs text-gray-600"
            >
              <Info class="mt-0.5 size-4 shrink-0 text-[#2f54eb]" />
              <div class="leading-relaxed">
                数据格式：第一列为数值(value)，第二列为分组(group)，第三列为分面(facet)。支持
                Tab 或逗号分隔。
              </div>
            </div>
          </div>
        </TabPane>

        <!-- SETTINGS TAB -->
        <TabPane key="settings">
          <template #tab>
            <span class="flex items-center gap-2 px-2">
              <Settings class="size-4" />
              参数设置
            </span>
          </template>
          <div class="p-6 text-center text-gray-400">参数设置面板 (开发中)</div>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Next Step Button -->
    <div class="flex justify-end">
      <Button
        type="primary"
        size="large"
        class="flex items-center gap-2 rounded-lg bg-[#1677ff] px-6 shadow-lg shadow-blue-200"
      >
        下一步
        <ArrowRight class="size-4" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
:deep(.ant-tabs-nav) {
  @apply mb-0 border-b border-gray-100 px-4 pt-2;
}

:deep(.ant-tabs-tab) {
  @apply px-4 py-3 text-gray-500 transition-colors;
}

:deep(.ant-tabs-tab-active) {
  @apply font-medium text-[#1677ff];
}

:deep(.ant-tabs-ink-bar) {
  @apply bg-[#1677ff];
}

:deep(.ant-table-thead > tr > th) {
  @apply bg-gray-50 text-xs font-medium text-gray-600;
}

:deep(.ant-table-tbody > tr > td) {
  @apply text-xs text-gray-600;
}
</style>
