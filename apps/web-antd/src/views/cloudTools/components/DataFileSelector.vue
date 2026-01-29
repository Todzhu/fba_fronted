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
import { Button, Input, message, Space, Tabs, Upload, Dropdown, Menu } from 'ant-design-vue';

import { baseRequestClient } from '../../../api/request';
import SpreadsheetPreview from './SpreadsheetPreview.vue';
import PlatformFileSelector from './PlatformFileSelector.vue';

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

// 二进制文件扩展名（不可解析为表格）
const BINARY_EXTENSIONS = ['rds', 'h5ad', 'h5', 'rdata', 'rda', 'loom', 'zarr', 'hdf5'];

// 判断是否为二进制文件
const isBinaryFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTENSIONS.includes(ext);
};

// 判断是否全部为二进制文件模式（隐藏表格区域）
const allBinaryMode = computed(() => {
  const examples = props.exampleData;
  if (!examples || examples.length === 0) return false;
  
  const result = examples.every((e) => {
    // 优先使用 URL 判断（URL 通常包含真实文件扩展名）
    const urlFileName = e.url?.split('/').pop() || '';
    const nameFileName = e.name || '';
    // 两者都检查
    const isBinary = isBinaryFile(urlFileName) || isBinaryFile(nameFileName);
    console.log(`[allBinaryMode] key=${e.key}, url=${e.url}, name=${e.name}, isBinary=${isBinary}`);
    return isBinary;
  });
  
  console.log(`[allBinaryMode] result=${result}`);
  return result;
});

// 每个文件的表格数据和状态
const fileDataMap = ref<
  Record<
    string,
    {
      data: string[][];
      fileName: string;
      loading: boolean;
      fileType: 'tabular' | 'binary'; // 文件类型
      fileUrl?: string; // 二进制文件的下载 URL
      fileId?: number; // 平台文件 ID
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
          fileType: 'tabular',
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
        fileType: 'tabular',
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
      fileType: 'tabular',
    };
  }

  const fileData = fileDataMap.value[key]!;
  fileData.loading = true;

  // 判断文件类型 - 优先使用 URL 判断（URL 包含真实扩展名，name 可能是中文描述）
  const urlFileName = example.url?.split('/').pop() || '';
  const displayName = example.name || urlFileName || 'file';
  const isBinary = isBinaryFile(urlFileName) || isBinaryFile(displayName);


  try {
    if (isBinary) {
      // 二进制文件：不解析内容，只记录下载 URL
      fileData.data = [];
      fileData.fileName = displayName;
      fileData.fileType = 'binary';
      fileData.fileUrl = example.url;
      updateFileId(key, Date.now());
      console.log(`Loaded binary example for ${key}: ${displayName}`);
    } else {
      // 表格文件：解析 CSV/TSV
      const response = await baseRequestClient.get(example.url);
      const content = response.data as string;
      const lines = content.split('\n').filter((line) => line.trim());
      const data = lines.map((line) => line.split(/[,\t]/));

      fileData.data = data;
      fileData.fileName = displayName;
      fileData.fileType = 'tabular';
      fileData.fileUrl = undefined;
      updateFileId(key, Date.now());
      console.log(`Loaded example for ${key}:`, data.length, 'rows');
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
      fileType: 'tabular',
    };
  }

  const fileData = fileDataMap.value[key]!;

  try {
    const content = await file.text();
    const lines = content.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split(/[,\t]/));

    fileData.data = data;
    fileData.fileName = file.name;
    fileData.fileType = 'tabular';
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

// 导入二进制文件（RDS/H5AD 等）- 不解析内容，只记录文件引用
const handleBinaryImportForKey = (key: string, file: File) => {
  // 确保 fileDataMap[key] 存在
  if (!fileDataMap.value[key]) {
    fileDataMap.value[key] = {
      data: [],
      fileName: '',
      loading: false,
      fileType: 'binary',
    };
  }

  const fileData = fileDataMap.value[key]!;
  fileData.fileName = file.name;
  fileData.fileType = 'binary';
  fileData.fileUrl = URL.createObjectURL(file); // 临时 URL 用于预览/下载
  fileData.data = []; // 二进制文件不解析
  updateFileId(key, Date.now());

  message.success(`${file.name} 已选择`);
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
    if (fileData.data && fileData.data.length > 0 && fileData.data[0]) {
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
    if (fileData?.data && fileData.data.length > 0) {
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
        fileType: 'tabular',
      };
    }
    
    fileDataMap.value[key]!.data = data;
  fileDataMap.value[key]!.fileName = `${key}.csv (历史数据)`;
    fileDataMap.value[key]!.fileType = 'tabular';
    updateFileId(key, Date.now());
  }
};

// 平台文件选择相关
const platformSelectorOpen = ref(false);
const currentSelectorKey = ref('');

const openPlatformSelector = (key: string) => {
  currentSelectorKey.value = key;
  platformSelectorOpen.value = true;
};

const handlePlatformFileSelect = (file: any) => {
  if (!currentSelectorKey.value) return;
  
  const key = currentSelectorKey.value;
  fileDataMap.value[key]!.fileName = file.name;
  fileDataMap.value[key]!.fileType = 'binary'; // 假设平台选择的都是二进制文件，或者根据扩展名判断
  fileDataMap.value[key]!.fileId = Number(file.id);
  
  // 简单根据后缀判断类型
  const ext = file.name.split('.').pop()?.toLowerCase();
  const binaryExts = ['rds', 'rdata', 'rda', 'h5ad', 'h5', 'loom', 'zarr', 'hdf5'];
  if (binaryExts.includes(ext)) {
     fileDataMap.value[key]!.fileType = 'binary';
  } else {
     fileDataMap.value[key]!.fileType = 'tabular';
  }
  
  updateFileId(key, Date.now()); // 触发更新
  message.success(`已选择文件: ${file.name}`);
};

// 获取二进制文件的 URL（用于示例数据等）和 ID
const getFileUrls = (): Record<string, string> => {
  const urls: Record<string, string> = {};
  for (const config of fileConfigs.value) {
    const fileData = fileDataMap.value[config.key];
    // 只处理二进制文件且有 fileUrl 的情况（示例文件）
    if (fileData?.fileType === 'binary' && fileData.fileUrl) {
      urls[config.key] = fileData.fileUrl;
    }
  }
  return urls;
};

const getFileIds = (): Record<string, number> => {
   const ids: Record<string, number> = {};
   for (const config of fileConfigs.value) {
      const fileData = fileDataMap.value[config.key];
      if (fileData?.fileId) {
         ids[config.key] = fileData.fileId;
      }
   }
   return ids;
}

defineExpose({ fillAllExamples, getFileContents, setFileContents, getFileUrls, getFileIds });

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
        <Button v-if="!allBinaryMode" @click="downloadExample">下载示例 数据表</Button>
        <!-- 二进制模式提示 -->
        <span v-if="allBinaryMode" class="binary-hint-text">
          <Icon icon="mdi:information-outline" class="hint-icon-inline" />
          点击「示例」按钮加载示例数据文件
        </span>
      </Space>
    </div>

    <!-- ========== 全二进制模式：与普通模式一致的行布局 ========== -->
    <template v-if="allBinaryMode">
      <div v-for="config in fileConfigs" :key="config.key" class="file-input-row">
        <label class="input-label">
          <span v-if="config.required" class="required">*</span>
          <span class="label-text">
            {{ config.label || config.key }}：
          </span>
        </label>

        <Input
          :value="fileDataMap[config.key]?.fileName || '请选择文件'"
          readonly
          class="filename-input"
          placeholder="请选择文件"
        />

        <div class="action-buttons">
          <Dropdown>
            <Button type="primary" class="btn-import">
              <Space>
                上 传
                <Icon icon="ant-design:down-outlined" />
              </Space>
            </Button>
            <template #overlay>
              <Menu>
                <Menu.Item key="local">
                  <Upload
                    :show-upload-list="false"
                    :before-upload="(file: File) => handleBinaryImportForKey(config.key, file)"
                    accept=".rds,.rdata,.rda,.h5ad,.h5,.loom,.zarr,.hdf5"
                  >
                    <div>上传本地文件</div>
                  </Upload>
                </Menu.Item>
                <Menu.Item key="platform" @click="openPlatformSelector(config.key)">
                  从我的数据选择
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>
        </div>
      </div>

      <!-- 二进制文件状态卡片 -->
      <div 
        class="binary-file-card" 
        :class="{ 'card-success': fileDataMap[fileConfigs[0]?.key]?.fileName }"
      >
        <Icon 
          :icon="fileDataMap[fileConfigs[0]?.key]?.fileName ? 'mdi:check-circle' : 'mdi:file-document-outline'" 
          class="file-card-icon" 
        />
        <div class="file-card-info">
          <div class="file-card-name">
            {{ fileDataMap[fileConfigs[0]?.key]?.fileName || '请选择数据文件' }}
          </div>
          <div class="file-card-hint">
            {{ fileDataMap[fileConfigs[0]?.key]?.fileName 
              ? '文件已选择，可以进行下一步' 
              : '点击「示例」按钮或「上传」按钮选择 RDS/H5AD 文件' 
            }}
          </div>
        </div>
      </div>

    </template>




    <!-- ========== 普通模式：表格编辑模式 ========== -->
    <template v-else>
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
            accept=".csv,.txt,.tsv,.xls,.xlsx"
          >
            <Button type="primary" class="btn-import">导 入</Button>
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

      <!-- 可编辑电子表格 / 二进制文件卡片 -->
      <div class="spreadsheet-area">
        <template v-for="config in fileConfigs" :key="config.key">
          <!-- 二进制文件：卡片展示 -->
          <div
            v-if="activeTab === config.key && fileDataMap[config.key]?.fileType === 'binary'"
            class="binary-file-card"
          >
            <Icon icon="mdi:file-document-outline" class="file-card-icon" />
            <div class="file-card-info">
              <div class="file-card-name">{{ fileDataMap[config.key]?.fileName }}</div>
              <div class="file-card-hint">该文件为特殊格式（如 RDS、H5AD），无法在线预览</div>
            </div>
            <a
              v-if="fileDataMap[config.key]?.fileUrl"
              :href="fileDataMap[config.key]?.fileUrl"
              download
            >
              <Button type="primary">下载文件</Button>
            </a>
          </div>

          <!-- 表格文件：电子表格 -->
          <SpreadsheetPreview
            v-else-if="activeTab === config.key"
            :ref="
              (el: any) => {
                if (el) spreadsheetRefs[config.key] = el;
              }
            "
            :data="fileDataMap[config.key]?.data ?? []"
            :show-toolbar="true"
            @change="(data: string[][]) => handleDataChange(config.key, data)"
          />
        </template>
      </div>
    </template>



    <!-- 底部提示 + 下一步 -->
    <div class="footer">
      <div v-if="!allBinaryMode" class="hint">
        <Icon icon="mdi:information-outline" class="hint-icon" />
        <span>
          对于较大的数据文件，在线编辑可能会导致卡顿，请切换到文件模式；在文件模式下，表格不可编辑且仅展示1000行；超过100M的文件请先上传到云盘
        </span>
      </div>
      <div v-else></div>
      <Button type="primary" class="btn-next" @click="goNext">下一步</Button>
    </div>

    <!-- 平台文件选择器 -->
    <PlatformFileSelector
      v-model:open="platformSelectorOpen"
      :accept="allBinaryMode ? '.rds,.rdata,.rda,.h5ad,.h5,.loom,.zarr,.hdf5' : undefined"
      @select="handlePlatformFileSelect"
    />
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

/* 二进制模式提示卡片 */
.hint-binary {
  color: #3b82f6;
}

/* 二进制模式内联提示文字 */
.binary-hint-text {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 13px;
  color: #64748b;
}

.hint-icon-inline {
  font-size: 14px;
  color: #3b82f6;
}



/* 二进制文件列表容器 */
.binary-files-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

/* 二进制文件卡片 */
.binary-file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 80px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  transition: all 0.3s ease;
}

/* 成功状态：绿色 */
.binary-file-card.card-success {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
  border-style: solid;
}

.binary-file-card.card-success .file-card-icon {
  color: #22c55e;
}

.binary-file-card.card-success .file-card-name {
  color: #166534;
}

.binary-file-card.card-success .file-card-hint {
  color: #16a34a;
}


/* 表格区域内的卡片需要更大高度 */
.spreadsheet-area .binary-file-card {
  min-height: 200px;
}

.file-card-icon {
  flex-shrink: 0;
  font-size: 48px;
  color: #64748b;
}

.file-card-info {
  flex: 1;
}

.file-card-name {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.file-card-hint {
  font-size: 13px;
  color: #64748b;
}
</style>
