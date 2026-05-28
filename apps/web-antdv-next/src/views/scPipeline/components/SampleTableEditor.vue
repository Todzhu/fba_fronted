<script lang="ts" setup>
/**
 * SampleTableEditor - 样本信息可编辑表格
 * 支持编辑样本名称、分组和启用状态
 */
import type { SampleInfo } from '../mock/myDataMock';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Button,
  Checkbox,
  Input,
  message,
  Space,
  Table,
  Tooltip,
} from 'antdv-next';

const props = defineProps<{
  modelValue: SampleInfo[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: SampleInfo[]): void;
}>();

// 本地数据副本
const samples = ref<SampleInfo[]>([]);

// 同步外部数据
watch(
  () => props.modelValue,
  (newVal) => {
    samples.value = newVal.map((s) => ({ ...s }));
  },
  { immediate: true, deep: true },
);

// 更新单个样本
const updateSample = (index: number, field: keyof SampleInfo, value: any) => {
  const sample = samples.value[index];
  if (!sample) return;
  samples.value[index] = { ...sample, [field]: value };
  emitChange();
};

// 发送变更
const emitChange = () => {
  emit('update:modelValue', [...samples.value]);
};

// 全选/取消全选
const allEnabled = computed({
  get: () => samples.value.every((s) => s.enabled),
  set: (val: boolean) => {
    samples.value.forEach((s) => (s.enabled = val));
    emitChange();
  },
});

// 快速填充：按前缀分组
const autoGroupByPrefix = () => {
  samples.value.forEach((sample) => {
    // 提取下划线或连字符前的部分作为分组
    const match = sample.folderName.match(/^([a-zA-Z]+)/);
    if (match) {
      sample.group = match[1] || '';
    }
  });
  emitChange();
  message.success('已按前缀自动分组');
};

// 表格列定义
const columns = [
  {
    title: '启用',
    dataIndex: 'enabled',
    key: 'enabled',
    width: 44,
    align: 'center' as const,
  },
  {
    title: '文件夹名称',
    dataIndex: 'folderName',
    key: 'folderName',
    width: 104,
  },
  {
    title: '样本名称',
    dataIndex: 'sampleName',
    key: 'sampleName',
    width: 110,
  },
  {
    title: '分组',
    dataIndex: 'group',
    key: 'group',
    width: 110,
  },
];
</script>

<template>
  <div class="sample-table-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <Space>
        <Tooltip title="根据文件夹名称前缀自动分组">
          <Button size="small" @click="autoGroupByPrefix">
            <Icon icon="mdi:auto-fix" />
            按前缀分组
          </Button>
        </Tooltip>
      </Space>

      <div class="sample-count">
        共 {{ samples.length }} 个样本，
        已启用 {{ samples.filter((s) => s.enabled).length }} 个
      </div>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="samples"
      :pagination="false"
      :scroll="{ x: 368, y: 260 }"
      table-layout="fixed"
      row-key="folderName"
      size="small"
      bordered
      class="sample-table"
    >
      <!-- 启用列 -->
      <template #headerCell="{ column }">
        <template v-if="column.key === 'enabled'">
          <Checkbox v-model:checked="allEnabled" />
        </template>
        <template v-else>{{ column.title }}</template>
      </template>

      <template #bodyCell="{ column, record, index }">
        <!-- 启用 -->
        <template v-if="column.key === 'enabled'">
          <Checkbox
            :checked="record.enabled"
            @change="(e: any) => updateSample(index, 'enabled', e.target.checked)"
          />
        </template>

        <!-- 文件夹名称（只读） -->
        <template v-else-if="column.key === 'folderName'">
          <span class="folder-name">
            <Icon icon="mdi:folder" class="folder-icon" />
            {{ record.folderName }}
          </span>
        </template>

        <!-- 样本名称（可编辑） -->
        <template v-else-if="column.key === 'sampleName'">
          <Input
            :value="record.sampleName"
            class="sample-input"
            size="small"
            @change="(e: any) => updateSample(index, 'sampleName', e.target.value)"
          />
        </template>

        <!-- 分组（可编辑） -->
        <template v-else-if="column.key === 'group'">
          <Input
            :value="record.group"
            class="sample-input"
            size="small"
            placeholder="输入分组"
            @change="(e: any) => updateSample(index, 'group', e.target.value)"
          />
        </template>
      </template>
    </Table>
  </div>
</template>

<style scoped>
.sample-table-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sample-count {
  flex-shrink: 0;
  font-size: 13px;
  color: #595959;
}

.folder-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: #595959;
}

.folder-name :deep(svg) {
  flex-shrink: 0;
}

.folder-icon {
  color: #faad14;
}

.sample-input {
  width: 100%;
}

:deep(.sample-table) {
  max-width: 100%;
  overflow: auto hidden;
  border-radius: 8px;
}

:deep(.ant-table) {
  font-size: 13px;
  background: #fff;
}

:deep(.ant-table-thead > tr > th) {
  padding: 9px 6px !important;
  font-weight: 600;
  color: #262626;
  background: #fafafa !important;
}

:deep(.ant-table-cell) {
  padding: 7px 6px !important;
  vertical-align: middle;
}

:deep(.ant-table-cell .ant-input) {
  height: 28px;
  padding: 2px 6px;
  font-size: 13px;
  border-color: #d9d9d9;
  border-radius: 6px;
}

:deep(.ant-table-cell .ant-input:focus) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.08);
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fbff !important;
}

:deep(.ant-table-tbody > tr > td) {
  border-color: #f0f0f0;
}

:deep(.ant-table-body) {
  overflow-x: hidden !important;
}

:deep(.ant-table-content) {
  overflow-x: hidden !important;
}
</style>
