<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Modal, Tree, message } from 'antdv-next';
import { IconifyIcon } from '@vben/icons';

import { syncWorkspaceFilesToCloud } from '#/api/bioclaw';
import { getMyDataFiles } from '#/api/my-data';

interface Props {
  open: boolean;
  projectId: number;
  files: { id: string; name: string }[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:open', 'success']);

const loading = ref(false);
const saving = ref(false);
const folders = ref<any[]>([]);

const selectedKeys = ref<string[]>([]);
const expandedKeys = ref<string[]>(['root']);

// Fetch folders for tree
const loadFolders = async () => {
  loading.value = true;
  try {
    const res = await getMyDataFiles({});
    folders.value = res.items.filter((item: any) => item.type === 'folder');
  } catch (error) {
    console.error('Failed to load folders', error);
  } finally {
    loading.value = false;
  }
};

watch(() => props.open, (val) => {
  if (val) {
    selectedKeys.value = ['root'];
    loadFolders();
  }
});

const folderTreeData = computed<any[]>(() => {
  const buildTree = (parentId: null | number): any[] => {
    return folders.value
      .filter((f) => f.parent_id === parentId)
      .map((f) => ({
        title: f.name,
        key: String(f.id),
        children: buildTree(f.id),
      }));
  };

  return [
    {
      title: '我的数据 (根目录)',
      key: 'root',
      children: buildTree(null),
    },
  ];
});

const onSelect = (keys: any[]) => {
  selectedKeys.value = keys;
};

const handleOk = async () => {
  if (selectedKeys.value.length === 0) return;
  const targetIdStr = selectedKeys.value[0];
  const targetParentId = targetIdStr === 'root' ? null : Number(targetIdStr);
  const filePaths = props.files.map(f => f.name);

  saving.value = true;
  try {
    await syncWorkspaceFilesToCloud(props.projectId, filePaths, targetParentId);
    message.success(`成功将 ${filePaths.length} 个分析成果导入到云盘！`);
    emit('success');
    emit('update:open', false);
  } catch (error: any) {
    message.error(error.message || '导入到云盘失败');
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  emit('update:open', false);
};
</script>

<template>
  <Modal
    :open="open"
    title="选择云盘归档目录"
    @ok="handleOk"
    @cancel="handleCancel"
    :confirmLoading="saving"
    :okButtonProps="{ disabled: selectedKeys.length === 0 }"
    width="500px"
  >
    <div class="mb-4 p-3 bg-blue-50 text-blue-800 rounded">
      准备将 <b>{{ files.length }}</b> 个项目产出文件永久固化到个人的云大盘。
    </div>
    
    <div class="max-h-[300px] overflow-y-auto border rounded p-2">
      <div v-if="loading" class="text-center py-4 text-gray-500">
        加载云盘结构中...
      </div>
      <Tree
        v-else
        v-model:selectedKeys="selectedKeys"
        v-model:expandedKeys="expandedKeys"
        :tree-data="folderTreeData"
        block-node
        @select="onSelect"
      >
        <template #title="node">
          <span class="flex items-center gap-2">
            <IconifyIcon icon="ant-design:folder-filled" class="text-yellow-400" />
            {{ node.title }}
          </span>
        </template>
      </Tree>
    </div>
  </Modal>
</template>
