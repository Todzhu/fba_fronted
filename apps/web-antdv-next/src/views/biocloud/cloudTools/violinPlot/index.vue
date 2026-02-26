<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { Button } from 'ant-design-vue';
import { BookOpen, Eye } from 'lucide-vue-next';

import ChartPreview from './components/ChartPreview.vue';
import ConfigPanel from './components/ConfigPanel.vue';
import DataStatistics from './components/DataStatistics.vue';

defineOptions({ name: 'ViolinPlotAnalyzer' });
</script>

<template>
  <Page
    title="小提琴图分析工具"
    description="Violin Plot Analyzer"
    content-class="flex flex-col h-full gap-4"
  >
    <template #extra>
      <div class="flex items-center gap-2">
        <Button class="flex items-center gap-1">
          <template #icon><BookOpen class="size-4" /></template>
          使用指南
        </Button>
        <Button type="primary" class="flex items-center gap-1 bg-[#1677ff]">
          <template #icon><Eye class="size-4" /></template>
          结果预览
        </Button>
      </div>
    </template>

    <div class="flex h-full flex-col gap-4 lg:flex-row">
      <!-- Left Panel: Preview & Stats -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <ChartPreview class="min-h-[500px] flex-grow" />
        <DataStatistics class="h-auto shrink-0" />
      </div>

      <!-- Right Panel: Configuration -->
      <div class="w-full shrink-0 lg:w-[420px]">
        <ConfigPanel class="h-full" />
      </div>
    </div>
  </Page>
</template>

<style scoped>
:deep(.vben-page-content) {
  @apply bg-[#f8f9fa] p-4;
}
</style>
