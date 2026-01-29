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
import { uploadFile } from '../../../api/user-file';
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

// 可编辑的表格文件扩展名
const EDITABLE_EXTENSIONS = ['csv', 'tsv', 'txt', 'xls', 'xlsx'];

const props = defineProps<{
  exampleData?: ExampleDataConfig[] | null; // 后端配置的示例数据
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
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
    return examples.map((e) => ({
      key: e.key,
      label: e.name || e.key,
      required: false,
    }));
  }

  // 否则使用 input_schema.files
  return (
    props.schema?.files ?? [{ key: 'data', label: '数据表', required: true }]
  );
});

// 当前激活的 Tab
const activeTab = ref<string>('');

// 初始化激活 Tab
watch(
  fileConfigs,
  (configs) => {
    if (configs.length > 0 && !activeTab.value) {
      activeTab.value = configs[0]!.key;
    }
  },
  { immediate: true },
);

// 每个文件的表格数据和状态
const fileDataMap = ref<
  Record<
    string,
    {
      data: string[][];
      fileName: string;
      loading: boolean;
    }
  >
>({});

// 初始化文件数据
watch(
  fileConfigs,
  (configs) => {
    for (const config of configs) {
      if (!fileDataMap.value[config.key]) {
        fileDataMap.value[config.key] = {
          data: [],
          fileName: '',
          loading: false,
        };
      }
    }
  },
  { immediate: true },
);

// 电子表格引用
const spreadsheetRefs = ref<
  Record<string, InstanceType<typeof SpreadsheetPreview>>
>({});

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
  return props.exampleData?.find((e) => e.key === key);
};

// 从 URL 或文件名中提取扩展名
const getExtension = (urlOrName: string): string => {
  const match = urlOrName.match(/\.([^./\\?#]+)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : '';
};

// 判断文件是否为可编辑的表格类型
const isEditableTableFile = (key: string): boolean => {
  const example = getExampleByKey(key);
  if (example) {
    const ext = getExtension(example.url || example.name);
    return EDITABLE_EXTENSIONS.includes(ext);
  }
  // 默认情况下假定是可编辑的
return true;
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
    // 判断是否为可编辑的表格文件
    const ext = getExtension(example.url || example.name);
    const isEditable = EDITABLE_EXTENSIONS.includes(ext);

    if (isEditable) {
      // 表格文件：下载并解析内容
      const response = await baseRequestClient.get(example.url);
      const content = response.data as string;
      const lines = content.split('\n').filter((line) => line.trim());
      const data = lines.map((line) => line.split(/[,\t]/));

      fileData.data = data;
      fileData.fileName = example.name || 'example_data.csv';
      console.log(`Loaded example for ${key}:`, data.length, 'rows');
      updateFileId(key, Date.now());  // 表格文件用临时ID，通过file_contents提交
    } else {
      // 非表格文件（如RDS/H5AD）：下载后重新上传到用户空间获取真实file_id
      fileData.data = [];
      fileData.fileName = example.name || example.url.split('/').pop() || 'example_file';
      console.log(`Loading binary example for ${key}:`, fileData.fileName);
      
      try {
        // 1. 下载示例文件
        const response = await baseRequestClient.get(example.url, {
          responseType: 'blob',
        });
        const blob = response.data as Blob;
        
        // 2. 转换为 File 对象并上传
        const file = new File([blob], fileData.fileName, { type: blob.type });
        const uploadResult = await uploadFile(file);
        updateFileId(key, uploadResult.id);  // 使用服务器返回的真实 file_id
        console.log(`Uploaded binary example for ${key}, file_id:`, uploadResult.id);
      } catch (uploadError) {
        console.error(`Upload binary example failed for ${key}:`, uploadError);
        message.error(`示例文件上传失败`);
      }
    }
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
      document.body.append(link);
      link.click();
      link.remove();
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
  fileData.loading = true;  // 设置loading状态

  try {
    // 获取文件扩展名
    const ext = getExtension(file.name);
    const isEditable = EDITABLE_EXTENSIONS.includes(ext);

    if (isEditable) {
      // 表格文件：检查大小限制（超过10MB警告）
      if (file.size > 10 * 1024 * 1024) {
        message.warning('大文件可能导致浏览器卡顿，建议使用文件上传模式');
      }

      const content = await file.text();
      const lines = content.split('\n').filter((line) => line.trim());
      const data = lines.map((line) => line.split(/[,\t]/));

      fileData.data = data;
      fileData.fileName = file.name;
      message.success(`${file.name} 导入成功`);
    } else {
      // 非表格文件（RDS/H5AD等）：先上传到服务器获取真实 file_id
      fileData.data = [];
      fileData.fileName = file.name;
      
      try {
        const uploadResult = await uploadFile(file);
        updateFileId(key, uploadResult.id);  // 使用服务器返回的真实 file_id
        message.success(`${file.name} 上传成功`);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        message.error(`${file.name} 上传失败`);
        fileData.loading = false;
        return false;
      }
    }

    if (isEditable) {
      updateFileId(key, Date.now());  // CSV等文件用临时ID，通过file_contents提交
    }
    activeTab.value = key;
  } catch (error) {
    console.error('Import error:', error);
    message.error('文件导入失败');
  } finally {
    fileData.loading = false;  // 清除loading状态
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
      const headers = fileData.data[0].filter((h) => h.trim() !== '');
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
    // 优先从表格实例获取最新数据（确保编辑后的数据被正确捕获）
    const spreadsheetInstance = spreadsheetRefs.value[config.key];
    let data: string[][] = [];

    if (spreadsheetInstance) {
      // 从表格实例获取当前数据
      data = spreadsheetInstance.getData() || [];
    } else {
      // 回退到缓存数据
      data = fileDataMap.value[config.key]?.data || [];
    }

    if (data.length > 0) {
      // 将二维数组转换为 tab 分隔的 CSV
      // 移除每行末尾的空单元格，避免产生多余的 tab 字符
      contents[config.key] = data
        .map((row) => {
          // 找到最后一个非空单元格的索引
          let lastNonEmptyIndex = row.length - 1;
          while (
            lastNonEmptyIndex >= 0 &&
            (row[lastNonEmptyIndex] === '' ||
              row[lastNonEmptyIndex] === undefined ||
              row[lastNonEmptyIndex] === null)
          ) {
            lastNonEmptyIndex--;
          }
          // 截取到最后一个非空单元格
          const trimmedRow =
            lastNonEmptyIndex >= 0 ? row.slice(0, lastNonEmptyIndex + 1) : [];
          return trimmedRow.join('\t');
        })
        .join('\n');
    }
  }
  return contents;
};

// 设置文件内容（从任务回填数据时使用）
const setFileContents = (contents: Record<string, string>) => {
  for (const [key, csvContent] of Object.entries(contents)) {
    if (!csvContent) continue;
    
    // 解析 CSV 内容
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split(/[\t,]/));
    
    // 确保 fileDataMap[key] 存在
    if (!fileDataMap.value[key]) {
      fileDataMap.value[key] = {
        data: [],
        fileName: '',
        loading: false,
      };
    }
    
    fileDataMap.value[key]!.data = data;
    fileDataMap.value[key]!.fileName = `${key}.csv (历史数据)`;
    updateFileId(key, Date.now());
  }
};

defineExpose({ fillAllExamples, getFileContents, setFileContents });
</script>

<template>
  <div class="data-file-selector">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <Space>
        <Button
          type="primary"
          :loading="exampleLoading"
          @click="loadAllExamples"
        >
          示 例
        </Button>
        <Button @click="downloadExample">下载示例 数据表</Button>
      </Space>
    </div>

    <!-- 文件输入行（所有文件配置） -->
    <div v-for="config in fileConfigs" :key="config.key" class="file-input-row">
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
          accept=".csv,.txt,.tsv,.xls,.xlsx,.rds,.h5ad,.h5"
        >
          <Button 
            type="primary" 
            class="btn-import"
            :loading="fileDataMap[config.key]?.loading"
          >
            导 入
          </Button>
        </Upload>
        <Button danger class="btn-clear" @click="handleClearForKey(config.key)">
          清 空
        </Button>
      </div>
    </div>

    <!-- 多文件 Tab -->
    <div class="table-tabs">
      <Tabs v-model:active-key="activeTab" size="small">
        <Tabs.TabPane
          v-for="config in fileConfigs"
          :key="config.key"
          :tab="config.label || config.key"
        />
      </Tabs>
    </div>

    <!-- 可编辑电子表格（仅对表格文件显示） -->
    <div class="spreadsheet-area">
      <template v-for="config in fileConfigs" :key="config.key">
        <!-- 表格文件：显示电子表格 -->
        <SpreadsheetPreview
          v-if="activeTab === config.key && isEditableTableFile(config.key)"
          :ref="
            (el: any) => {
              if (el) spreadsheetRefs[config.key] = el;
            }
          "
          :data="fileDataMap[config.key]?.data ?? []"
          :show-toolbar="true"
          @change="(data: string[][]) => handleDataChange(config.key, data)"
        />
        <!-- 非表格文件：显示文件信息卡片 -->
        <div
          v-else-if="activeTab === config.key && !isEditableTableFile(config.key)"
          class="binary-file-info"
        >
          <!-- 已加载状态 -->
          <div v-if="fileDataMap[config.key]?.fileName" class="binary-file-card loaded">
            <Icon icon="mdi:file-check" class="file-icon success" />
            <div class="file-details">
              <div class="file-name">{{ fileDataMap[config.key]?.fileName }}</div>
              <div class="file-desc">此文件类型不支持在线编辑，将直接作为输入文件使用</div>
            </div>
          </div>
          <!-- 未加载状态 -->
          <div v-else class="binary-file-card empty">
            <Icon icon="mdi:file-question-outline" class="file-icon pending" />
            <div class="file-details">
              <div class="file-name">{{ config.label || config.key }}</div>
              <div class="file-desc">请点击上方「示例」按钮加载示例数据，或点击「导入」上传文件</div>
            </div>
          </div>
        </div>
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
  justify-content: flex-end; /* 标签文字右对齐，靠近输入框 */
  min-width: 120px; /* 固定宽度以确保输入框对齐 */
  font-size: 14px;
  color: #1e293b;
}

.label-text {
  display: flex;
  gap: 2px;
  align-items: center;
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

/* 非表格文件信息卡片 */
.binary-file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}

.binary-file-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 24px 32px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.binary-file-card .file-icon {
  font-size: 48px;
}

.binary-file-card .file-icon.success {
  color: #22c55e;
}

.binary-file-card .file-icon.pending {
  color: #94a3b8;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: #1e293b;
}

.file-desc {
  font-size: 13px;
  color: #64748b;
}
</style>
