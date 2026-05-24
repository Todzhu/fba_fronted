<script setup lang="ts">
import type { StepConfig } from '../types/pipeline';

import { computed, ref, watch } from 'vue';

import {
  AlertCircle,
  Clock3,
  FileText,
  Loader2,
  Maximize2,
  X,
} from 'lucide-vue-next';

const props = defineProps<{
  getChartUrl: (path: string) => string;
  step: StepConfig;
  stepLabel: string;
}>();

const emit = defineEmits<{
  openPreview: [url: string];
}>();

const getFileName = (path: string) => {
  return path.split(/[\\/]/).pop() || path;
};

const getUniqueResultFilesByName = (files: string[]) => {
  const seen = new Set<string>();

  return files.filter((file) => {
    const fileName = getFileName(file).toLowerCase();

    if (seen.has(fileName)) return false;

    seen.add(fileName);
    return true;
  });
};

const charts = computed(() => props.step.result?.charts || []);
const rawTables = computed(() => props.step.result?.tables || []);
const tables = computed(() => getUniqueResultFilesByName(rawTables.value));
const chartLoadErrors = ref<Record<string, boolean>>({});
const showAllCharts = ref(false);
const showAllTables = ref(false);
const activeResultKind = ref<'charts' | 'tables'>('charts');
const selectedChartIndex = ref(0);
const selectedTableIndex = ref(0);

const selectedChart = computed(() => charts.value[selectedChartIndex.value] || '');
const selectedTable = computed(() => tables.value[selectedTableIndex.value] || '');

const isTallChart = (path: string) => {
  const fileName = getFileName(path).toLowerCase();

  return fileName.includes('violin');
};

const getChartFrameClass = (path: string) =>
  isTallChart(path)
    ? 'min-h-[300px] overflow-x-auto overflow-y-hidden'
    : 'overflow-hidden';

const getDrawerChartCardClass = (path: string) =>
  isTallChart(path) ? 'md:col-span-2' : '';

const getChartImageClass = (path: string) =>
  isTallChart(path)
    ? 'block h-[320px] max-w-none object-contain'
    : 'block h-auto max-h-[62vh] w-full object-contain';

const getDrawerChartImageClass = (path: string) =>
  isTallChart(path)
    ? 'block h-auto w-full object-contain'
    : 'block h-auto max-h-[360px] w-full object-contain';

const setActiveResultKind = (kind: 'charts' | 'tables') => {
  if (kind === 'charts' && charts.value.length === 0) return;
  if (kind === 'tables' && tables.value.length === 0) return;
  activeResultKind.value = kind;
};

const selectChart = (event: Event) => {
  selectedChartIndex.value = Number((event.target as HTMLSelectElement).value) || 0;
};

const selectTable = (event: Event) => {
  selectedTableIndex.value = Number((event.target as HTMLSelectElement).value) || 0;
};

const openPreview = (path: string) => {
  emit('openPreview', props.getChartUrl(path));
};

const getPreferredChartIndex = () => {
  if (props.step.stepType === 'dim_cluster') {
    const preferredIndex = charts.value.findIndex((chart) =>
      getFileName(chart).toLowerCase().includes('umap_cluster'),
    );

    return preferredIndex >= 0 ? preferredIndex : 0;
  }

  if (props.step.stepType === 'annotation') {
    const preferredIndex = charts.value.findIndex((chart) =>
      getFileName(chart).toLowerCase().includes('umap_dimplot_celltype'),
    );

    return preferredIndex >= 0 ? preferredIndex : 0;
  }

  return 0;
};

const markChartError = (path: string) => {
  chartLoadErrors.value[path] = true;
};

watch(
  () => [props.step.stepType, charts.value.join('|'), tables.value.join('|')] as const,
  () => {
    chartLoadErrors.value = {};
    showAllCharts.value = false;
    showAllTables.value = false;
    selectedChartIndex.value = getPreferredChartIndex();
    selectedTableIndex.value = 0;
    activeResultKind.value = charts.value.length > 0 ? 'charts' : 'tables';
  },
  { immediate: true },
);
</script>

<template>
  <section class="pipeline-result-preview overflow-hidden rounded-xl border border-slate-200 bg-white xl:max-h-[calc(100vh-180px)]">
    <div class="border-b border-slate-100 px-5 py-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 class="text-base font-bold text-slate-900">结果预览</h3>
        <div
          v-if="step.status === 'completed' && (charts.length > 0 || tables.length > 0)"
          class="result-browser-toolbar flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div class="result-kind-toggle inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              class="h-8 rounded-md px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-300"
              :class="activeResultKind === 'charts' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              :disabled="charts.length === 0"
              @click="setActiveResultKind('charts')"
            >
              图表 {{ charts.length }}
            </button>
            <button
              type="button"
              class="h-8 rounded-md px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-300"
              :class="activeResultKind === 'tables' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              :disabled="tables.length === 0"
              @click="setActiveResultKind('tables')"
            >
              表格 {{ tables.length }}
            </button>
          </div>
          <select
            v-if="activeResultKind === 'charts' && charts.length > 0"
            :value="selectedChartIndex"
            class="result-file-select h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:w-64"
            @change="selectChart"
          >
            <option v-for="(chart, idx) in charts" :key="chart" :value="idx">
              {{ getFileName(chart) }}
            </option>
          </select>
          <select
            v-if="activeResultKind === 'tables' && tables.length > 0"
            :value="selectedTableIndex"
            class="result-file-select h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 sm:w-64"
            @change="selectTable"
          >
            <option v-for="(table, idx) in tables" :key="table" :value="idx">
              {{ getFileName(table) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="max-h-none overflow-y-visible p-5 xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto">
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
        <p class="mt-1 text-sm text-blue-700">页面会持续刷新运行状态。</p>
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
        <div
          v-if="activeResultKind === 'charts' && selectedChart"
          class="space-y-3"
        >
          <button
            :key="selectedChart"
            type="button"
            class="selected-result-preview group relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-left transition-shadow hover:shadow-md"
            @click="openPreview(selectedChart)"
          >
            <div
              class="selected-result-image-frame flex w-full items-center justify-center rounded-md bg-white"
              :class="getChartFrameClass(selectedChart)"
            >
              <img
                v-if="!chartLoadErrors[selectedChart]"
                :src="getChartUrl(selectedChart)"
                :alt="getFileName(selectedChart)"
                :class="getChartImageClass(selectedChart)"
                loading="lazy"
                @error="markChartError(selectedChart)"
              />
              <div
                v-else
                class="flex min-h-64 w-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-slate-500"
              >
                <AlertCircle class="h-6 w-6 text-amber-500" />
                <span class="font-medium text-slate-700">图片加载失败</span>
                <span class="max-w-full truncate text-xs">{{ getFileName(selectedChart) }}</span>
              </div>
            </div>
            <span class="mt-2 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
              <span class="truncate">{{ getFileName(selectedChart) }}</span>
              <Maximize2 class="h-3.5 w-3.5 text-slate-400" />
            </span>
          </button>
          <button
            v-if="charts.length > 1"
            type="button"
            class="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            @click="showAllCharts = true"
          >
            查看全部图表（{{ charts.length }}）
          </button>
        </div>

        <div
          v-else-if="activeResultKind === 'tables' && selectedTable"
          class="space-y-3"
        >
          <a
            :href="getChartUrl(selectedTable)"
            target="_blank"
            rel="noreferrer"
            class="selected-result-preview flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 text-blue-700 transition-colors hover:bg-blue-50"
          >
            <span class="flex min-w-0 items-center gap-3">
              <FileText class="h-5 w-5 shrink-0" />
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold">{{ getFileName(selectedTable) }}</span>
                <span class="mt-0.5 block text-xs text-slate-500">点击打开表格文件</span>
              </span>
            </span>
            <Maximize2 class="h-4 w-4 shrink-0 text-slate-400" />
          </a>
          <button
            v-if="tables.length > 1"
            type="button"
            class="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            @click="showAllTables = true"
          >
            查看全部表格（{{ tables.length }}）
          </button>
        </div>

        <div v-else-if="charts.length > 0 || tables.length > 0" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          <button
            v-if="charts.length > 0"
            type="button"
            class="font-medium text-blue-600 hover:text-blue-700"
            @click="setActiveResultKind('charts')"
          >
            查看图表
          </button>
          <button
            v-else
            type="button"
            class="font-medium text-blue-600 hover:text-blue-700"
            @click="setActiveResultKind('tables')"
          >
            查看表格
          </button>
        </div>

        <div
          v-if="charts.length === 0 && tables.length === 0"
          class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
        >
          当前步骤没有可预览的图表或表格。
        </div>
      </div>

    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="showAllCharts"
      class="fixed inset-0 z-[1000] flex justify-end bg-slate-900/30"
      @click.self="showAllCharts = false"
    >
      <aside class="h-full w-full max-w-5xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">全部图表</h3>
            <p class="text-sm text-slate-500">{{ stepLabel }} · {{ charts.length }} 张</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            @click="showAllCharts = false"
          >
            <X class="h-4 w-4" />
            关闭
          </button>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <button
            v-for="chart in charts"
            :key="chart"
            type="button"
            class="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-left transition-shadow hover:shadow-md"
            :class="getDrawerChartCardClass(chart)"
            @click="openPreview(chart)"
          >
            <div
              class="result-drawer-image-frame flex w-full items-center justify-center overflow-hidden rounded-md bg-white"
            >
              <img
                v-if="!chartLoadErrors[chart]"
                :src="getChartUrl(chart)"
                :alt="getFileName(chart)"
                :class="getDrawerChartImageClass(chart)"
                loading="lazy"
                @error="markChartError(chart)"
              />
              <div
                v-else
                class="flex min-h-44 w-full flex-col items-center justify-center gap-2 px-3 text-center text-sm text-slate-500"
              >
                <AlertCircle class="h-6 w-6 text-amber-500" />
                <span class="font-medium text-slate-700">图片加载失败</span>
                <span class="max-w-full truncate text-xs">{{ getFileName(chart) }}</span>
              </div>
            </div>
            <span class="mt-2 block truncate text-xs font-medium text-slate-600">
              {{ getFileName(chart) }}
            </span>
          </button>
        </div>
      </aside>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="showAllTables"
      class="fixed inset-0 z-[1000] flex justify-end bg-slate-900/30"
      @click.self="showAllTables = false"
    >
      <aside class="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900">全部表格</h3>
            <p class="text-sm text-slate-500">{{ stepLabel }} · {{ tables.length }} 个文件</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            @click="showAllTables = false"
          >
            <X class="h-4 w-4" />
            关闭
          </button>
        </div>
        <div class="space-y-2">
          <a
            v-for="table in tables"
            :key="table"
            :href="getChartUrl(table)"
            target="_blank"
            rel="noreferrer"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50"
          >
            <span class="truncate">{{ getFileName(table) }}</span>
            <FileText class="h-4 w-4 shrink-0" />
          </a>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
