<script setup lang="ts">
import { Card } from 'ant-design-vue';
import { Info } from 'lucide-vue-next';

defineProps<{
  // In a real app, these would be props
}>();
</script>

<template>
  <Card class="rounded-xl border-none shadow-sm" :body-style="{ padding: '16px' }">
    <div class="flex items-center gap-2 mb-4 text-gray-700 font-medium">
      <Info class="size-4" />
      <span>数据统计</span>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="text-xs text-gray-500 mb-1">数据点</div>
        <div class="text-xl font-bold text-gray-800">27</div>
      </div>
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="text-xs text-gray-500 mb-1">分组数</div>
        <div class="text-xl font-bold text-gray-800">3</div>
      </div>
       <div class="bg-gray-50 rounded-lg p-4">
        <div class="text-xs text-gray-500 mb-1">分面数</div>
        <div class="text-xl font-bold text-gray-800">3</div>
      </div>
       <div class="bg-gray-50 rounded-lg p-4">
        <div class="text-xs text-gray-500 mb-1">值范围</div>
        <div class="text-xl font-bold text-gray-800">10.4 - 12.8</div>
      </div>
    </div>
  </Card>
</template>
