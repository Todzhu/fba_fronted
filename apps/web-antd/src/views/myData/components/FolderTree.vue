<script setup lang="ts">
import { ref } from 'vue';
import { Tree } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { Folder } from '../mock';

interface Props {
  folders: Folder[];
}

const props = defineProps<Props>();
const emit = defineEmits(['select']);

const expandedKeys = ref<string[]>(['1']);
const selectedKeys = ref<string[]>(['1']);

const onSelect = (keys: string[], info: any) => {
  if (keys.length > 0) {
    emit('select', info.node.dataRef);
  }
};
</script>

<template>
  <div class="folder-tree-container h-full p-4 border-r border-gray-200 bg-white">
    <Tree
      v-model:expandedKeys="expandedKeys"
      v-model:selectedKeys="selectedKeys"
      :tree-data="folders"
      :field-names="{ children: 'children', title: 'name', key: 'id' }"
      block-node
      @select="onSelect"
    >
      <template #title="{ name }">
        <span class="folder-title">{{ name }}</span>
      </template>
      <template #switcherIcon>
        <IconifyIcon icon="ant-design:folder-outlined" />
      </template>
      <template #icon="{ expanded }">
          <IconifyIcon :icon="expanded ? 'ant-design:folder-open-outlined' : 'ant-design:folder-outlined'" />
      </template>
    </Tree>
  </div>
</template>

<style scoped>
.folder-tree-container {
  min-width: 240px;
}
:deep(.ant-tree-node-content-wrapper) {
  transition: all 0.3s;
}
:deep(.ant-tree-node-selected) {
  background-color: #e6f7ff !important;
  font-weight: 500;
}
</style>
