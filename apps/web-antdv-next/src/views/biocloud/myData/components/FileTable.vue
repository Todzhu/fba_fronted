<script setup lang="ts">
import { Table, Tooltip, Dropdown, Menu } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { FileItem } from '../mock';
import { computed } from 'vue';
import type { Key } from 'ant-design-vue/es/table/interface';

interface Props {
  files: FileItem[];
  loading?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentPage: 1,
  pageSize: 10,
  total: 0,
});
const emit = defineEmits(['selection-change', 'download', 'delete', 'enter', 'rename', 'move', 'preview', 'page-change']);

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    sorter: (a: FileItem, b: FileItem) => a.name.localeCompare(b.name),
    width: '40%',
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    sorter: (a: FileItem, b: FileItem) => parseFloat(a.size || '0') - parseFloat(b.size || '0'),
    width: '20%',
  },
  {
    title: '修改时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    sorter: (a: FileItem, b: FileItem) => new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime(),
    width: '25%',
  },
  {
    title: '操作',
    key: 'action',
    width: '15%',
    align: 'center' as const,
  },
];

const getFileIcon = (type: string, icon?: string) => {
  if (type === 'folder') return 'ant-design:folder-filled';
  switch (icon) {
    case 'image': return 'ant-design:file-image-outlined';
    case 'pdf': return 'ant-design:file-pdf-outlined';
    case 'excel': return 'ant-design:file-excel-outlined';
    case 'word': return 'ant-design:file-word-outlined';
    case 'markdown': return 'ant-design:file-markdown-outlined';
    case 'archive': return 'ant-design:file-zip-outlined';
    case 'audio': return 'ant-design:sound-outlined';
    case 'video': return 'ant-design:video-camera-outlined';
    case 'code': return 'ant-design:code-outlined';
    case 'data': return 'ant-design:database-outlined';
    case 'rdata': return 'ant-design:experiment-outlined';
    case 'bio': return 'ant-design:deployment-unit-outlined';
    default: return 'ant-design:file-outlined';
  }
};

const getIconColor = (icon?: string) => {
  switch (icon) {
    case 'image': return '#ff4d4f';
    case 'pdf': return '#ff4d4f';
    case 'excel': return '#52c41a';
    case 'word': return '#1890ff';
    case 'markdown': return '#000000';
    case 'archive': return '#fa8c16';
    case 'audio': return '#faad14';
    case 'video': return '#722ed1';
    case 'code': return '#13c2c2';
    case 'data': return '#10b981';
    case 'rdata': return '#8b5cf6';
    case 'bio': return '#0ea5e9';
    default: return '#8c8c8c';
  }
}

// 服务端分页配置
const paginationConfig = computed(() => ({
  current: props.currentPage,
  pageSize: props.pageSize,
  total: props.total,
  showSizeChanger: false,
  onChange: (page: number, size: number) => {
    emit('page-change', page, size);
  },
}));

const rowSelection = computed(() => ({
  onChange: (_selectedRowKeys: Key[], selectedRows: FileItem[]) => {
    emit('selection-change', selectedRows);
  },
}));
</script>

<template>
  <Table
    :columns="columns"
    :data-source="files"
    :loading="loading"
    :row-selection="rowSelection"
    :scroll="{ x: 1000 }"
    :pagination="paginationConfig"
    row-key="id"
    class="file-table"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'name'">
        <div 
            class="flex items-center gap-3 cursor-pointer group py-1"
            @click="record.type === 'folder' ? emit('enter', record) : emit('preview', record)"
        >
          <!-- 文件/文件夹图标 -->
          <div 
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            :class="record.type === 'folder' ? 'bg-amber-50' : 'bg-slate-50'"
          >
            <IconifyIcon 
              :icon="getFileIcon(record.type, record.icon)" 
              class="text-xl"
              :style="{ color: record.type === 'folder' ? '#f59e0b' : getIconColor(record.icon) }" 
            />
          </div>
          <!-- 文件名 -->
          <span class="text-sm font-semibold text-slate-800 transition-colors group-hover:text-blue-600">
            {{ record.name }}
          </span>
        </div>
      </template>

      <!-- 大小列 -->
      <template v-if="column.key === 'size'">
        <span class="text-sm text-slate-500">{{ record.size }}</span>
      </template>

      <!-- 修改时间列 -->
      <template v-if="column.key === 'updateTime'">
        <span class="text-sm text-slate-500">{{ record.updateTime }}</span>
      </template>
      
      <template v-if="column.key === 'action'">
        <div class="flex justify-center items-center gap-1">
            <Tooltip title="下载">
              <div 
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer transition-colors text-slate-400 hover:text-blue-600"
                @click.stop="emit('download', record)"
              >
                <IconifyIcon icon="ant-design:download-outlined" class="text-base" />
              </div>
            </Tooltip>
            
            <Tooltip title="删除">
              <div 
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer transition-colors text-slate-400 hover:text-red-500"
                @click.stop="emit('delete', record)"
              >
                <IconifyIcon icon="ant-design:delete-outlined" class="text-base" />
              </div>
            </Tooltip>

            <Dropdown trigger="click">
                <div 
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer transition-colors text-slate-400 hover:text-slate-700"
                    @click.stop
                >
                    <IconifyIcon icon="ant-design:more-outlined" class="text-base font-bold" />
                </div>
                <template #overlay>
                    <Menu class="min-w-[140px]">
                        <Menu.Item @click="record.type === 'folder' ? emit('enter', record) : emit('preview', record)">
                            <div class="flex items-center gap-2.5 py-0.5">
                                <IconifyIcon :icon="record.type === 'folder' ? 'ant-design:folder-open-outlined' : 'ant-design:eye-outlined'" class="text-slate-500" /> 
                                <span>{{ record.type === 'folder' ? '打开' : '预览' }}</span>
                            </div>
                        </Menu.Item>
                        <Menu.Item @click="emit('download', record)">
                            <div class="flex items-center gap-2.5 py-0.5">
                                <IconifyIcon icon="ant-design:download-outlined" class="text-slate-500" /> 
                                <span>下载</span>
                            </div>
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item @click="emit('rename', record)">
                            <div class="flex items-center gap-2.5 py-0.5">
                                <IconifyIcon icon="ant-design:edit-outlined" class="text-slate-500" /> 
                                <span>重命名</span>
                            </div>
                        </Menu.Item>
                        <Menu.Item @click="emit('move', record)">
                            <div class="flex items-center gap-2.5 py-0.5">
                                <IconifyIcon icon="ant-design:export-outlined" class="text-slate-500" /> 
                                <span>移动到</span>
                            </div>
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item danger @click="emit('delete', record)">
                            <div class="flex items-center gap-2.5 py-0.5">
                                <IconifyIcon icon="ant-design:delete-outlined" /> 
                                <span>删除</span>
                            </div>
                        </Menu.Item>
                    </Menu>
                </template>
            </Dropdown>
        </div>
      </template>
    </template>
  </Table>
</template>

<style scoped>
/* 表头样式美化 */
:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
  font-size: 13px;
  color: #64748b;
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 14px 16px !important;
  letter-spacing: 0.02em;
  text-transform: none;
}

/* 表格行样式 */
:deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f5f9 !important;
  transition: background-color 0.15s;
}

/* hover 行高亮 */
:deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fafc !important;
}

/* 选中行样式 */
:deep(.ant-table-tbody > tr.ant-table-row-selected > td) {
  background: #eff6ff !important;
}

/* 分页器样式微调 */
:deep(.ant-pagination) {
  padding: 16px !important;
  margin: 0 !important;
}

:deep(.ant-pagination .ant-pagination-item-active) {
  border-color: #3b82f6 !important;
}

:deep(.ant-pagination .ant-pagination-item-active a) {
  color: #3b82f6 !important;
}

/* 复选框颜色统一 */
:deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background-color: #3b82f6 !important;
  border-color: #3b82f6 !important;
}
</style>
