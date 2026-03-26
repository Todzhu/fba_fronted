<script setup lang="ts">
/**
 * 云流程列表页
 * 展示可用的分析流程类型卡片，点击弹出右侧抽屉详情
 */
import type { FileNode } from '#/api/pipeline';

import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Loader2,
  MapPin,
  Microscope,
  Play,
  X,
} from 'lucide-vue-next';

import {
  createPipeline,
  getFolderChildrenAsNodes,
  getMyDataTree,
} from '#/api/pipeline';

import { STEP_LABELS, STEP_ORDER } from './types/pipeline';
import AuthModal from '../landing/components/AuthModal.vue';

const router = useRouter();
const accessStore = useAccessStore();
const isLoggedIn = computed(() => !!accessStore.accessToken);
const showAuthModal = ref(false);

// 流程类型定义
const pipelineTypes = [
  {
    id: 'scrna',
    title: '单细胞转录组分析流程',
    subtitle: 'Single-cell RNA-seq Analysis',
    description:
      '一站式单细胞分析的云端流程。涵盖基础分析、高级分析等多个内容，包括质控过滤、标准化、降维聚类、细胞注释等完整分析步骤。',
    fullDescription:
      '单细胞RNA测序（Single-cell RNA-sequencing, scRNA-seq）是一种在单个细胞水平上进行RNA高通量测序和解析的前沿技术。这项技术使得我们能够探索不同细胞之间的基因表达差异，即使在看起来相同的细胞群中，个体细胞的转录组也存在明显的差异。\n\n与传统的Bulk RNA测序不同，单细胞RNA测序可以避免因细胞混合而导致的平均化，揭示单个细胞的独特基因表达特征。通过单细胞测序，我们不仅可以获得单个细胞的遗传信息，还能够深入了解细胞间的异质性。',
    features: [
      '支持 10x Genomics、Smart-seq2 等主流平台数据',
      '自动化质控过滤，智能阈值推荐',
      '多种标准化和批次校正方法',
      '高效降维 (PCA/UMAP/t-SNE) 与聚类分析',
      '基于参考数据库的自动细胞注释',
      '交互式可视化结果展示',
    ],
    tags: ['scRNA-seq', '10x Genomics', 'Smart-seq2'],
    icon: Microscope,
    gradientFrom: '#3B82F6',
    gradientTo: '#1D4ED8',
    available: true,
  },
  {
    id: 'spatial',
    title: '空间转录组分析流程',
    subtitle: 'Spatial Transcriptomics Analysis',
    description:
      '空间转录组学分析云端流程。支持 10x Visium、Slide-seq 等主流平台，实现空间基因表达可视化、空间聚类与细胞互作分析。',
    fullDescription:
      '空间转录组学（Spatial Transcriptomics）是将基因表达信息与组织空间位置信息结合的革命性技术。该技术能够在保持组织结构完整性的同时，解析每个空间位置的基因表达谱，从而揭示细胞在组织微环境中的功能和相互作用。\n\n本流程支持多种主流空间转录组学平台的数据分析，提供从数据预处理到空间可视化的完整解决方案。',
    features: [
      '支持 10x Visium、Slide-seq、MERFISH 等平台',
      '组织图像与基因表达联合分析',
      '空间自相关分析与热点检测',
      '空间可变基因鉴定',
      '细胞类型反卷积与空间映射',
      '细胞通讯与空间互作网络分析',
    ],
    tags: ['Visium', 'Slide-seq', 'MERFISH'],
    icon: MapPin,
    gradientFrom: '#059669',
    gradientTo: '#047857',
    available: false,
  },
];

// 物种选项
const speciesOptions = [
  { value: 'human', label: '人类 (Homo sapiens)' },
  { value: 'mouse', label: '小鼠 (Mus musculus)' },
  { value: 'rat', label: '大鼠 (Rattus norvegicus)' },
  { value: 'zebrafish', label: '斑马鱼 (Danio rerio)' },
  { value: 'drosophila', label: '果蝇 (Drosophila melanogaster)' },
  { value: 'other', label: '其他' },
];

// 抽屉状态
const showDrawer = ref(false);
const selectedPipelineType = ref<(typeof pipelineTypes)[0] | null>(null);

// 新建流程弹窗
const showCreateModal = ref(false);
const creating = ref(false);

// 表单数据
const formName = ref('');
const formDataPath = ref('');
const formSpecies = ref('');
const formDescription = ref('');

// 表单校验
const formErrors = ref<Record<string, string>>({});

const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  if (!formName.value.trim()) {
    errors.name = '请输入项目名称';
  } else if (formName.value.trim().length < 2) {
    errors.name = '名称至少 2 个字符';
  } else if (formName.value.trim().length > 50) {
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

// 目录树
const dataTreeData = ref<FileNode[]>([]);
const loadingTree = ref(false);
const showTreeDropdown = ref(false);
const expandedKeys = ref<Set<string>>(new Set());

const loadDataTree = async () => {
  loadingTree.value = true;
  try {
    dataTreeData.value = await getMyDataTree();
    // 默认展开第一级
    for (const node of dataTreeData.value) {
      expandedKeys.value.add(node.key);
    }
  } finally {
    loadingTree.value = false;
  }
};

// 正在懒加载的节点
const loadingKeys = ref<Set<string>>(new Set());

// 递归查找树中的节点
const findNodeByKey = (nodes: FileNode[], key: string): FileNode | null => {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
};

// 切换目录展开（带懒加载）
const toggleExpand = async (key: string) => {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key);
    return;
  }

  // 找到该节点
  const node = findNodeByKey(dataTreeData.value, key);
  if (node && !node.children) {
    // 没有预加载 children，从 API 懒加载
    loadingKeys.value.add(key);
    try {
      const children = await getFolderChildrenAsNodes(node.path);
      node.children = children.length > 0 ? children : [];
    } catch (error) {
      console.error('加载子文件失败:', error);
      node.children = [];
    } finally {
      loadingKeys.value.delete(key);
    }
  }

  expandedKeys.value.add(key);
};

// 选择目录
const selectTreeNode = (node: FileNode) => {
  formDataPath.value = node.path;
  showTreeDropdown.value = false;
  // 清除该字段错误
  if (formErrors.value.dataPath) {
    delete formErrors.value.dataPath;
  }
};

// 获取选中路径的显示名称
const getSelectedPathLabel = (): string => {
  if (!formDataPath.value) return '';
  const parts = formDataPath.value.split('/');
  return parts[parts.length - 1] || formDataPath.value;
};

// 点击流程类型卡片 → 打开抽屉
const handleTypeClick = (type: (typeof pipelineTypes)[0]) => {
  selectedPipelineType.value = type;
  showDrawer.value = true;
};

// 从抽屉点击"开始分析" → 检查登录状态后打开创建弹窗
const handleStartAnalysis = async () => {
  // 未登录时弹出登录框
  if (!isLoggedIn.value) {
    showDrawer.value = false;
    showAuthModal.value = true;
    return;
  }
  showDrawer.value = false;
  // 重置表单
  formName.value = '';
  formDataPath.value = '';
  formSpecies.value = '';
  formDescription.value = '';
  formErrors.value = {};
  // 加载目录树
  await loadDataTree();
  showCreateModal.value = true;
};

// 登录成功后关闭弹窗
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    showAuthModal.value = false;
  }
});

// 创建新流程
const handleCreate = async () => {
  if (!validateForm()) return;
  creating.value = true;
  try {
    const pipeline = await createPipeline({
      name: formName.value.trim(),
      description: formDescription.value.trim() || undefined,
      dataPath: formDataPath.value,
      species: formSpecies.value,
    });
    showCreateModal.value = false;
    router.push(`/pipeline/${pipeline.id}`);
  } catch (error) {
    console.error('创建流程失败:', error);
  } finally {
    creating.value = false;
  }
};

// 关闭树下拉
const handleClickOutsideTree = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.tree-select-wrapper')) {
    showTreeDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutsideTree);
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Compact Banner Header -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
      <div class="flex items-center justify-between rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] px-6 py-4">
        <div class="flex items-center gap-5">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-inner ring-1 ring-black/5">
            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
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
          @click="handleTypeClick(type)"
          class="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
          :class="{ 'opacity-75': !type.available }"
        >
          <!-- 卡片头图 -->
          <div
            class="relative flex h-36 items-center justify-center overflow-hidden"
            :style="{
              background: `linear-gradient(135deg, ${type.gradientFrom}, ${type.gradientTo})`,
            }"
          >
            <div
              class="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10"
              style="background: white"
            ></div>
            <div
              class="absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-10"
              style="background: white"
            ></div>
            <div
              class="absolute right-12 top-8 h-2 w-2 rounded-full bg-white/30"
            ></div>
            <div
              class="absolute right-20 top-16 h-1.5 w-1.5 rounded-full bg-white/20"
            ></div>
            <div
              class="absolute bottom-10 left-16 h-2.5 w-2.5 rounded-full bg-white/25"
            ></div>
            <div class="relative z-10 text-center">
              <div
                class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110"
              >
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

          <!-- 卡片内容 -->
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
                <ArrowRight
                  class="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
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
        <div
          class="relative w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
        >
          <!-- 顶部头图 -->
          <div
            class="relative flex h-52 items-end overflow-hidden px-8 pb-6"
            :style="{
              background: `linear-gradient(135deg, ${selectedPipelineType.gradientFrom}, ${selectedPipelineType.gradientTo})`,
            }"
          >
            <div
              class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10"
            ></div>
            <div
              class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10"
            ></div>
            <button
              @click="showDrawer = false"
              class="absolute right-4 top-4 cursor-pointer rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <X class="h-5 w-5" />
            </button>
            <div class="relative z-10">
              <div
                class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"
              >
                <component
                  :is="selectedPipelineType.icon"
                  class="h-6 w-6 text-white"
                />
              </div>
              <h2 class="text-2xl font-bold text-white">
                {{ selectedPipelineType.title }}
              </h2>
              <p class="mt-1 text-sm text-white/70">
                {{ selectedPipelineType.subtitle }}
              </p>
            </div>
          </div>

          <!-- 内容区域 -->
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
                @click="handleStartAnalysis"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
                :style="{
                  backgroundColor: selectedPipelineType.gradientFrom,
                  boxShadow: `0 8px 24px ${selectedPipelineType.gradientFrom}30`,
                }"
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
              <button
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <BookOpen class="h-4 w-4" />
                文档
              </button>
            </div>

            <!-- 产品介绍 -->
            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">产品介绍</h3>
              <div class="space-y-3 text-sm leading-relaxed text-slate-600">
                <p
                  v-for="(
                    paragraph, idx
                  ) in selectedPipelineType.fullDescription.split('\n\n')"
                  :key="idx"
                >
                  {{ paragraph }}
                </p>
              </div>
            </div>

            <!-- 功能特性 -->
            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">功能特性</h3>
              <div class="space-y-2.5">
                <div
                  v-for="(feature, idx) in selectedPipelineType.features"
                  :key="idx"
                  class="flex items-start gap-3"
                >
                  <div
                    class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    :style="{
                      backgroundColor: `${selectedPipelineType.gradientFrom}15`,
                    }"
                  >
                    <Check
                      class="h-3 w-3"
                      :style="{ color: selectedPipelineType.gradientFrom }"
                    />
                  </div>
                  <span class="text-sm text-slate-600">{{ feature }}</span>
                </div>
              </div>
            </div>

            <!-- 分析步骤 -->
            <div class="mb-8">
              <h3 class="mb-3 text-base font-bold text-slate-800">分析步骤</h3>
              <div class="space-y-2">
                <div
                  v-for="(step, idx) in STEP_ORDER"
                  :key="step"
                  class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div
                    class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    :style="{
                      backgroundColor: selectedPipelineType.gradientFrom,
                    }"
                  >
                    {{ idx + 1 }}
                  </div>
                  <span class="text-sm font-medium text-slate-700">
                    {{ STEP_LABELS[step] }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 底部操作 -->
            <div
              class="sticky bottom-0 -mx-8 border-t border-slate-100 bg-white px-8 py-4"
            >
              <button
                v-if="selectedPipelineType.available"
                @click="handleStartAnalysis"
                class="w-full cursor-pointer rounded-lg py-3 text-center text-sm font-medium text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                :style="{
                  backgroundColor: selectedPipelineType.gradientFrom,
                }"
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

    <!-- 新建流程弹窗 -->
    <Transition name="modal">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
        @click.self="showCreateModal = false"
      >
        <div
          class="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          @click.stop
        >
          <!-- 弹窗标题 -->
          <div
            class="flex items-center justify-between border-b border-slate-100 px-6 py-4"
          >
            <div>
              <h3 class="text-lg font-bold text-slate-900">新建分析项目</h3>
              <p class="mt-0.5 text-sm text-slate-500">
                {{ selectedPipelineType?.title || '单细胞转录组分析流程' }}
              </p>
            </div>
            <button
              @click="showCreateModal = false"
              class="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- 表单内容 -->
          <div class="space-y-5 px-6 py-5">
            <!-- 项目名称 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                项目名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formName"
                type="text"
                placeholder="例如：PBMC 3K 单细胞分析"
                maxlength="50"
                class="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="
                  formErrors.name
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-white'
                "
                @input="formErrors.name && delete formErrors.name"
              />
              <div class="mt-1 flex items-center justify-between">
                <p v-if="formErrors.name" class="text-xs text-red-500">
                  {{ formErrors.name }}
                </p>
                <span v-else></span>
                <span class="text-xs text-slate-400">
                  {{ formName.length }}/50
                </span>
              </div>
            </div>

            <!-- 样本数据位置 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                样本数据位置 <span class="text-red-500">*</span>
              </label>
              <div class="tree-select-wrapper relative">
                <button
                  type="button"
                  @click.stop="showTreeDropdown = !showTreeDropdown"
                  class="flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors"
                  :class="
                    formErrors.dataPath
                      ? 'border-red-300 bg-red-50'
                      : showTreeDropdown
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  "
                >
                  <span
                    v-if="formDataPath"
                    class="flex items-center gap-2 text-slate-900"
                  >
                    <Folder class="h-4 w-4 text-blue-500" />
                    {{ getSelectedPathLabel() }}
                    <span class="text-xs text-slate-400">
                      {{ formDataPath }}
                    </span>
                  </span>
                  <span v-else class="text-slate-400">
                    从"我的数据"选择数据文件夹
                  </span>
                  <ChevronDown
                    class="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform"
                    :class="{ 'rotate-180': showTreeDropdown }"
                  />
                </button>

                <!-- 目录树下拉 -->
                <Transition name="dropdown">
                  <div
                    v-if="showTreeDropdown"
                    class="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <div
                      v-if="loadingTree"
                      class="flex items-center justify-center py-6"
                    >
                      <Loader2 class="h-5 w-5 animate-spin text-blue-500" />
                      <span class="ml-2 text-sm text-slate-500">加载中...</span>
                    </div>
                    <template v-else>
                      <template v-for="node in dataTreeData" :key="node.key">
                        <!-- 第一层（根节点 "我的数据"） -->
                        <div
                          class="tree-node"
                          :class="{
                            'tree-node-selected': formDataPath === node.path,
                          }"
                        >
                          <div
                            class="group flex items-center gap-1 px-3 py-1.5 transition-colors hover:bg-slate-50"
                          >
                            <span
                              class="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center"
                              @click.stop="toggleExpand(node.key)"
                            >
                              <Loader2
                                v-if="loadingKeys.has(node.key)"
                                class="h-3.5 w-3.5 animate-spin text-blue-400"
                              />
                              <ChevronRight
                                v-else
                                class="h-3.5 w-3.5 text-slate-400 transition-transform"
                                :class="{
                                  'rotate-90': expandedKeys.has(node.key),
                                }"
                              />
                            </span>
                            <div
                              class="flex flex-1 cursor-pointer items-center gap-1"
                              @click="toggleExpand(node.key)"
                            >
                              <component
                                :is="
                                  expandedKeys.has(node.key)
                                    ? FolderOpen
                                    : Folder
                                "
                                class="h-4 w-4 flex-shrink-0 text-amber-500"
                              />
                              <span
                                class="ml-1 select-none text-sm text-slate-700"
                                >{{ node.title }}</span
                              >
                            </div>
                            <button
                              v-if="node.key !== 'root'"
                              type="button"
                              class="ml-auto mr-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                              :class="{ '!opacity-100 bg-blue-50': formDataPath === node.path }"
                              @click.stop="selectTreeNode(node)"
                            >
                              {{ formDataPath === node.path ? '已选' : '选择' }}
                            </button>
                          </div>

                          <!-- 第二层 -->
                          <div
                            v-if="node.children && expandedKeys.has(node.key)"
                          >
                            <template
                              v-for="child in node.children"
                              :key="child.key"
                            >
                              <!-- 文件节点（第二层） -->
                              <div
                                v-if="child.isLeaf || child.type === 'file'"
                                class="flex items-center gap-1 py-1.5 pl-8 pr-3 text-slate-400"
                              >
                                <span class="h-4 w-4 flex-shrink-0"></span>
                                <File
                                  class="h-4 w-4 flex-shrink-0 text-slate-400"
                                />
                                <span class="ml-1 select-none text-sm">{{
                                  child.title
                                }}</span>
                              </div>
                              <!-- 文件夹节点（第二层） -->
                              <template v-else>
                                <div
                                  class="group flex items-center gap-1 py-1.5 pl-8 pr-3 transition-colors hover:bg-slate-50"
                                  :class="{
                                    'bg-blue-50': formDataPath === child.path,
                                  }"
                                >
                                  <span
                                    class="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center"
                                    @click.stop="toggleExpand(child.key)"
                                  >
                                    <Loader2
                                      v-if="loadingKeys.has(child.key)"
                                      class="h-3.5 w-3.5 animate-spin text-blue-400"
                                    />
                                    <ChevronRight
                                      v-else
                                      class="h-3.5 w-3.5 text-slate-400 transition-transform"
                                      :class="{
                                        'rotate-90': expandedKeys.has(
                                          child.key,
                                        ),
                                      }"
                                    />
                                  </span>
                                  <div
                                    class="flex flex-1 cursor-pointer items-center gap-1"
                                    @click="toggleExpand(child.key)"
                                  >
                                    <component
                                      :is="
                                        expandedKeys.has(child.key)
                                          ? FolderOpen
                                          : Folder
                                      "
                                      class="h-4 w-4 flex-shrink-0 text-amber-500"
                                    />
                                    <span
                                      class="ml-1 select-none text-sm text-slate-700"
                                      >{{ child.title }}</span
                                    >
                                  </div>
                                  <button
                                    type="button"
                                    class="ml-auto mr-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                                    :class="{ '!opacity-100 bg-blue-50': formDataPath === child.path }"
                                    @click.stop="selectTreeNode(child)"
                                  >
                                    {{ formDataPath === child.path ? '已选' : '选择' }}
                                  </button>
                                </div>

                                <!-- 第三层 -->
                                <template
                                  v-if="
                                    child.children &&
                                    expandedKeys.has(child.key)
                                  "
                                >
                                  <template
                                    v-for="gc in child.children"
                                    :key="gc.key"
                                  >
                                    <!-- 文件节点（第三层） -->
                                    <div
                                      v-if="gc.isLeaf || gc.type === 'file'"
                                      class="flex items-center gap-1 py-1.5 pl-14 pr-3 text-slate-400"
                                    >
                                      <span
                                        class="h-4 w-4 flex-shrink-0"
                                      ></span>
                                      <File
                                        class="h-4 w-4 flex-shrink-0 text-slate-400"
                                      />
                                      <span class="ml-1 select-none text-sm">{{
                                        gc.title
                                      }}</span>
                                    </div>
                                    <!-- 文件夹节点（第三层） -->
                                    <template v-else>
                                      <div
                                        class="group flex items-center gap-1 py-1.5 pl-14 pr-3 transition-colors hover:bg-slate-50"
                                        :class="{
                                          'bg-blue-50':
                                            formDataPath === gc.path,
                                        }"
                                      >
                                        <span
                                          class="flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center"
                                          @click.stop="toggleExpand(gc.key)"
                                        >
                                          <Loader2
                                            v-if="loadingKeys.has(gc.key)"
                                            class="h-3.5 w-3.5 animate-spin text-blue-400"
                                          />
                                          <ChevronRight
                                            v-else
                                            class="h-3.5 w-3.5 text-slate-400 transition-transform"
                                            :class="{
                                              'rotate-90': expandedKeys.has(
                                                gc.key,
                                              ),
                                            }"
                                          />
                                        </span>
                                        <div
                                          class="flex flex-1 cursor-pointer items-center gap-1"
                                          @click="toggleExpand(gc.key)"
                                        >
                                          <component
                                            :is="
                                              expandedKeys.has(gc.key)
                                                ? FolderOpen
                                                : Folder
                                            "
                                            class="h-4 w-4 flex-shrink-0 text-amber-500"
                                          />
                                          <span
                                            class="ml-1 select-none text-sm text-slate-700"
                                            >{{ gc.title }}</span
                                          >
                                        </div>
                                        <button
                                          type="button"
                                          class="ml-auto mr-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                                          :class="{ '!opacity-100 bg-blue-50': formDataPath === gc.path }"
                                          @click.stop="selectTreeNode(gc)"
                                        >
                                          {{ formDataPath === gc.path ? '已选' : '选择' }}
                                        </button>
                                      </div>

                                      <!-- 第四层 -->
                                      <template
                                        v-if="
                                          gc.children &&
                                          expandedKeys.has(gc.key)
                                        "
                                      >
                                        <div
                                          v-for="leaf in gc.children"
                                          :key="leaf.key"
                                          class="group flex items-center gap-1 py-1.5 pl-20 pr-3 transition-colors"
                                          :class="{
                                            'bg-blue-50':
                                              formDataPath === leaf.path,
                                            'cursor-pointer hover:bg-slate-50':
                                              leaf.type !== 'file' &&
                                              !leaf.isLeaf,
                                            'text-slate-400':
                                              leaf.isLeaf ||
                                              leaf.type === 'file',
                                          }"
                                          @click="
                                            !(
                                              leaf.isLeaf ||
                                              leaf.type === 'file'
                                            ) && toggleExpand(leaf.key)
                                          "
                                        >
                                          <component
                                            :is="
                                              leaf.isLeaf ||
                                              leaf.type === 'file'
                                                ? File
                                                : Folder
                                            "
                                            class="h-4 w-4 flex-shrink-0"
                                            :class="
                                              leaf.isLeaf ||
                                              leaf.type === 'file'
                                                ? 'text-slate-400'
                                                : 'text-amber-500'
                                            "
                                          />
                                          <span
                                            class="ml-1 select-none text-sm"
                                            >{{ leaf.title }}</span
                                          >
                                          <button
                                            v-if="!(leaf.isLeaf || leaf.type === 'file')"
                                            type="button"
                                            class="ml-auto mr-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                                            :class="{ '!opacity-100 bg-blue-50': formDataPath === leaf.path }"
                                            @click.stop="selectTreeNode(leaf)"
                                          >
                                            {{ formDataPath === leaf.path ? '已选' : '选择' }}
                                          </button>
                                        </div>
                                      </template>
                                    </template>
                                  </template>
                                </template>
                              </template>
                            </template>
                          </div>
                        </div>
                      </template>
                    </template>
                  </div>
                </Transition>
              </div>
              <p v-if="formErrors.dataPath" class="mt-1 text-xs text-red-500">
                {{ formErrors.dataPath }}
              </p>
            </div>

            <!-- 样本物种 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                样本物种 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formSpecies"
                class="w-full cursor-pointer appearance-none rounded-lg border px-4 py-2.5 pr-10 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="[
                  formErrors.species ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
                  !formSpecies ? 'text-slate-400' : 'text-slate-900'
                ]"
                @change="formErrors.species && delete formErrors.species"
              >
                <option value="" disabled>请选择样本物种</option>
                <option
                  v-for="opt in speciesOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="formErrors.species" class="mt-1 text-xs text-red-500">
                {{ formErrors.species }}
              </p>
            </div>

            <!-- 项目描述 -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">
                项目描述
                <span class="text-xs font-normal text-slate-400">（可选）</span>
              </label>
              <textarea
                v-model="formDescription"
                rows="3"
                maxlength="200"
                placeholder="简要描述项目目的或备注信息"
                class="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <div class="mt-1 text-right">
                <span class="text-xs text-slate-400">
                  {{ formDescription.length }}/200
                </span>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div
            class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4"
          >
            <button
              @click="showCreateModal = false"
              class="cursor-pointer rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
            <button
              @click="handleCreate"
              :disabled="creating"
              class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
              {{ creating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
    <!-- 登录弹窗 -->
    <AuthModal
      :is-open="showAuthModal"
      redirect-path="/pipeline"
      @close="showAuthModal = false"
    />
  </div>
</template>

<style scoped>
/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.modal-leave-to > div:last-child {
  opacity: 0;
  transform: scale(0.95);
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* select 下拉箭头 */
select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.5em 1.5em;
}
</style>
