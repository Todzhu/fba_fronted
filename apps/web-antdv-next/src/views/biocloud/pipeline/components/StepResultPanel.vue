<script setup lang="ts">
import type { StepConfig } from '../types/pipeline';

import { computed } from 'vue';

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Maximize2,
  TerminalSquare,
} from 'lucide-vue-next';

const props = defineProps<{
  getChartUrl: (path: string) => string;
  logs: string[];
  selectedChartUrl?: string;
  step: StepConfig;
  stepLabel: string;
}>();

const emit = defineEmits<{
  openLogs: [];
  openPreview: [url: string];
}>();

const STAT_LABELS: Record<string, string> = {
  cells_after_filter: '过滤后细胞',
  cells_before_filter: '原始细胞',
  clusters: 'Cluster 数',
  genes: '基因数',
  samples: '样本数',
  total_cells: '细胞数',
};

const charts = computed(() => props.step.result?.charts || []);
const tables = computed(() => props.step.result?.tables || []);
const recentLogs = computed(() => props.logs.slice(-5));

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

const formatStatValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return String(value);
};

const openLogs = () => {
  emit('openLogs');
};

const openPreview = (path: string) => {
  emit('openPreview', props.getChartUrl(path));
};
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div class="border-b border-slate-100 px-5 py-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900">结果预览</h3>
          <p class="mt-0.5 text-sm text-slate-500">{{ stepLabel }}</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          @click="openLogs"
        >
          <TerminalSquare class="h-4 w-4" />
          查看日志
        </button>
      </div>
    </div>

    <div class="p-5">
      <div
        v-if="step.status === 'pending'"
        class="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center"
      >
        <Clock3 class="mb-3 h-8 w-8 text-slate-300" />
        <p class="text-sm font-semibold text-slate-700">等待运行</p>
        <p class="mt-1 text-sm text-slate-500">配置参数后即可开始当前步骤。</p>
      </div>

      <div
        v-else-if="step.status === 'running'"
        class="flex min-h-40 flex-col items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-center"
      >
        <Loader2 class="mb-3 h-8 w-8 animate-spin text-blue-600" />
        <p class="text-sm font-semibold text-blue-900">正在运行</p>
        <p class="mt-1 text-sm text-blue-700">页面会持续刷新状态和日志。</p>
      </div>

      <div
        v-else-if="step.status === 'error'"
        class="flex min-h-40 flex-col items-center justify-center rounded-lg border border-red-100 bg-red-50 text-center"
      >
        <AlertCircle class="mb-3 h-8 w-8 text-red-500" />
        <p class="text-sm font-semibold text-red-900">运行失败</p>
        <p class="mt-1 text-sm text-red-700">请打开日志查看失败原因后重试。</p>
      </div>

      <div v-else-if="step.status === 'completed'" class="space-y-5">
        <div class="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 class="h-4 w-4" />
          当前步骤已完成
        </div>

        <div
          v-if="step.result?.stats && getSortedStats(step.result.stats).length > 0"
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <div
            v-for="item in getSortedStats(step.result.stats)"
            :key="item.key"
            class="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <p class="text-xs font-medium text-slate-500">
              {{ STAT_LABELS[item.key] || item.key }}
            </p>
            <p class="mt-1 text-lg font-bold text-slate-900">
              {{ formatStatValue(item.value) }}
            </p>
          </div>
        </div>

        <div v-if="charts.length > 0" class="space-y-3">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <BarChart3 class="h-4 w-4 text-teal-600" />
            图表
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="chart in charts.slice(0, 4)"
              :key="chart"
              type="button"
              class="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-left transition-shadow hover:shadow-md"
              @click="openPreview(chart)"
            >
              <img
                :src="getChartUrl(chart)"
                :alt="chart.split('/').pop() || '分析图表'"
                class="aspect-video w-full rounded-md object-contain"
                loading="lazy"
              />
              <span class="mt-2 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                <span class="truncate">{{ chart.split('/').pop() }}</span>
                <Maximize2 class="h-3.5 w-3.5 text-slate-400" />
              </span>
            </button>
          </div>
        </div>

        <div v-if="tables.length > 0" class="space-y-3">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FileText class="h-4 w-4 text-blue-600" />
            数据表
          </div>
          <div class="space-y-2">
            <a
              v-for="table in tables.slice(0, 4)"
              :key="table"
              :href="getChartUrl(table)"
              target="_blank"
              rel="noreferrer"
              class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50"
            >
              <span class="truncate">{{ table.split('/').pop() }}</span>
              <FileText class="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>

        <div
          v-if="charts.length === 0 && tables.length === 0 && (!step.result?.stats || getSortedStats(step.result.stats).length === 0)"
          class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
        >
          当前步骤没有可预览的图表或表格。
        </div>
      </div>

      <div v-if="recentLogs.length > 0" class="mt-5 rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100">
        <div v-for="(line, idx) in recentLogs" :key="idx" class="truncate">
          {{ line }}
        </div>
      </div>
    </div>
  </section>
</template>
