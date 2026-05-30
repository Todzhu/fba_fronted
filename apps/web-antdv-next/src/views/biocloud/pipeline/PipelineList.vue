<script setup lang="ts">
/**
 * 云流程列表页
 * 恢复为流程卡片入口：用户先选择流程类型，再在右侧抽屉查看详情并进入创建页。
 */
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ArrowRight,
  BookOpen,
  Check,
  FlaskConical,
  Play,
  X,
} from 'lucide-vue-next';

import AuthModal from '../landing/components/AuthModal.vue';
import { PIPELINE_TYPES } from './constants';
import { PIPELINE_STEP_ORDERS, STEP_LABELS } from './types/pipeline';

const router = useRouter();
const accessStore = useAccessStore();
const isLoggedIn = computed(() => !!accessStore.accessToken);

const showAuthModal = ref(false);
const showDrawer = ref(false);
const authRedirectPath = ref('/pipeline/create?type=scrna');
const selectedPipelineType = ref<null | (typeof PIPELINE_TYPES)[number]>(null);

const pipelineTypes = PIPELINE_TYPES;
const selectedStepOrder = computed(() => {
  const id = selectedPipelineType.value?.id || 'scrna';
  return PIPELINE_STEP_ORDERS[id] ?? PIPELINE_STEP_ORDERS.scrna;
});

const handleTypeClick = (type: (typeof PIPELINE_TYPES)[number]) => {
  selectedPipelineType.value = type;
  showDrawer.value = true;
};

const handleStartAnalysis = () => {
  if (!selectedPipelineType.value?.available) return;

  authRedirectPath.value = `/pipeline/create?type=${selectedPipelineType.value.id}`;
  if (!isLoggedIn.value) {
    showDrawer.value = false;
    showAuthModal.value = true;
    return;
  }

  router.push(`/pipeline/create?type=${selectedPipelineType.value.id}`);
};

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    showAuthModal.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Compact Banner Header -->
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <div class="flex items-center gap-5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-inner ring-1 ring-black/5">
            <FlaskConical class="h-6 w-6" />
          </div>
          <div class="flex flex-col justify-center">
            <h1 class="text-lg font-bold tracking-tight text-slate-900">云流程</h1>
            <p class="mt-0.5 text-[13px] font-medium text-slate-500">
              选择分析流程类型，创建和管理你的组学数据分析任务。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 流程类型卡片 -->
    <div class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="type in pipelineTypes"
          :key="type.id"
          class="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.025] hover:border-slate-300 hover:shadow-[0_24px_54px_-28px_rgba(15,23,42,0.5)]"
          @click="handleTypeClick(type)"
        >
          <div class="relative h-40 overflow-hidden bg-slate-100 sm:h-44 lg:h-48">
            <img
              :src="type.previewImage"
              :alt="type.title"
              class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div class="absolute inset-0 ring-1 ring-inset ring-slate-900/5"></div>
            <div
              v-if="!type.available"
              class="absolute right-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur"
            >
              即将上线
            </div>
          </div>

          <div class="flex min-h-[152px] flex-col p-3.5">
            <div class="mb-2 flex items-start justify-between gap-3">
              <div>
                <p class="mb-1 text-xs font-medium text-slate-400">
                  {{ type.subtitle }}
                </p>
                <h3 class="text-base font-bold text-slate-900">
                  {{ type.title }}
                </h3>
              </div>
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                :style="{
                  backgroundColor: `${type.gradientFrom}12`,
                  color: type.gradientFrom,
                }"
              >
                <component :is="type.icon" class="h-4 w-4" />
              </div>
            </div>
            <p class="mb-2.5 line-clamp-2 text-[13px] leading-5 text-slate-500">
              {{ type.description }}
            </p>
            <div class="mb-3 flex flex-wrap gap-1.5">
              <span
                v-for="tag in type.tags"
                :key="tag"
                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors group-hover:bg-white"
                :style="{
                  backgroundColor: `${type.gradientFrom}0D`,
                  borderColor: `${type.gradientFrom}24`,
                  color: type.gradientFrom,
                }"
              >
                {{ tag }}
              </span>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                :style="{
                  backgroundColor: `${type.gradientFrom}10`,
                  borderColor: `${type.gradientFrom}26`,
                  color: type.gradientFrom,
                }"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :style="{ backgroundColor: type.gradientFrom }"
                ></span>
                {{ type.category === 'spatial' ? 'Spatial' : 'Single Cell' }}
              </span>
              <span
                v-if="type.available"
                class="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                :style="{ color: type.gradientFrom }"
              >
                进入平台
                <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span v-else class="text-sm text-slate-400">敬请期待</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧抽屉：流程详细介绍 -->
    <Transition name="drawer">
      <div
        v-if="showDrawer && selectedPipelineType"
        class="fixed inset-0 z-50 flex justify-end"
      >
        <div
          class="absolute inset-0 bg-black/40 transition-opacity"
          @click="showDrawer = false"
        ></div>
        <div class="relative w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
          <div
            class="relative flex h-52 items-end overflow-hidden px-8 pb-6"
            :style="{
              background: `linear-gradient(135deg, ${selectedPipelineType.gradientFrom}, ${selectedPipelineType.gradientTo})`,
            }"
          >
            <button
              class="absolute right-4 top-4 cursor-pointer rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              @click="showDrawer = false"
            >
              <X class="h-5 w-5" />
            </button>
            <div class="relative z-10">
              <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <component :is="selectedPipelineType.icon" class="h-6 w-6 text-white" />
              </div>
              <h2 class="text-2xl font-bold text-white">
                {{ selectedPipelineType.title }}
              </h2>
              <p class="mt-1 text-sm text-white/70">
                {{ selectedPipelineType.subtitle }}
              </p>
            </div>
          </div>

          <div class="px-8 py-6">
            <div class="mb-6 flex flex-wrap gap-2">
              <span
                v-for="tag in selectedPipelineType.tags"
                :key="tag"
                class="rounded-full px-3 py-1 text-xs font-medium"
                :style="{
                  backgroundColor: `${selectedPipelineType.gradientFrom}12`,
                  color: selectedPipelineType.gradientFrom,
                }"
              >
                {{ tag }}
              </span>
            </div>

            <div class="mb-8 flex items-center gap-3">
              <button
                v-if="selectedPipelineType.available"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                :style="{
                  backgroundColor: selectedPipelineType.gradientFrom,
                  boxShadow: `0 8px 24px ${selectedPipelineType.gradientFrom}30`,
                }"
                @click="handleStartAnalysis"
              >
                <Play class="h-4 w-4" />
                开始分析
              </button>
              <button
                v-else
                disabled
                class="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-medium text-slate-500"
              >
                即将上线
              </button>
              <button class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                <BookOpen class="h-4 w-4" />
                文档
              </button>
            </div>

            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">产品介绍</h3>
              <div class="space-y-3 text-sm leading-relaxed text-slate-600">
                <p
                  v-for="(paragraph, idx) in selectedPipelineType.fullDescription.split('\n\n')"
                  :key="idx"
                >
                  {{ paragraph }}
                </p>
              </div>
            </div>

            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">功能特性</h3>
              <div class="space-y-2.5">
                <div
                  v-for="(feature, idx) in selectedPipelineType.features"
                  :key="idx"
                  class="flex items-start gap-3"
                >
                  <div
                    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    :style="{ backgroundColor: `${selectedPipelineType.gradientFrom}15` }"
                  >
                    <Check class="h-3 w-3" :style="{ color: selectedPipelineType.gradientFrom }" />
                  </div>
                  <span class="text-sm text-slate-600">{{ feature }}</span>
                </div>
              </div>
            </div>

            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">分析步骤</h3>
              <div class="space-y-2">
                <div
                  v-for="(step, idx) in selectedStepOrder"
                  :key="step"
                  class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    :style="{ backgroundColor: selectedPipelineType.gradientFrom }"
                  >
                    {{ idx + 1 }}
                  </div>
                  <span class="text-sm font-medium text-slate-700">
                    {{ STEP_LABELS[step] }}
                  </span>
                </div>
              </div>
            </div>

            <div class="sticky bottom-0 -mx-8 border-t border-slate-100 bg-white px-8 py-4">
              <button
                v-if="selectedPipelineType.available"
                class="w-full cursor-pointer rounded-lg py-3 text-center text-sm font-medium text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                :style="{ backgroundColor: selectedPipelineType.gradientFrom }"
                @click="handleStartAnalysis"
              >
                开始分析
              </button>
              <button
                v-else
                disabled
                class="w-full rounded-lg bg-slate-200 py-3 text-center text-sm font-medium text-slate-500"
              >
                即将上线，敬请期待
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <AuthModal
      :is-open="showAuthModal"
      :redirect-path="authRedirectPath"
      @close="showAuthModal = false"
    />
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
</style>
