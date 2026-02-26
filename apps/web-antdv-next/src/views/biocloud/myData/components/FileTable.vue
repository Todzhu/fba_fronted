<script setup lang="ts">
import { Table, Tooltip, Dropdown, Menu } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { FileItem } from '../mock';
import { computed } from 'vue';
import type { Key } from 'ant-design-vue/es/table/interface';

interface Props {
  files: FileItem[];
  loading?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['selection-change', 'download', 'delete', 'enter', 'rename', 'move', 'preview']);

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
    align: 'center',
  },
];

const getFileIcon = (type: string, icon?: string) => {
  if (type === 'folder') return 'ant-design:folder-outlined';
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
    default: return '#8c8c8c';
  }
}

const rowSelection = computed(() => ({
  onChange: (selectedRowKeys: Key[], selectedRows: FileItem[]) => {
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
    :pagination="{ pageSize: 10 }"
    row-key="id"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'name'">
        <div 
            class="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition-colors"
            @click="record.type === 'folder' ? emit('enter', record) : emit('preview', record)"
        >
          <IconifyIcon 
            :icon="getFileIcon(record.type, record.icon)" 
            class="text-lg"
            :style="{ color: record.type === 'folder' ? '#faad14' : getIconColor(record.icon) }" 
          />
          <span class="font-medium">{{ record.name }}</span>
        </div>
      </template>
      
      <template v-if="column.key === 'action'">
        <div class="flex justify-center items-center gap-1">
            <Tooltip title="下载">
              <div 
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer transition-colors text-gray-500 hover:text-blue-600"
                @click.stop="emit('download', record)"
              >
                <IconifyIcon icon="ant-design:download-outlined" class="text-lg" />
              </div>
            </Tooltip>
            
            <Tooltip title="删除">
              <div 
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 cursor-pointer transition-colors text-gray-500 hover:text-red-600"
                @click.stop="emit('delete', record)"
              >
                <IconifyIcon icon="ant-design:delete-outlined" class="text-lg" />
              </div>
            </Tooltip>

            <Dropdown trigger="click">
                <div 
                    class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer transition-colors text-gray-500 hover:text-gray-700"
                    @click.stop
                >
                    <IconifyIcon icon="ant-design:more-outlined" class="text-lg font-bold" />
                </div>
                <template #overlay>
                    <Menu>
                        <Menu.Item @click="record.type === 'folder' ? emit('enter', record) : emit('preview', record)">
                            <div class="flex items-center gap-2 min-w-[100px]">
                                <IconifyIcon :icon="record.type === 'folder' ? 'ant-design:folder-open-outlined' : 'ant-design:eye-outlined'" /> {{ record.type === 'folder' ? '打开' : '预览' }}
                            </div>
                        </Menu.Item>
                        <Menu.Item @click="emit('download', record)">
                            <div class="flex items-center gap-2">
                                <IconifyIcon icon="ant-design:download-outlined" /> 下载
                            </div>
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item @click="emit('rename', record)">
                            <div class="flex items-center gap-2">
                                <IconifyIcon icon="ant-design:edit-outlined" /> 重命名
                            </div>
                        </Menu.Item>
                        <Menu.Item @click="emit('move', record)">
                            <div class="flex items-center gap-2">
                                <IconifyIcon icon="ant-design:export-outlined" /> 移动到
                            </div>
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item danger @click="emit('delete', record)">
                            <div class="flex items-center gap-2">
                                <IconifyIcon icon="ant-design:delete-outlined" /> 删除
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
