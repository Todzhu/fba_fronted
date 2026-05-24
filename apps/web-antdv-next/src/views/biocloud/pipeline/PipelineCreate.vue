<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import { ArrowLeft, Check, Database, Loader2, Microscope } from 'lucide-vue-next';

import { createPipeline } from '#/api/pipeline';

import AuthModal from '../landing/components/AuthModal.vue';
import PipelineDataFolderSelector from './components/PipelineDataFolderSelector.vue';
import { PIPELINE_TYPES, SPECIES_OPTIONS } from './constants';
import { STEP_LABELS, STEP_ORDER } from './types/pipeline';

const router = useRouter();
const route = useRoute();
const accessStore = useAccessStore();

const isLoggedIn = computed(() => !!accessStore.accessToken);
const showAuthModal = ref(false);
const creating = ref(false);
const apiError = ref('');

const scrnaPipeline = PIPELINE_TYPES.find((item) => item.id === 'scrna') ?? PIPELINE_TYPES[0];
const selectedPipelineType = computed(() => String(route.query.type || 'scrna'));
const selectedPipeline = computed(
  () => PIPELINE_TYPES.find((item) => item.id === selectedPipelineType.value) ?? scrnaPipeline,
);

const formName = ref('');
const formDataPath = ref('');
const formSpecies = ref('');
const formDescription = ref('');
const formErrors = ref<Record<string, string>>({});

const validateForm = () => {
  const errors: Record<string, string> = {};
  const name = formName.value.trim();

  if (!name) {
    errors.name = '请输入项目名称';
  } else if (name.length < 2) {
    errors.name = '名称至少 2 个字符';
  } else if (name.length > 50) {
    errors.name = '名称不超过 50 个字符';
  }

  if (!formDataPath.value) {
    errors.dataPath = '请选择样本数据位置';
  }

  if (!formSpecies.value) {
    errors.species = '请选择样本物种';
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const clearFieldError = (key: string) => {
  if (formErrors.value[key]) {
    delete formErrors.value[key];
  }
  apiError.value = '';
};

const handleCreate = async () => {
  apiError.value = '';
  if (!isLoggedIn.value) {
    showAuthModal.value = true;
    return;
  }
  if (!selectedPipeline.value.available) {
    apiError.value = `${selectedPipeline.value.title}正在准备中，暂不支持创建项目`;
    return;
  }
  if (!validateForm()) return;

  creating.value = true;
  try {
    const pipeline = await createPipeline({
      name: formName.value.trim(),
      description: formDescription.value.trim() || undefined,
      dataPath: formDataPath.value,
      species: formSpecies.value,
      pipelineType: selectedPipeline.value.id,
    });
    router.push(`/pipeline/${pipeline.id}`);
  } catch (error: any) {
    apiError.value = error?.message || '创建分析项目失败，请稍后重试';
  } finally {
    creating.value = false;
  }
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
      <button
        type="button"
        class="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
        @click="router.push('/pipeline')"
      >
        <ArrowLeft class="h-4 w-4" />
        返回云流程
      </button>

      <div class="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <component :is="selectedPipeline.icon || Microscope" class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-950">创建{{ selectedPipeline.title.replace('流程', '项目') }}</h1>
            <p class="mt-1 text-sm text-slate-500">
              先建立项目，进入详情页后在第 1 步扫描样本并编辑分组。
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section class="rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-100 px-6 py-4">
              <h2 class="text-base font-bold text-slate-900">项目配置</h2>
              <p class="mt-1 text-sm text-slate-500">
              选择输入数据目录和样本物种，系统会创建标准 5 步分析流程。
              </p>
            </div>

          <div class="space-y-5 px-6 py-5">
            <div
              v-if="apiError"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {{ apiError }}
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                项目名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formName"
                maxlength="50"
                placeholder="例如：PBMC 3K 单细胞分析"
                type="text"
                class="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                :class="
                  formErrors.name
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                "
                @input="clearFieldError('name')"
              />
              <div class="mt-1 flex items-center justify-between">
                <p v-if="formErrors.name" class="text-xs text-red-500">
                  {{ formErrors.name }}
                </p>
                <span v-else></span>
                <span class="text-xs text-slate-400">{{ formName.length }}/50</span>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                样本数据位置 <span class="text-red-500">*</span>
              </label>
              <PipelineDataFolderSelector
                v-model="formDataPath"
                :error="formErrors.dataPath"
                @selected="clearFieldError('dataPath')"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                样本物种 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formSpecies"
                class="w-full cursor-pointer rounded-lg border px-4 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                :class="
                  formErrors.species
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                "
                @change="clearFieldError('species')"
              >
                <option value="" disabled>请选择样本物种</option>
                <option
                  v-for="option in SPECIES_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <p v-if="formErrors.species" class="mt-1 text-xs text-red-500">
                {{ formErrors.species }}
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                项目描述
                <span class="text-xs font-normal text-slate-400">（可选）</span>
              </label>
              <textarea
                v-model="formDescription"
                maxlength="200"
                placeholder="简要描述项目目的或备注信息"
                rows="4"
                class="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
              ></textarea>
              <div class="mt-1 text-right text-xs text-slate-400">
                {{ formDescription.length }}/200
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              @click="router.push('/pipeline')"
            >
              取消
            </button>
            <button
              type="button"
              :disabled="creating || !selectedPipeline.available"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleCreate"
            >
              <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
              {{ creating ? '创建中...' : selectedPipeline.available ? '创建项目' : '即将上线' }}
            </button>
          </div>
        </section>

        <aside class="self-start rounded-xl border border-slate-200 bg-white lg:sticky lg:top-6">
          <div class="border-b border-slate-100 px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-teal-600">
              {{ selectedPipeline.subtitle }}
            </p>
            <h2 class="mt-1 text-lg font-bold text-slate-950">
              {{ selectedPipeline.title }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ selectedPipeline.description }}
            </p>
          </div>

          <div class="space-y-5 px-5 py-4">
            <div>
              <h3 class="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Database class="h-4 w-4 text-teal-600" />
                标准分析步骤
              </h3>
              <div class="space-y-2">
                <div
                  v-for="(step, index) in STEP_ORDER"
                  :key="step"
                  class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span class="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-teal-700 ring-1 ring-slate-200">
                    {{ index + 1 }}
                  </span>
                  <span class="text-sm font-medium text-slate-700">
                    {{ STEP_LABELS[step] }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 class="mb-2 text-sm font-bold text-slate-800">创建后下一步</h3>
              <div class="space-y-2 text-sm text-slate-500">
                <p class="flex gap-2">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  进入流程详情页的「数据读取」步骤。
                </p>
                <p class="flex gap-2">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  系统扫描样本文件夹，你再确认样本名和分组。
                </p>
                <p class="flex gap-2">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  每一步运行后在右侧查看指标、图表和表格。
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <AuthModal
      :is-open="showAuthModal"
      redirect-path="/pipeline/create?type=scrna"
      @close="showAuthModal = false"
    />
  </div>
</template>
