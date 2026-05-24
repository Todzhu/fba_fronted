<script setup lang="ts">
import type { StepConfig } from '../types/pipeline';

import { computed } from 'vue';

import { BarChart3 } from 'lucide-vue-next';

const props = defineProps<{
  step: StepConfig;
}>();

const STAT_LABELS: Record<string, string> = {
  cells_after_filter: '过滤后细胞',
  cells_before_filter: '原始细胞',
  clusters: 'Cluster 数',
  database: '数据库',
  filter_ratio: '过滤比例',
  genes: '基因数',
  genes_after_filter: '过滤后基因',
  median_genes: '中位基因数',
  n_cell_types: '细胞类型数',
  n_clusters: 'Cluster 数',
  n_groups: '分组数',
  n_samples: '样本数',
  organism: '物种',
  samples: '样本数',
  total_cells: '细胞数',
  total_genes: '基因数',
};

const getSimpleStats = (stats: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(stats).filter(([, value]) => {
      return ['number', 'string', 'boolean'].includes(typeof value);
    }),
  );
};

const getSortedStats = (stats: Record<string, unknown>) => {
  return Object.entries(getSimpleStats(stats))
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
};

const sortedStats = computed(() =>
  props.step.result?.stats ? getSortedStats(props.step.result.stats) : [],
);
const visibleStats = computed(() => sortedStats.value.slice(0, 4));
const hiddenStatsCount = computed(() =>
  Math.max(sortedStats.value.length - visibleStats.value.length, 0),
);

const formatStatValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return String(value);
};
</script>

<template>
  <section
    v-if="step.status === 'completed' && visibleStats.length > 0"
    class="pipeline-step-stats-summary overflow-hidden rounded-xl border border-slate-200 bg-white"
  >
    <div class="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <BarChart3 class="h-4 w-4 text-teal-600" />
      <h3 class="text-sm font-bold text-slate-800">结果摘要</h3>
    </div>
    <div class="grid grid-cols-2 gap-2 p-3">
      <div
        v-for="item in visibleStats"
        :key="item.key"
        class="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
      >
        <p class="truncate text-[11px] font-medium text-slate-500">
          {{ STAT_LABELS[item.key] || item.key }}
        </p>
        <p class="mt-0.5 truncate text-base font-bold text-slate-900">
          {{ formatStatValue(item.value) }}
        </p>
      </div>
      <div
        v-if="hiddenStatsCount > 0"
        class="col-span-2 rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500"
      >
        还有 {{ hiddenStatsCount }} 个指标
      </div>
    </div>
  </section>
</template>
