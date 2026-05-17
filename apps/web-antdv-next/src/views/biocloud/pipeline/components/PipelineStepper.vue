<script setup lang="ts">
import type { StepConfig } from '../types/pipeline';

import { computed } from 'vue';

import { Check, Loader2 } from 'lucide-vue-next';

import { STATUS_STYLES } from '../constants';
import { STEP_LABELS } from '../types/pipeline';

const props = defineProps<{
  activeStepIndex: number;
  currentStep: number;
  steps: StepConfig[];
}>();

const emit = defineEmits<{
  'update:activeStepIndex': [value: number];
}>();

const completedCount = computed(
  () => props.steps.filter((step) => step.status === 'completed').length,
);

const isClickable = (idx: number) => {
  if (idx <= props.currentStep) return true;
  const prevStep = props.steps[idx - 1];
  return !!prevStep && prevStep.status === 'completed';
};

const selectStep = (idx: number) => {
  if (isClickable(idx)) {
    emit('update:activeStepIndex', idx);
  }
};
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white px-5 py-4">
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-950">分析步骤</h2>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ completedCount }}/{{ steps.length }} 已完成
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span
          v-for="item in Object.values(STATUS_STYLES)"
          :key="item.label"
          class="inline-flex items-center gap-1.5"
        >
          <span class="h-2 w-2 rounded-full" :class="item.dot"></span>
          {{ item.label }}
        </span>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
      <button
        v-for="(step, idx) in steps"
        :key="step.stepType"
        type="button"
        class="group flex min-h-[86px] flex-col rounded-lg border px-3 py-3 text-left transition-all"
        :class="[
          idx === activeStepIndex
            ? 'border-teal-500 bg-teal-50 shadow-sm'
            : 'border-slate-200 bg-white',
          isClickable(idx)
            ? 'cursor-pointer hover:border-teal-300 hover:bg-teal-50/50'
            : 'cursor-not-allowed opacity-60',
        ]"
        @click="selectStep(idx)"
      >
        <span class="mb-3 flex items-center justify-between gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
            :class="
              step.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : step.status === 'running'
                  ? 'bg-blue-100 text-blue-700'
                  : step.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-500'
            "
          >
            <Check v-if="step.status === 'completed'" class="h-4 w-4" />
            <Loader2
              v-else-if="step.status === 'running'"
              class="h-4 w-4 animate-spin"
            />
            <span v-else>{{ idx + 1 }}</span>
          </span>
          <span
            class="h-2 w-2 rounded-full"
            :class="STATUS_STYLES[step.status].dot"
          ></span>
        </span>
        <span class="text-sm font-bold text-slate-800">
          {{ STEP_LABELS[step.stepType] || step.stepType }}
        </span>
        <span class="mt-1 text-xs" :class="STATUS_STYLES[step.status].text">
          {{ STATUS_STYLES[step.status].label }}
        </span>
      </button>
    </div>
  </section>
</template>
