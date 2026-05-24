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
  <section class="pipeline-compact-stepper rounded-xl border border-slate-200 bg-white px-3 py-2">
    <div class="flex items-center gap-3">
      <div class="w-24 shrink-0">
        <h2 class="text-xs font-bold leading-4 text-slate-950">分析步骤</h2>
        <p class="text-[11px] leading-4 text-slate-500">
          {{ completedCount }}/{{ steps.length }} 已完成
        </p>
      </div>

      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
        <button
          v-for="(step, idx) in steps"
          :key="step.stepType"
          type="button"
          class="group flex min-h-[38px] min-w-[116px] flex-1 items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-all"
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
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold"
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
            <Check v-if="step.status === 'completed'" class="h-3.5 w-3.5" />
            <Loader2
              v-else-if="step.status === 'running'"
              class="h-3.5 w-3.5 animate-spin"
            />
            <span v-else>{{ idx + 1 }}</span>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-xs font-bold leading-4 text-slate-800">
              {{ STEP_LABELS[step.stepType] || step.stepType }}
            </span>
            <span class="block truncate text-[11px] leading-3" :class="STATUS_STYLES[step.status].text">
              {{ STATUS_STYLES[step.status].label }}
            </span>
          </span>
          <span
            class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
            :class="STATUS_STYLES[step.status].dot"
          ></span>
        </button>
      </div>
    </div>
  </section>
</template>
