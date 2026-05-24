<script setup lang="ts">
import type { ClusterMarkersTable } from '#/api/pipeline';

import { computed, ref } from 'vue';

import {
  Check,
  Loader2,
  Plus,
  RotateCcw,
  ScatterChart,
  Sparkles,
  Tag,
  Trash2,
  ZoomIn,
} from 'lucide-vue-next';

interface MarkerRow {
  cellType: string;
  markers: string;
}

interface ClusterRow {
  cluster: string;
  cellType: string;
}

type AutoAnnotateResult = Record<
  string,
  {
    candidates?: { cell_type: string; confidence: number; score: number }[];
    cell_type: string;
    confidence: number;
    score: number;
  }
>;

const props = defineProps<{
  autoAnnotateLoading: boolean;
  autoAnnotateResult: AutoAnnotateResult;
  clusterMarkersTable: ClusterMarkersTable;
  clusterRows: ClusterRow[];
  dotplotLoading: boolean;
  dotplotUrl: string;
  getStepChartUrl: (relPath: string, stepType: string) => string;
  markerRows: MarkerRow[];
  running: boolean;
  selectedTissueType: string;
  tissueOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  (event: 'add-marker-row'): void;
  (event: 'apply-auto-annotation', overwrite: boolean): void;
  (event: 'auto-annotate'): void;
  (event: 'generate-dotplot'): void;
  (event: 'load-marker-preset', tissue: string): void;
  (event: 'open-preview', url: string): void;
  (event: 'remove-marker-row', index: number): void;
  (event: 'reset-annotation'): void;
  (event: 'submit'): void;
}>();

const showMarkerEditor = ref(false);
const selectedMarkerCluster = ref('');

const autoResultCount = computed(() => Object.keys(props.autoAnnotateResult).length);
const candidateCellTypes = computed(() =>
  props.markerRows.map((row) => row.cellType.trim()).filter(Boolean),
);
const isLowConfidence = (confidence: number) => confidence > 0 && confidence < 60;

const completedCount = computed(
  () => props.clusterRows.filter((row) => row.cellType?.trim()).length,
);

const markerClusters = computed(() => {
  const clusters = props.clusterMarkersTable.rows
    .map((row) => String(row.cluster ?? ''))
    .filter(Boolean);
  return [...new Set(clusters)].sort((a, b) => {
    const left = Number(a);
    const right = Number(b);
    if (!Number.isNaN(left) && !Number.isNaN(right)) return left - right;
    return a.localeCompare(b);
  });
});

const filteredMarkerRows = computed(() => {
  if (!selectedMarkerCluster.value) return props.clusterMarkersTable.rows;
  return props.clusterMarkersTable.rows.filter(
    (row) => String(row.cluster ?? '') === selectedMarkerCluster.value,
  );
});

const formatNumber = (value: null | number | undefined) => {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
  return Number(value).toFixed(3).replace(/\.?0+$/, '');
};

const previewDotplot = () => {
  if (!props.dotplotUrl) return;
  emit('open-preview', props.getStepChartUrl(props.dotplotUrl, 'annotation'));
};
</script>

<template>
  <div class="annotation-workbench grid min-w-0 overflow-hidden rounded-b-xl rounded-t-none border border-slate-200 bg-white xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.95fr)]">
    <section class="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div class="flex items-center gap-2">
          <ScatterChart class="h-5 w-5 text-blue-500" />
          <h3 class="text-base font-bold text-slate-800">注释证据</h3>
        </div>
        <select
          :value="selectedTissueType"
          class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          @change="emit('load-marker-preset', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in tissueOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="space-y-5 px-6 py-5">
        <div class="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-slate-800">常用 Marker 基因</div>
              <div class="mt-0.5 text-xs text-slate-500">用于生成 Dotplot，也作为右侧细胞类型候选。</div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                @click="showMarkerEditor = !showMarkerEditor"
              >
                {{ showMarkerEditor ? '收起编辑' : '编辑 Marker' }}
              </button>
              <button
                type="button"
                :disabled="dotplotLoading || markerRows.length === 0"
                class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="emit('generate-dotplot')"
              >
                <Loader2 v-if="dotplotLoading" class="h-3.5 w-3.5 animate-spin" />
                <ScatterChart v-else class="h-3.5 w-3.5" />
                {{ dotplotLoading ? '生成中' : '生成 Dotplot' }}
              </button>
            </div>
          </div>

          <div v-if="markerRows.length > 0 && !showMarkerEditor" class="flex flex-wrap gap-2">
            <span
              v-for="(row, index) in markerRows"
              :key="`${row.cellType}-${index}`"
              class="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs ring-1 ring-slate-200"
            >
              <span class="font-semibold text-slate-700">{{ row.cellType || '未命名' }}</span>
              <span class="text-slate-400">{{ row.markers.split(/[,，\s]+/).filter(Boolean).length }} genes</span>
            </span>
          </div>

          <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th class="w-40 px-3 py-2">细胞类型</th>
                  <th class="px-3 py-2">Marker 基因</th>
                  <th class="w-12 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in markerRows" :key="index" class="border-t border-slate-100">
                  <td class="px-3 py-2">
                    <input v-model="row.cellType" class="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-blue-400 focus:outline-none" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model="row.markers" class="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-blue-400 focus:outline-none" />
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button type="button" class="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" @click="emit('remove-marker-row', index)">
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="button" class="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-600" @click="emit('add-marker-row')">
              <Plus class="h-3.5 w-3.5" />
              添加类型
            </button>
          </div>
        </div>

        <div v-if="dotplotUrl" class="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-2" @click="previewDotplot">
          <img :src="getStepChartUrl(dotplotUrl, 'annotation')" alt="Marker Dotplot" class="w-full rounded-lg" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/5">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <ZoomIn class="h-3.5 w-3.5" />
              点击放大
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div class="text-sm font-semibold text-slate-800">各 Cluster marker 表</div>
              <div class="mt-0.5 text-xs text-slate-500">来自上一步特征基因筛选结果，和 Dotplot 一起判读。</div>
            </div>
            <div v-if="markerClusters.length > 0" class="flex items-center gap-2">
              <label class="text-xs font-medium text-slate-500">cluster</label>
              <select
                v-model="selectedMarkerCluster"
                class="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              >
                <option value="">全部</option>
                <option v-for="cluster in markerClusters" :key="cluster" :value="cluster">
                  {{ cluster }}
                </option>
              </select>
            </div>
          </div>
          <div class="max-h-[420px] overflow-auto">
            <table v-if="filteredMarkerRows.length > 0" class="w-full min-w-[900px] text-xs">
              <thead class="sticky top-0 bg-slate-50 text-left font-semibold text-slate-500">
                <tr>
                  <th
                    v-for="column in clusterMarkersTable.columns"
                    :key="column"
                    class="whitespace-nowrap px-3 py-2"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in filteredMarkerRows"
                  :key="`${row.cluster ?? 'cluster'}-${row.Symbol ?? row.names ?? rowIndex}`"
                  class="border-t border-slate-100 hover:bg-slate-50/70"
                >
                  <td
                    v-for="column in clusterMarkersTable.columns"
                    :key="column"
                    class="whitespace-nowrap px-3 py-2 text-slate-700"
                    :class="column === 'Symbol' || column === 'names' ? 'font-semibold' : ''"
                  >
                    {{ typeof row[column] === 'number' ? formatNumber(row[column] as number) : row[column] ?? '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="px-4 py-10 text-center text-sm text-slate-400">
              暂未读取到特征基因表，请先完成“特征基因筛选”步骤。
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="min-w-0 bg-white px-6 py-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Tag class="h-5 w-5 text-blue-500" />
          <h3 class="text-base font-bold text-slate-800">Cluster 注释确认</h3>
        </div>
        <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          {{ completedCount }}/{{ clusterRows.length }}
        </span>
      </div>

      <div class="mb-4 rounded-lg border border-purple-100 bg-purple-50/50 p-3">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm font-semibold text-purple-800">
            <Sparkles class="h-4 w-4" />
            注释建议
          </div>
          <button
            type="button"
            :disabled="autoAnnotateLoading"
            class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-purple-200 bg-white px-3 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
            @click="emit('auto-annotate')"
          >
            <Loader2 v-if="autoAnnotateLoading" class="h-3.5 w-3.5 animate-spin" />
            {{ autoAnnotateLoading ? '生成中' : autoResultCount > 0 ? '重新生成' : '生成注释建议' }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="autoResultCount > 0"
            type="button"
            class="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-purple-700 ring-1 ring-purple-100 hover:bg-purple-50"
            @click="emit('apply-auto-annotation', false)"
          >
            填入空白项
          </button>
          <button
            v-if="autoResultCount > 0"
            type="button"
            class="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            @click="emit('apply-auto-annotation', true)"
          >
            覆盖全部
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-500"
            @click="emit('reset-annotation')"
          >
            <RotateCcw class="h-3.5 w-3.5" />
            重置
          </button>
        </div>
      </div>

      <div class="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[520px] text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th class="w-20 px-3 py-2">Cluster</th>
              <th v-if="autoResultCount > 0" class="w-36 px-3 py-2 text-purple-600">建议</th>
              <th class="px-3 py-2">确认细胞类型</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in clusterRows" :key="row.cluster" class="border-t border-slate-100">
              <td class="px-3 py-2">
                <button
                  type="button"
                  class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                  @click="selectedMarkerCluster = row.cluster"
                >
                  {{ row.cluster }}
                </button>
              </td>
              <td v-if="autoResultCount > 0" class="px-3 py-2">
                <div v-if="autoAnnotateResult[row.cluster]" class="space-y-1">
                  <button
                    type="button"
                    class="text-left text-xs font-medium hover:text-purple-900"
                    :class="isLowConfidence(autoAnnotateResult[row.cluster]?.confidence ?? 0) ? 'text-amber-600' : 'text-purple-700'"
                    @click="row.cellType = autoAnnotateResult[row.cluster]?.cell_type || row.cellType"
                  >
                    {{ autoAnnotateResult[row.cluster]?.cell_type }}
                  </button>
                  <div
                    class="text-[10px]"
                    :class="isLowConfidence(autoAnnotateResult[row.cluster]?.confidence ?? 0) ? 'text-amber-500' : 'text-slate-400'"
                  >
                    {{ autoAnnotateResult[row.cluster]?.confidence ?? 0 }}%
                    <span v-if="isLowConfidence(autoAnnotateResult[row.cluster]?.confidence ?? 0)">低可信</span>
                  </div>
                  <div
                    v-if="autoAnnotateResult[row.cluster]?.candidates?.length"
                    class="space-y-0.5 text-[10px] text-slate-400"
                  >
                    <div
                      v-for="candidate in autoAnnotateResult[row.cluster]?.candidates?.slice(1, 3)"
                      :key="candidate.cell_type"
                      class="truncate"
                    >
                      {{ candidate.cell_type }} {{ candidate.confidence }}%
                    </div>
                  </div>
                </div>
                <span v-else class="text-xs text-slate-300">-</span>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <select
                    v-if="candidateCellTypes.length > 0"
                    :value="row.cellType"
                    class="h-8 w-32 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
                    @change="row.cellType = ($event.target as HTMLSelectElement).value"
                  >
                    <option value="">选择</option>
                    <option v-for="cellType in candidateCellTypes" :key="cellType" :value="cellType">
                      {{ cellType }}
                    </option>
                  </select>
                  <input
                    v-model="row.cellType"
                    class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
                    placeholder="手动输入"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          :disabled="running || clusterRows.length === 0"
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('submit')"
        >
          <Loader2 v-if="running" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          {{ running ? '运行中...' : '提交注释' }}
        </button>
      </div>
    </aside>
  </div>
</template>
