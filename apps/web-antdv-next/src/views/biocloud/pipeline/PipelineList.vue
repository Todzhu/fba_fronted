<script setup lang="ts">
/**
 * 云流程首页
 * 专业流程入口页：展示单细胞流程能力、标准步骤和创建入口。
 */
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ArrowRight,
  Check,
  Clock3,
  Database,
  FileText,
  FlaskConical,
  Lock,
} from 'lucide-vue-next';

import AuthModal from '../landing/components/AuthModal.vue';
import { PIPELINE_TYPES } from './constants';
import { STEP_LABELS, STEP_ORDER } from './types/pipeline';

const router = useRouter();
const accessStore = useAccessStore();
const isLoggedIn = computed(() => !!accessStore.accessToken);
const showAuthModal = ref(false);

const scrnaPipeline = PIPELINE_TYPES.find((item) => item.id === 'scrna') ?? PIPELINE_TYPES[0];
const upcomingPipelines = PIPELINE_TYPES.filter((item) => item.id !== 'scrna');

const coreOutputs = ['QC 指标图', 'UMAP / t-SNE', 'Marker 基因表', '细胞注释 h5ad'];
const inputFormats = ['10x Genomics', 'Smart-seq2', 'h5 / h5ad', '多样本目录'];

const handleCreateProject = () => {
  if (!isLoggedIn.value) {
    showAuthModal.value = true;
    return;
  }
  router.push('/pipeline/create?type=scrna');
};

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    showAuthModal.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <FlaskConical class="h-6 w-6" />
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-950">云流程</h1>
              <p class="mt-1 text-sm text-slate-500">
                以标准分析流程组织数据、参数、运行状态和结果文件。
              </p>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
            @click="handleCreateProject"
          >
            创建分析项目
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-100 px-6 py-5">
            <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div class="max-w-3xl">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    推荐流程
                  </span>
                  <span
                    v-for="tag in scrnaPipeline.tags"
                    :key="tag"
                    class="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="flex items-start gap-4">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <component :is="scrnaPipeline.icon" class="h-7 w-7" />
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-teal-600">
                      {{ scrnaPipeline.subtitle }}
                    </p>
                    <h2 class="mt-1 text-2xl font-bold text-slate-950">
                      {{ scrnaPipeline.title }}
                    </h2>
                    <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                      {{ scrnaPipeline.description }}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
                @click="handleCreateProject"
              >
                创建分析项目
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="grid gap-0 divide-y divide-slate-100 xl:grid-cols-[1fr_1fr] xl:divide-x xl:divide-y-0">
            <div class="px-6 py-5">
              <h3 class="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Database class="h-4 w-4 text-teal-600" />
                标准 6 步分析流程
              </h3>
              <div class="grid gap-3 sm:grid-cols-2">
                <div
                  v-for="(step, index) in STEP_ORDER"
                  :key="step"
                  class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-teal-700 ring-1 ring-slate-200">
                    {{ index + 1 }}
                  </span>
                  <span class="text-sm font-medium text-slate-700">
                    {{ STEP_LABELS[step] }}
                  </span>
                </div>
              </div>
            </div>

            <div class="px-6 py-5">
              <h3 class="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                <FileText class="h-4 w-4 text-teal-600" />
                核心产出
              </h3>
              <div class="grid gap-3 sm:grid-cols-2">
                <div
                  v-for="output in coreOutputs"
                  :key="output"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700"
                >
                  <Check class="h-4 w-4 shrink-0 text-emerald-500" />
                  {{ output }}
                </div>
              </div>

              <h3 class="mb-3 mt-6 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Database class="h-4 w-4 text-teal-600" />
                支持数据
              </h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="format in inputFormats"
                  :key="format"
                  class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  {{ format }}
                </span>
              </div>
            </div>
          </div>
        </article>

        <aside class="space-y-5">
          <div class="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <h3 class="text-sm font-bold text-slate-900">使用路径</h3>
            <div class="mt-4 space-y-3">
              <div class="flex gap-3 text-sm">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                  1
                </span>
                <div>
                  <p class="font-medium text-slate-800">选择数据目录</p>
                  <p class="text-slate-500">从我的数据中选择样本文件夹。</p>
                </div>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                  2
                </span>
                <div>
                  <p class="font-medium text-slate-800">创建项目</p>
                  <p class="text-slate-500">确认物种，进入流程详情页。</p>
                </div>
              </div>
              <div class="flex gap-3 text-sm">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                  3
                </span>
                <div>
                  <p class="font-medium text-slate-800">逐步运行</p>
                  <p class="text-slate-500">配置参数，查看指标、图表和日志。</p>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock3 class="h-4 w-4 text-teal-600" />
              流程提示
            </h3>
            <div class="space-y-2 text-sm leading-6 text-slate-500">
              <p>创建项目后，样本识别和分组会在第 1 步「数据读取」中完成。</p>
              <p>高级参数默认折叠，适合混合用户从推荐配置开始。</p>
            </div>
          </div>

          <div
            v-for="pipeline in upcomingPipelines"
            :key="pipeline.id"
            class="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-4"
          >
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <component :is="pipeline.icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="truncate text-sm font-bold text-slate-800">
                    {{ pipeline.title }}
                  </h3>
                  <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    <Lock class="h-3 w-3" />
                    即将上线
                  </span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-500">
                  {{ pipeline.description }}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>

    <AuthModal
      :is-open="showAuthModal"
      redirect-path="/pipeline/create?type=scrna"
      @close="showAuthModal = false"
    />
  </div>
</template>
