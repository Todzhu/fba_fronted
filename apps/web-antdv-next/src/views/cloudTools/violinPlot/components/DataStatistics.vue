<script setup lang="ts">
import { Card } from 'ant-design-vue';
import { Info } from 'lucide-vue-next';

defineProps<{
  // In a real app, these would be props
}>();
</script>

<template>
  <Card
    class="rounded-xl border-none shadow-sm"
    :body-style="{ padding: '16px' }"
  >
    <div class="mb-4 flex items-center gap-2 font-medium text-gray-700">
      <Info class="size-4" />
      <span>数据统计</span>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div class="rounded-lg bg-gray-50 p-4">
        <div class="mb-1 text-xs text-gray-500">数据点</div>
        <div class="text-xl font-bold text-gray-800">27</div>
      </div>
      <div class="rounded-lg bg-gray-50 p-4">
        <div class="mb-1 text-xs text-gray-500">分组数</div>
        <div class="text-xl font-bold text-gray-800">3</div>
      </div>
      <div class="rounded-lg bg-gray-50 p-4">
        <div class="mb-1 text-xs text-gray-500">分面数</div>
        <div class="text-xl font-bold text-gray-800">3</div>
      </div>
      <div class="rounded-lg bg-gray-50 p-4">
        <div class="mb-1 text-xs text-gray-500">值范围</div>
        <div class="text-xl font-bold text-gray-800">10.4 - 12.8</div>
      </div>
    </div>
  </Card>
</template>
