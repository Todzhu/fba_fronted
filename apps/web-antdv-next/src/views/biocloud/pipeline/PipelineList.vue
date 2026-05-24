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
import { STEP_LABELS, STEP_ORDER } from './types/pipeline';

const router = useRouter();
const accessStore = useAccessStore();
const isLoggedIn = computed(() => !!accessStore.accessToken);

const showAuthModal = ref(false);
const showDrawer = ref(false);
const authRedirectPath = ref('/pipeline/create?type=scrna');
const selectedPipelineType = ref<null | (typeof PIPELINE_TYPES)[number]>(null);

const pipelineTypes = PIPELINE_TYPES;

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
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="type in pipelineTypes"
          :key="type.id"
          class="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
          :class="{ 'opacity-75': !type.available }"
          @click="handleTypeClick(type)"
        >
          <div
            class="relative flex h-36 items-center justify-center overflow-hidden"
            :style="{
              background: `linear-gradient(135deg, ${type.gradientFrom}, ${type.gradientTo})`,
            }"
          >
            <div class="relative z-10 text-center">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
                <component :is="type.icon" class="h-8 w-8 text-white" />
              </div>
              <p class="text-sm font-medium text-white/80">
                {{ type.subtitle }}
              </p>
            </div>
            <div
              v-if="!type.available"
              class="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              即将上线
            </div>
          </div>

          <div class="p-5">
            <h3 class="mb-2 text-lg font-bold text-slate-900">
              {{ type.title }}
            </h3>
            <p class="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
              {{ type.description }}
            </p>
            <div class="mb-4 flex flex-wrap gap-2">
              <span
                v-for="tag in type.tags"
                :key="tag"
                class="rounded-md px-2 py-0.5 text-xs font-medium"
                :style="{
                  backgroundColor: `${type.gradientFrom}12`,
                  color: type.gradientFrom,
                }"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center justify-between">
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
                  v-for="(step, idx) in STEP_ORDER"
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
