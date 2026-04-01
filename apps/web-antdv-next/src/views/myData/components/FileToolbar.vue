<script setup lang="ts">
import { Input, Button, Tooltip } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { ref } from 'vue';

defineProps<{
  selectedCount: number;
}>();

const emit = defineEmits(['search', 'view-change', 'upload', 'new-folder', 'batch-delete']);

const searchValue = ref('');
const viewMode = ref('list');

const onSearch = () => {
  emit('search', searchValue.value);
};

const onViewChange = (value: string) => {
  viewMode.value = value;
  emit('view-change', value);
};
</script>

<template>
  <div class="flex justify-between items-center mb-4 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
    <!-- Left: Search & View Mode -->
    <div class="flex items-center gap-4">
      <Input.Search
        v-model:value="searchValue"
        placeholder="搜索文件..."
        allow-clear
        class="w-64"
        @search="onSearch"
      />
      <div class="bg-gray-100 p-1 rounded-lg flex items-center">
          <div 
            class="px-3 py-1 rounded cursor-pointer transition-all flex items-center gap-1 text-sm select-none"
            :class="viewMode === 'list' ? 'bg-white text-blue-500 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="onViewChange('list')"
          >
             <IconifyIcon icon="ant-design:bars-outlined" /> 列表
          </div>
          <div 
            class="px-3 py-1 rounded cursor-pointer transition-all flex items-center gap-1 text-sm select-none"
            :class="viewMode === 'grid' ? 'bg-white text-blue-500 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="onViewChange('grid')"
          >
             <IconifyIcon icon="ant-design:appstore-outlined" /> 网格
          </div>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-3">
        <span v-if="selectedCount > 0" class="text-gray-500 text-sm mr-2">
            已选 {{ selectedCount }} 项
        </span>
        <Button 
            v-if="selectedCount > 0" 
            danger 
            type="text" 
            @click="emit('batch-delete')"
        >
            <template #icon><IconifyIcon icon="ant-design:delete-outlined" /></template>
            批量删除
        </Button>
        <div class="h-6 w-px bg-gray-200 mx-1"></div>
        <Button @click="emit('new-folder')">
            <template #icon><IconifyIcon icon="ant-design:folder-add-outlined" /></template>
            新建文件夹
        </Button>
        <Button type="primary" @click="emit('upload')">
            <template #icon><IconifyIcon icon="ant-design:cloud-upload-outlined" /></template>
            上传
        </Button>
    </div>
  </div>
</template>
