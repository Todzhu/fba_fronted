<script lang="ts" setup>
/**
 * DataFileSelector - Hiplot 风格数据文件选择器
 *
 * 功能：
 * - 可编辑电子表格（带工具栏）
 * - 文件导入/清空/模式切换
 * - 示例数据加载
 */
import { ref } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, Input, message, Space, Upload } from 'ant-design-vue';

import SpreadsheetPreview from './SpreadsheetPreview.vue';

interface FileConfig {
  key: string;
  label?: string;
  required?: boolean;
  extensions?: string[];
  description?: string;
}

interface InputSchema {
  files?: FileConfig[];
}

const props = defineProps<{
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, null | number>): void;
  (e: 'nextStep'): void;
}>();

// 表格数据
const tableData = ref<string[][]>([]);
const fileName = ref<string>('');
const spreadsheetRef = ref<InstanceType<typeof SpreadsheetPreview>>();

// 示例数据
const EXAMPLE_DATA: string[][] = [
  ['Symbol', 'logFC', 'P.Value'],
  ['CPA1', '-2.26167392', '0.033757914'],
  ['DNASE1L3', '-2.09717274', '1.65E-17'],
  ['SLC4A10', '-1.97923271', '5.77E-10'],
  ['AC006369.2', '-1.88358912', '3.64E-12'],
  ['SNAP25', '-1.77576314', '4.90E-10'],
  ['TMEM132C', '-1.69531470', '7.80E-10'],
  ['DCX', '-1.63279422', '3.16E-09'],
  ['FCRL2', '-1.58297783', '6.03E-06'],
  ['NRG2', '-1.53649556', '1.69E-15'],
  ['ASPA', '-1.49621648', '1.53E-15'],
  ['SIT1', '-1.44991978', '1.84E-09'],
  ['GPR174', '-1.40693860', '8.15E-09'],
  ['DLGAP3', '-1.36991823', '9.92E-12'],
  ['CUZD1', '-1.3450764', '0.023805989'],
  ['EPB41L3', '-1.31928786', '3.07E-17'],
  ['CCR5', '-1.29396276', '1.89E-09'],
  ['SNCB', '-1.27339696', '1.35E-05'],
  ['SCIMP', '-1.25222960', '2.49E-10'],
  ['HHATL', '-1.23576815', '4.06E-05'],
];

// 加载示例数据
const loadExample = () => {
  tableData.value = EXAMPLE_DATA;
  fileName.value = 'example_data.csv';
  message.success('示例数据已加载');

  // 更新 modelValue
  updateFileId('data', Date.now());
};

// 下载示例数据
const downloadExample = () => {
  const csvContent = EXAMPLE_DATA.map((row) => row.join('\t')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'example_data.csv';
  link.click();
  message.success('示例数据已下载');
};

// 导入文件
const handleImport = async (file: File) => {
  const content = await file.text();
  const lines = content.split('\n').filter((line) => line.trim());
  const data = lines.map((line) => line.split(/[,\t]/));

  tableData.value = data;
  fileName.value = file.name;
  updateFileId('data', Date.now());
  message.success(`${file.name} 导入成功`);
  return false; // 阻止默认上传
};

// 清空表格
const handleClear = () => {
  tableData.value = [];
  fileName.value = '';
  spreadsheetRef.value?.clearData();
  updateFileId('data', null);
  message.info('数据已清空');
};

// 更新文件 ID
const updateFileId = (key: string, fileId: null | number) => {
  emit('update:modelValue', { ...props.modelValue, [key]: fileId });
};

// 表格数据变化
const handleDataChange = (data: string[][]) => {
  tableData.value = data;
  if (data.length > 0) {
    updateFileId('data', Date.now());
  }
};

// 下一步
const goNext = () => {
  emit('nextStep');
};

// 暴露方法
const fillAllExamples = () => {
  loadExample();
};

defineExpose({ fillAllExamples });
</script>

<template>
  <div class="data-file-selector">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <Space>
        <Button type="primary" @click="loadExample">示 例</Button>
        <Button @click="downloadExample">下载示例 数据表</Button>
      </Space>
    </div>

    <!-- 文件输入行 -->
    <div
      v-for="file in schema?.files ?? [
        { key: 'data', label: '数据表', required: true },
      ]"
      :key="file.key"
      class="file-input-row"
    >
      <label class="input-label">
        <span v-if="file.required" class="required">*</span>
        {{ file.label || '数据表' }}：
      </label>

      <Input
        :value="fileName || '请编辑下方表格'"
        readonly
        class="filename-input"
        placeholder="请编辑下方表格"
      />

      <div class="action-buttons">
        <Upload
          :show-upload-list="false"
          :before-upload="handleImport"
          accept=".csv,.txt,.tsv"
        >
          <Button type="primary" class="btn-import">导 入</Button>
        </Upload>
        <Button danger class="btn-clear" @click="handleClear">清 空</Button>
      </div>
    </div>

    <!-- 数据表 Tab 标题 -->
    <div class="table-tab">
      <span class="tab-item active">数据表</span>
    </div>

    <!-- 可编辑电子表格 -->
    <div class="spreadsheet-area">
      <SpreadsheetPreview
        ref="spreadsheetRef"
        :data="tableData"
        :show-toolbar="true"
        @change="handleDataChange"
      />
    </div>

    <!-- 底部提示 + 下一步 -->
    <div class="footer">
      <div class="hint">
        <Icon icon="mdi:information-outline" class="hint-icon" />
        <span>
          对于较大的数据文件，在线编辑可能会导致卡顿，请切换到文件模式；在文件模式下，表格不可编辑且仅展示1000行；超过100M的文件请先上传到云盘
        </span>
      </div>
      <Button type="primary" class="btn-next" @click="goNext">下一步</Button>
    </div>
  </div>
</template>

<style scoped>
.data-file-selector {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* 顶部工具栏 */
.toolbar {
  margin-bottom: 8px;
}

/* 文件输入行 */
.file-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input-label {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 70px;
  font-size: 14px;
  color: #1e293b;
  white-space: nowrap;
}

.required {
  color: #ef4444;
}

.filename-input {
  flex: 1;
  max-width: 280px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-import {
  min-width: 64px;
}

.btn-clear {
  min-width: 64px;
}

/* 数据表 Tab */
.table-tab {
  margin-top: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.tab-item {
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
}

.tab-item.active {
  color: #09f;
  border-bottom: 2px solid #09f;
}

/* 电子表格区域 */
.spreadsheet-area {
  flex: 1;
  min-height: 200px;
}

/* 底部 */
.footer {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px dashed #e2e8f0;
}

.hint {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.5;
  color: #f59e0b;
}

.hint-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 14px;
}

.btn-next {
  min-width: 100px;
  height: 40px;
  font-size: 14px;
  border-radius: 8px;
}
</style>
