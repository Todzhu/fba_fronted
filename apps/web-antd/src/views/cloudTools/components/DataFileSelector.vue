<script lang="ts" setup>
/**
 * DataFileSelector - Hiplot 风格数据文件选择器
 *
 * 功能：
 * - 多文件 Tab 支持（根据 input_schema.files 动态生成）
 * - 可编辑电子表格（带工具栏）
 * - 文件导入/清空/模式切换
 * - 示例数据按 key 匹配加载
 */
import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, Input, message, Space, Tabs, Upload } from 'ant-design-vue';

import { baseRequestClient } from '../../../api/request';

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

// 示例数据配置接口
interface ExampleDataConfig {
  key: string;
  name: string;
  url: string;
  description?: string;
}

const props = defineProps<{
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
  exampleData?: ExampleDataConfig[] | null; // 后端配置的示例数据
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, null | number>): void;
  (e: 'nextStep'): void;
  (e: 'headers-change', headers: Record<string, string[]>): void;
}>();

// 文件配置列表 - 优先使用 example_data 生成 Tab，否则使用 input_schema.files
const fileConfigs = computed<FileConfig[]>(() => {
  const examples = props.exampleData;
  
  // 如果有示例数据配置，以示例数据生成 Tab
  if (examples && examples.length > 0) {
    return examples.map(e => ({
      key: e.key,
      label: e.name || e.key,
      required: false,
    }));
  }
  
  // 否则使用 input_schema.files
  return props.schema?.files ?? [{ key: 'data', label: '数据表', required: true }];
});

// 当前激活的 Tab
const activeTab = ref<string>('');

// 初始化激活 Tab
watch(fileConfigs, (configs) => {
  if (configs.length > 0 && !activeTab.value) {
    activeTab.value = configs[0]!.key;
  }
}, { immediate: true });

// 每个文件的表格数据和状态
const fileDataMap = ref<Record<string, {
  data: string[][];
  fileName: string;
  loading: boolean;
}>>({});

// 初始化文件数据
watch(fileConfigs, (configs) => {
  for (const config of configs) {
    if (!fileDataMap.value[config.key]) {
      fileDataMap.value[config.key] = {
        data: [],
        fileName: '',
        loading: false,
      };
    }
  }
}, { immediate: true });

// 电子表格引用
const spreadsheetRefs = ref<Record<string, InstanceType<typeof SpreadsheetPreview>>>({});

const exampleLoading = ref(false);

// 默认示例数据（仅在后端未配置时使用）
const DEFAULT_EXAMPLE: string[][] = [
  ['Symbol', 'logFC', 'P.Value'],
  ['CPA1', '-2.26', '0.034'],
  ['DNASE1L3', '-2.10', '1.65E-17'],
  ['SLC4A10', '-1.98', '5.77E-10'],
];

// 根据 key 获取对应的示例数据配置
const getExampleByKey = (key: string): ExampleDataConfig | undefined => {
  return props.exampleData?.find(e => e.key === key);
};

// 加载所有示例数据（从后端配置的 URL 加载）
const loadAllExamples = async () => {
  exampleLoading.value = true;
  
  try {
    const examples = props.exampleData;
    
    if (examples && examples.length > 0) {
      // 直接遍历示例数据加载
      for (const example of examples) {
        await loadExampleForFile(example.key, example);
      }
      message.success('示例数据已加载');
    } else {
      // 没有配置时，只为第一个文件加载默认数据
      const firstKey = fileConfigs.value[0]?.key ?? 'data';
      fileDataMap.value[firstKey] = {
        data: DEFAULT_EXAMPLE,
        fileName: 'example_data.csv',
        loading: false,
      };
      updateFileId(firstKey, Date.now());
      message.success('示例数据已加载');
    }
  } catch (error) {
    console.error('Error loading examples:', error);
    message.error('示例数据加载失败');
  } finally {
    exampleLoading.value = false;
  }
};

// 为单个文件加载示例数据
const loadExampleForFile = async (key: string, example: ExampleDataConfig) => {
  // 确保 fileDataMap[key] 存在
  if (!fileDataMap.value[key]) {
    fileDataMap.value[key] = {
      data: [],
      fileName: '',
      loading: false,
    };
  }
  
  const fileData = fileDataMap.value[key]!;
  fileData.loading = true;
  
  try {
    const response = await baseRequestClient.get(example.url);
    const content = response.data as string;
    const lines = content.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split(/[,\t]/));

    fileData.data = data;
    fileData.fileName = example.name || 'example_data.csv';
    updateFileId(key, Date.now());
    console.log(`Loaded example for ${key}:`, data.length, 'rows');
  } catch (error) {
    console.error(`Error loading example for ${key}:`, error);
    message.error(`加载示例 "${example.name}" 失败`);
  } finally {
    fileData.loading = false;
  }
};

// Download example data
const downloadExample = async () => {
  const currentKey = activeTab.value;
  const example = getExampleByKey(currentKey);

  if (example) {
    try {
      const response = await baseRequestClient.get(example.url, {
        responseType: 'blob',
      });
      const blob = response.data as Blob;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = example.name || 'example_data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('示例数据已下载');
    } catch (error) {
      console.error('Download error:', error);
      message.error('下载失败');
    }
  } else {
    // Default example data
    const csvContent = DEFAULT_EXAMPLE.map((row) => row.join('\t')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'example_data.csv';
    link.click();
    message.success('示例数据已下载');
  }
};

// 导入文件（按指定 key）- 本地解析，提交时通过 file_contents 发送
const handleImportForKey = async (key: string, file: File) => {
  // 确保 fileDataMap[key] 存在
  if (!fileDataMap.value[key]) {
    fileDataMap.value[key] = {
      data: [],
      fileName: '',
      loading: false,
    };
  }
  
  const fileData = fileDataMap.value[key]!;

  try {
    const content = await file.text();
    const lines = content.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split(/[,\t]/));

    fileData.data = data;
    fileData.fileName = file.name;
    updateFileId(key, Date.now()); // 标记有数据
    
    // 切换到对应的 Tab
    activeTab.value = key;
    
    message.success(`${file.name} 导入成功`);
  } catch (error) {
    console.error('Import error:', error);
    message.error('文件导入失败');
  }
  
  return false; // 阻止默认上传
};

// 清空指定表格
const handleClearForKey = (key: string) => {
  const fileData = fileDataMap.value[key];
  if (!fileData) return;

  fileData.data = [];
  fileData.fileName = '';
  spreadsheetRefs.value[key]?.clearData();
  updateFileId(key, null);
  message.info('数据已清空');
};

// 更新文件 ID 并在数据变化时提取表头
const updateFileId = (key: string, fileId: null | number) => {
  emit('update:modelValue', { ...props.modelValue, [key]: fileId });
  
  // 数据变化时，提取所有文件的表头并通知父组件
  const allHeaders: Record<string, string[]> = {};
  for (const [fileKey, fileData] of Object.entries(fileDataMap.value)) {
    if (fileData.data && fileData.data.length > 0) {
      // 过滤掉空表头
      const headers = fileData.data[0].filter(h => h.trim() !== '');
      if (headers.length > 0) {
        allHeaders[fileKey] = headers;
      }
    }
  }
  emit('headers-change', allHeaders);
};

// 表格数据变化
const handleDataChange = (key: string, data: string[][]) => {
  const fileData = fileDataMap.value[key];
  if (fileData) {
    fileData.data = data;
    if (data.length > 0) {
      updateFileId(key, Date.now());
    }
  }
};

// 下一步
const goNext = () => {
  emit('nextStep');
};

// 暴露方法
const fillAllExamples = () => {
  loadAllExamples();
};

// 获取所有文件内容（转换为 CSV 格式）
const getFileContents = (): Record<string, string> => {
  const contents: Record<string, string> = {};
  for (const config of fileConfigs.value) {
    const fileData = fileDataMap.value[config.key];
    if (fileData && fileData.data.length > 0) {
      // 将二维数组转换为 tab 分隔的 CSV
      contents[config.key] = fileData.data.map((row) => row.join('\t')).join('\n');
    }
  }
  return contents;
};

defineExpose({ fillAllExamples, getFileContents });
</script>

<template>
  <div class="data-file-selector">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <Space>
        <Button type="primary" :loading="exampleLoading" @click="loadAllExamples">示 例</Button>
        <Button @click="downloadExample">下载示例 数据表</Button>
      </Space>
    </div>

    <!-- 文件输入行（所有文件配置） -->
    <div
      v-for="config in fileConfigs"
      :key="config.key"
      class="file-input-row"
    >
      <label class="input-label">
        <span v-if="config.required" class="required">*</span>
        <a-tooltip v-if="config.description" :title="config.description">
          <span class="label-text has-desc">
            {{ config.label || config.key }}
            <Icon icon="mdi:help-circle-outline" class="desc-icon" />：
          </span>
        </a-tooltip>
        <span v-else class="label-text">
          {{ config.label || config.key }}：
        </span>
      </label>

      <Input
        :value="fileDataMap[config.key]?.fileName || '请编辑下方表格'"
        readonly
        class="filename-input"
        placeholder="请编辑下方表格"
      />

      <div class="action-buttons">
        <Upload
          :show-upload-list="false"
          :before-upload="(file: File) => handleImportForKey(config.key, file)"
          accept=".csv,.txt,.tsv,.xls,.xlsx"
        >
          <Button type="primary" class="btn-import">导 入</Button>
        </Upload>
        <Button danger class="btn-clear" @click="handleClearForKey(config.key)">清 空</Button>
      </div>
    </div>

    <!-- 多文件 Tab -->
    <div class="table-tabs">
      <Tabs v-model:activeKey="activeTab" size="small">
        <Tabs.TabPane
          v-for="config in fileConfigs"
          :key="config.key"
          :tab="config.label || config.key"
        />
      </Tabs>
    </div>

    <!-- 可编辑电子表格 -->
    <div class="spreadsheet-area">
      <template v-for="config in fileConfigs" :key="config.key">
        <SpreadsheetPreview
          v-if="activeTab === config.key"
          :ref="(el: any) => { if (el) spreadsheetRefs[config.key] = el }"
          :data="fileDataMap[config.key]?.data ?? []"
          :show-toolbar="true"
          @change="(data: string[][]) => handleDataChange(config.key, data)"
        />
      </template>
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
  min-width: 120px; /* 固定宽度以确保输入框对齐 */
  justify-content: flex-end; /* 标签文字右对齐，靠近输入框 */
  font-size: 14px;
  color: #1e293b;
}

.label-text {
  display: flex;
  align-items: center;
  gap: 2px;
}

.has-desc {
  cursor: help;
  border-bottom: 1px dashed #94a3b8;
}

.desc-icon {
  font-size: 14px;
  color: #64748b;
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

.table-tabs {
  margin-top: 0;
}

.table-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.table-tabs :deep(.ant-tabs-tab) {
  padding: 4px 16px; /* 减小上下内边距 */
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

