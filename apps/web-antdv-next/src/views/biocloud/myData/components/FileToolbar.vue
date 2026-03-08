<script setup lang="ts">
import { Input, Button } from 'ant-design-vue';
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
  <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
    <!-- 左侧：搜索 + 视图切换 -->
    <div class="flex items-center gap-4">
      <Input.Search
        v-model:value="searchValue"
        placeholder="搜索文件..."
        allow-clear
        class="w-64 file-search"
        @search="onSearch"
      />
      <div class="bg-slate-100 p-1 rounded-lg flex items-center">
          <div 
            class="px-3 py-1.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-sm select-none"
            :class="viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'"
            @click="onViewChange('list')"
          >
             <IconifyIcon icon="ant-design:bars-outlined" /> 列表
          </div>
          <div 
            class="px-3 py-1.5 rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-sm select-none"
            :class="viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'"
            @click="onViewChange('grid')"
          >
             <IconifyIcon icon="ant-design:appstore-outlined" /> 网格
          </div>
      </div>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-3">
        <span v-if="selectedCount > 0" class="text-slate-500 text-sm mr-1">
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
        <div v-if="selectedCount > 0" class="h-6 w-px bg-slate-200 mx-1"></div>
        <Button class="!rounded-lg !border-slate-200 !text-slate-700 hover:!border-blue-300 hover:!text-blue-600" @click="emit('new-folder')">
            <template #icon><IconifyIcon icon="ant-design:folder-add-outlined" /></template>
            新建文件夹
        </Button>
        <Button type="primary" class="!rounded-lg !shadow-sm" @click="emit('upload')">
            <template #icon><IconifyIcon icon="ant-design:cloud-upload-outlined" /></template>
            上传
        </Button>
    </div>
  </div>
</template>

<style scoped>
/* 搜索框样式统一 */
:deep(.file-search .ant-input-search) {
  border-radius: 10px !important;
}

:deep(.file-search .ant-input) {
  border-radius: 10px !important;
}

:deep(.file-search .ant-input-group-addon) {
  border-radius: 0 10px 10px 0 !important;
}

:deep(.file-search .ant-btn) {
  border-radius: 0 10px 10px 0 !important;
}
</style>
