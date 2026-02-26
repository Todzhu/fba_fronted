<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const toolId = route.params.id;
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center p-20">
    <h1 class="text-2xl font-bold text-slate-900">
      包含工具详情 ID: {{ toolId }}
    </h1>
    <p class="mt-4 text-slate-500">此页面正在开发中...</p>
  </div>
</template>
