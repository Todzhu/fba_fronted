<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal, Tree } from 'ant-design-vue';
import type { DataNode } from 'ant-design-vue/es/tree';

interface Props {
  open: boolean;
  treeData: DataNode[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'ok']);

const selectedKeys = ref<string[]>([]);
const autoExpandParent = ref<boolean>(true);
const expandedKeys = ref<string[]>([]);

watch(() => props.open, (val) => {
  if (val) {
    selectedKeys.value = [];
    expandedKeys.value = [];
  }
});

const onSelect = (keys: string[]) => {
  selectedKeys.value = keys;
};

const handleOk = () => {
  if (selectedKeys.value.length === 0) return;
  emit('ok', selectedKeys.value[0]);
  emit('update:open', false);
};

const handleCancel = () => {
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    title="移动到"
    @ok="handleOk"
    @cancel="handleCancel"
    :okButtonProps="{ disabled: selectedKeys.length === 0 }"
  >
    <div class="max-h-[400px] overflow-y-auto">
        <Tree
            v-if="treeData.length"
            v-model:selectedKeys="selectedKeys"
            v-model:expandedKeys="expandedKeys"
            :tree-data="treeData"
            :auto-expand-parent="autoExpandParent"
            block-node
            default-expand-all
            @select="onSelect"
        >
            <template #title="{ title }">
                 <span>{{ title }}</span>
            </template>
        </Tree>
        <div v-else class="text-gray-400 text-center py-4">
            无可用文件夹
        </div>
    </div>
  </Modal>
</template>
