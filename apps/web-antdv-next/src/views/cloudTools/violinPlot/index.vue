<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { Button } from 'ant-design-vue';
import { BookOpen, Eye } from 'lucide-vue-next';
import ChartPreview from './components/ChartPreview.vue';
import DataStatistics from './components/DataStatistics.vue';
import ConfigPanel from './components/ConfigPanel.vue';

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

    <div class="flex flex-col lg:flex-row h-full gap-4">
      <!-- Left Panel: Preview & Stats -->
      <div class="flex flex-col flex-1 gap-4 min-w-0">
        <ChartPreview class="flex-grow min-h-[500px]" />
        <DataStatistics class="h-auto shrink-0" />
      </div>

      <!-- Right Panel: Configuration -->
      <div class="w-full lg:w-[420px] shrink-0">
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
