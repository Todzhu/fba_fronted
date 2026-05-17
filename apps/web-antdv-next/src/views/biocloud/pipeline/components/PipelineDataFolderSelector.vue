<script setup lang="ts">
import type { FileNode } from '#/api/pipeline';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
} from 'lucide-vue-next';

import { getFolderChildrenAsNodes, getMyDataTree } from '#/api/pipeline';

const props = withDefaults(
  defineProps<{
    error?: string;
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    error: '',
    modelValue: '',
    placeholder: '从"我的数据"选择数据文件夹',
  },
);

const emit = defineEmits<{
  selected: [node: FileNode];
  'update:modelValue': [value: string];
}>();

const treeData = ref<FileNode[]>([]);
const expandedKeys = ref<Set<string>>(new Set());
const loadingKeys = ref<Set<string>>(new Set());
const loadingTree = ref(false);
const loadError = ref('');
const open = ref(false);

const isFileNode = (node: FileNode) => node.isLeaf || node.type === 'file';

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

const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
};

const selectedNode = computed(() => {
  if (!props.modelValue) return null;
  return findNodeByPath(treeData.value, props.modelValue);
});

const selectedLabel = computed(() => {
  if (selectedNode.value) return selectedNode.value.title;
  if (!props.modelValue) return '';
  const parts = props.modelValue.split('/');
  return parts[parts.length - 1] || props.modelValue;
});

const loadDataTree = async () => {
  loadingTree.value = true;
  loadError.value = '';
  try {
    const data = await getMyDataTree();
    treeData.value = data;
    expandedKeys.value = new Set(data.map((node) => node.key));
  } catch {
    loadError.value = '数据目录加载失败';
  } finally {
    loadingTree.value = false;
  }
};

const toggleExpand = async (node: FileNode) => {
  if (isFileNode(node)) return;

  if (expandedKeys.value.has(node.key)) {
    expandedKeys.value.delete(node.key);
    return;
  }

  const target = findNodeByKey(treeData.value, node.key);
  if (target && !target.children) {
    loadingKeys.value.add(node.key);
    try {
      const children = await getFolderChildrenAsNodes(target.path);
      target.children = children.length > 0 ? children : [];
    } catch {
      target.children = [];
    } finally {
      loadingKeys.value.delete(node.key);
    }
  }

  expandedKeys.value.add(node.key);
};

const selectNode = (node: FileNode) => {
  if (isFileNode(node)) return;
  emit('update:modelValue', node.path);
  emit('selected', node);
  open.value = false;
};

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.pipeline-folder-selector')) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  loadDataTree();
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<template>
  <div class="pipeline-folder-selector relative">
    <button
      type="button"
      class="flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors"
      :class="
        error
          ? 'border-red-300 bg-red-50'
          : open
            ? 'border-blue-500 bg-white ring-2 ring-blue-500/20'
            : 'border-slate-200 bg-white hover:border-slate-300'
      "
      @click.stop="open = !open"
    >
      <span v-if="modelValue" class="min-w-0 flex items-center gap-2">
        <Folder class="h-4 w-4 shrink-0 text-blue-500" />
        <span class="truncate font-medium text-slate-900">
          {{ selectedLabel }}
        </span>
        <span class="truncate text-xs text-slate-400">
          {{ modelValue }}
        </span>
      </span>
      <span v-else class="text-slate-400">{{ placeholder }}</span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-slate-400 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      >
        <div
          v-if="loadingTree"
          class="flex items-center justify-center py-6 text-sm text-slate-500"
        >
          <Loader2 class="mr-2 h-4 w-4 animate-spin text-blue-500" />
          加载中...
        </div>

        <div
          v-else-if="loadError"
          class="flex flex-col items-center justify-center gap-3 py-6 text-sm text-slate-500"
        >
          <span>{{ loadError }}</span>
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            @click.stop="loadDataTree"
          >
            <RefreshCw class="h-3.5 w-3.5" />
            重新加载
          </button>
        </div>

        <div v-else-if="treeData.length === 0" class="px-4 py-6 text-center text-sm text-slate-400">
          暂无数据目录
        </div>

        <template v-else>
          <template v-for="node in treeData" :key="node.key">
            <div
              class="group flex items-center gap-1 px-3 py-1.5 transition-colors hover:bg-slate-50"
              :class="{ 'bg-blue-50': modelValue === node.path }"
            >
              <button
                type="button"
                class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center"
                @click.stop="toggleExpand(node)"
              >
                <Loader2
                  v-if="loadingKeys.has(node.key)"
                  class="h-3.5 w-3.5 animate-spin text-blue-400"
                />
                <ChevronRight
                  v-else
                  class="h-3.5 w-3.5 text-slate-400 transition-transform"
                  :class="{ 'rotate-90': expandedKeys.has(node.key) }"
                />
              </button>
              <button
                type="button"
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                @click.stop="toggleExpand(node)"
              >
                <component
                  :is="expandedKeys.has(node.key) ? FolderOpen : Folder"
                  class="h-4 w-4 shrink-0 text-amber-500"
                />
                <span class="truncate text-sm text-slate-700">{{ node.title }}</span>
              </button>
              <button
                v-if="node.key !== 'root'"
                type="button"
                class="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                :class="{ '!opacity-100 bg-blue-50': modelValue === node.path }"
                @click.stop="selectNode(node)"
              >
                {{ modelValue === node.path ? '已选' : '选择' }}
              </button>
            </div>

            <template v-if="node.children && expandedKeys.has(node.key)">
              <template v-for="child in node.children" :key="child.key">
                <div
                  class="group flex items-center gap-1 py-1.5 pl-8 pr-3 transition-colors"
                  :class="[
                    modelValue === child.path ? 'bg-blue-50' : '',
                    isFileNode(child)
                      ? 'text-slate-400'
                      : 'cursor-pointer hover:bg-slate-50',
                  ]"
                >
                  <button
                    v-if="!isFileNode(child)"
                    type="button"
                    class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center"
                    @click.stop="toggleExpand(child)"
                  >
                    <Loader2
                      v-if="loadingKeys.has(child.key)"
                      class="h-3.5 w-3.5 animate-spin text-blue-400"
                    />
                    <ChevronRight
                      v-else
                      class="h-3.5 w-3.5 text-slate-400 transition-transform"
                      :class="{ 'rotate-90': expandedKeys.has(child.key) }"
                    />
                  </button>
                  <span v-else class="h-4 w-4 shrink-0"></span>
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-2 text-left"
                    :class="isFileNode(child) ? 'cursor-default' : 'cursor-pointer'"
                    @click.stop="toggleExpand(child)"
                  >
                    <component
                      :is="
                        isFileNode(child)
                          ? File
                          : expandedKeys.has(child.key)
                            ? FolderOpen
                            : Folder
                      "
                      class="h-4 w-4 shrink-0"
                      :class="isFileNode(child) ? 'text-slate-400' : 'text-amber-500'"
                    />
                    <span class="truncate text-sm">{{ child.title }}</span>
                  </button>
                  <button
                    v-if="!isFileNode(child)"
                    type="button"
                    class="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                    :class="{ '!opacity-100 bg-blue-50': modelValue === child.path }"
                    @click.stop="selectNode(child)"
                  >
                    {{ modelValue === child.path ? '已选' : '选择' }}
                  </button>
                </div>

                <template v-if="child.children && expandedKeys.has(child.key)">
                  <div
                    v-for="leaf in child.children"
                    :key="leaf.key"
                    class="group flex items-center gap-2 py-1.5 pl-14 pr-3 transition-colors"
                    :class="[
                      modelValue === leaf.path ? 'bg-blue-50' : '',
                      isFileNode(leaf)
                        ? 'text-slate-400'
                        : 'cursor-pointer hover:bg-slate-50',
                    ]"
                    @click="!isFileNode(leaf) && toggleExpand(leaf)"
                  >
                    <component
                      :is="isFileNode(leaf) ? File : Folder"
                      class="h-4 w-4 shrink-0"
                      :class="isFileNode(leaf) ? 'text-slate-400' : 'text-amber-500'"
                    />
                    <span class="min-w-0 flex-1 truncate text-sm">{{ leaf.title }}</span>
                    <button
                      v-if="!isFileNode(leaf)"
                      type="button"
                      class="ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:bg-blue-50 group-hover:opacity-100"
                      :class="{ '!opacity-100 bg-blue-50': modelValue === leaf.path }"
                      @click.stop="selectNode(leaf)"
                    >
                      {{ modelValue === leaf.path ? '已选' : '选择' }}
                    </button>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
