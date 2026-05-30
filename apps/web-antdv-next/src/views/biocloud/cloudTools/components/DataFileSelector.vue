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
import type { ColumnSummary } from '#/api/analysis-tools';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Button,
  Input,
  message,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import { inspectFile } from '#/api/analysis-tools';

import { baseRequestClient } from '#/api/request';
import { getExampleDownloadFilename } from './DataFileSelector.helpers';
import PlatformFileSelector from './PlatformFileSelector.vue';
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
  exampleData?: ExampleDataConfig[] | null; // 后端配置的示例数据
  modelValue: Record<string, null | number>;
  schema: InputSchema | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, null | number>): void;
  (e: 'nextStep'): void;
  (e: 'headersChange', headers: Record<string, string[]>): void;
  (e: 'metadataChange', metadata: Record<string, MetadataInfo>): void;
}>();

// 文件配置列表 - 优先使用 example_data 生成 Tab，否则使用 input_schema.files
const fileConfigs = computed<FileConfig[]>(() => {
  const examples = props.exampleData;

  // 如果有示例数据配置，以示例数据生成 Tab
  if (examples && examples.length > 0) {
    const schemaFiles = props.schema?.files ?? [];
    return examples.map((e) => {
      const schemaFile = schemaFiles.find((file) => file.key === e.key);
      return {
        key: e.key,
        label: schemaFile?.label || e.name || e.key,
        required: schemaFile?.required ?? false,
        extensions: schemaFile?.extensions,
        description: schemaFile?.description,
      };
    });
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
const BINARY_EXTENSIONS = new Set([
  'h5',
  'h5ad',
  'hdf5',
  'loom',
  'rda',
  'rdata',
  'rds',
  'zarr',
]);

const MANAGED_BINARY_EXTENSIONS = new Set(['h5ad', 'rds']);

const normalizeExtension = (extension: string): string =>
  extension.trim().replace(/^\./, '').toLowerCase();

const requiresPlatformFileSelection = (config: FileConfig): boolean =>
  config.extensions?.some((extension) =>
    MANAGED_BINARY_EXTENSIONS.has(normalizeExtension(extension)),
  ) ?? false;

// 判断是否为二进制文件
const isBinaryFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTENSIONS.has(ext);
};

// 判断是否全部为二进制文件模式（隐藏表格区域）
const allBinaryMode = computed(() => {
  if (props.schema?.files?.some(requiresPlatformFileSelection)) return true;

  const examples = props.exampleData;
  if (!examples || examples.length === 0) return false;

  const result = examples.every((e) => {
    // 优先使用 URL 判断（URL 通常包含真实文件扩展名）
    const urlFileName = e.url?.split('/').pop() || '';
    const nameFileName = e.name || '';
    // 两者都检查
    const isBinary = isBinaryFile(urlFileName) || isBinaryFile(nameFileName);
    return isBinary;
  });

  return result;
});

const isRoeInput = computed(() => {
  const examples = props.exampleData ?? [];
  const files = props.schema?.files ?? [];

  return (
    examples.some((example) => /\/roe\//i.test(example.url)) ||
    files.some((file) =>
      /roe|ro\/e|metadata/i.test(
        `${file.key} ${file.label ?? ''} ${file.description ?? ''}`,
      ),
    )
  );
});

const footerHintText = computed(() => {
  if (isRoeInput.value) {
    return 'ROE 分析使用单细胞 metadata 表作为输入：每行一个细胞，需包含细胞类型列和分组列；支持 CSV、TSV、TXT、XLS、XLSX，导入后请在参数页选择对应列名。';
  }

  return '在线表格适合预览和少量编辑；较大的表格文件导入后可能会卡顿，建议先确认表头和关键列，再进入下一步。';
});

// Metadata 汇总信息
interface MetadataInfo {
  columns: string[];
  n_cells: number;
  summary: ColumnSummary[];
}
const metadataMap = ref<Record<string, MetadataInfo>>({});
const metadataLoading = ref(false);
const metadataPage = ref(1);
const metadataPageSize = ref(8);

const currentMetadataKey = computed(() => fileConfigs.value[0]?.key ?? '');
const currentMetadata = computed(
  () => metadataMap.value[currentMetadataKey.value],
);
const currentMetadataSummary = computed(
  () => currentMetadata.value?.summary ?? [],
);
const metadataTablePagination = computed(() => ({
  current: metadataPage.value,
  pageSize: metadataPageSize.value,
  pageSizeOptions: ['8', '15', '30'],
  showSizeChanger: true,
  showTotal: (total: number, range: [number, number]) =>
    `第 ${range[0]}-${range[1]} 项 / 共 ${total} 项`,
  total: currentMetadataSummary.value.length,
  onChange: (page: number, pageSize: number) => {
    metadataPage.value = page;
    metadataPageSize.value = pageSize;
  },
  onShowSizeChange: (_current: number, size: number) => {
    metadataPage.value = 1;
    metadataPageSize.value = size;
  },
}));

watch([currentMetadataKey, () => currentMetadataSummary.value.length], () => {
  metadataPage.value = 1;
});

// 每个文件的表格数据和状态
const fileDataMap = ref<
  Record<
    string,
    {
      data: string[][];
      fileId?: number; // 平台文件 ID
      fileName: string;
      fileType: 'binary' | 'tabular'; // 文件类型
      fileUrl?: string; // 二进制文件的下载 URL
      dirty?: boolean; // 是否被用户导入或编辑过
      loading: boolean;
    }
  >
>({});

const currentBinaryFileData = computed(
  () => fileDataMap.value[currentMetadataKey.value],
);

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
  const exampleName = example.name || '';
  const isBinary = isBinaryFile(urlFileName) || isBinaryFile(exampleName);
  const displayName = isBinary
    ? urlFileName || exampleName || 'file'
    : exampleName || urlFileName || 'file';

  try {
    if (isBinary) {
      // 二进制文件：不解析内容，只记录下载 URL
      fileData.data = [];
      fileData.fileName = displayName;
      fileData.fileType = 'binary';
      fileData.fileUrl = example.url;
      fileData.dirty = false;
      updateFileId(key, Date.now());
      // 自动解析 metadata
      await fetchMetadata(key, { file_url: example.url });
    } else {
      // 表格文件：解析 CSV/TSV
      const response = await baseRequestClient.get(example.url, {
        responseType: 'text',
        timeout: 120_000,
      });
      const content = response.data as string;
      const lines = content.split('\n').filter((line) => line.trim());
      const data = lines.map((line) => line.split(/[,\t]/));

      fileData.data = data;
      fileData.fileName = displayName;
      fileData.fileType = 'tabular';
      fileData.fileUrl = example.url;
      fileData.dirty = false;
      updateFileId(key, Date.now());
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
        timeout: 120_000,
      });
      const blob = response.data as Blob;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getExampleDownloadFilename(example, response.headers);
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
  fileData.loading = true; // 开始加载
  message.loading({ content: '正在解析文件，请稍候...', key: 'fileImport' });

  try {
    const content = await file.text();
    const lines = content.split('\n').filter((line) => line.trim());
    const data = lines.map((line) => line.split(/[,\t]/));

    fileData.data = data;
    fileData.fileName = file.name;
    fileData.fileType = 'tabular';
    fileData.fileUrl = undefined;
    fileData.fileId = undefined;
    fileData.dirty = true;
    updateFileId(key, Date.now()); // 标记有数据

    // 切换到对应的 Tab
    activeTab.value = key;

    message.success({ content: `${file.name} 导入成功`, key: 'fileImport' });
  } catch (error) {
    console.error('Import error:', error);
    message.error({ content: '文件导入失败', key: 'fileImport' });
  } finally {
    fileData.loading = false; // 结束加载
  }

  return false; // 阻止默认上传
};

// 清空指定表格
const handleClearForKey = (key: string) => {
  const fileData = fileDataMap.value[key];
  if (!fileData) return;

  fileData.data = [];
  fileData.fileName = '';
  fileData.fileUrl = undefined;
  fileData.fileId = undefined;
  fileData.dirty = false;
  delete metadataMap.value[key];
  spreadsheetRefs.value[key]?.clearData();
  updateFileId(key, null);
  emit('metadataChange', { ...metadataMap.value });
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
  emit('headersChange', allHeaders);
};

// 表格数据变化
const handleDataChange = (key: string, data: string[][]) => {
  const fileData = fileDataMap.value[key];
  if (fileData) {
    fileData.data = data;
    if (fileData?.data && fileData.data.length > 0) {
      fileData.dirty = true;
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

    data = spreadsheetInstance
      ? spreadsheetInstance.getData() || []
      : fileDataMap.value[config.key]?.data || [];

    const fileData = fileDataMap.value[config.key];
    if (fileData?.fileUrl && !fileData.dirty) {
      continue;
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
    fileDataMap.value[key]!.fileUrl = undefined;
    fileDataMap.value[key]!.dirty = false;
    updateFileId(key, Date.now());
  }
};

const ensureFileData = (key: string) => {
  if (!fileDataMap.value[key]) {
    fileDataMap.value[key] = {
      data: [],
      fileName: '',
      loading: false,
      fileType: 'tabular',
    };
  }
  return fileDataMap.value[key]!;
};

const setFileUrls = async (urls: Record<string, string>) => {
  for (const [key, fileUrl] of Object.entries(urls)) {
    if (!fileUrl) continue;

    const fileData = ensureFileData(key);
    const fileName = fileUrl.split('/').pop() || `${key} 历史文件`;
    fileData.data = [];
    fileData.fileName = fileName;
    fileData.fileType = isBinaryFile(fileName) ? 'binary' : 'tabular';
    fileData.fileUrl = fileUrl;
    fileData.fileId = undefined;
    fileData.dirty = false;
    updateFileId(key, Date.now());

    if (fileData.fileType === 'binary') {
      await fetchMetadata(key, { file_url: fileUrl });
    }
  }
};

const setFileIds = async (ids: Record<string, number>) => {
  for (const [key, fileId] of Object.entries(ids)) {
    if (!fileId) continue;

    const fileData = ensureFileData(key);
    fileData.data = [];
    fileData.fileName = `${key} (历史平台文件)`;
    fileData.fileType = 'binary';
    fileData.fileUrl = undefined;
    fileData.fileId = Number(fileId);
    fileData.dirty = false;
    updateFileId(key, Number(fileId));
    await fetchMetadata(key, { file_id: Number(fileId) });
  }
};

// 平台文件选择相关
const platformSelectorOpen = ref(false);
const currentSelectorKey = ref('');

const openPlatformSelector = (key: string) => {
  currentSelectorKey.value = key;
  platformSelectorOpen.value = true;
};

const handlePlatformFileSelect = async (file: any) => {
  if (!currentSelectorKey.value) return;

  const key = currentSelectorKey.value;
  fileDataMap.value[key]!.fileName = file.name;
  fileDataMap.value[key]!.fileType = 'binary';
  fileDataMap.value[key]!.fileId = Number(file.id);
  fileDataMap.value[key]!.fileUrl = undefined;
  fileDataMap.value[key]!.dirty = false;

  // 根据后缀判断类型
  const ext = file.name.split('.').pop()?.toLowerCase();
  const binaryExts = [
    'rds',
    'rdata',
    'rda',
    'h5ad',
    'h5',
    'loom',
    'zarr',
    'hdf5',
  ];
  if (binaryExts.includes(ext)) {
    fileDataMap.value[key]!.fileType = 'binary';
  } else {
    fileDataMap.value[key]!.fileType = 'tabular';
  }

  updateFileId(key, Number(file.id));
  message.success(`已选择文件: ${file.name}`);

  // 平台文件：自动解析 metadata
  if (binaryExts.includes(ext)) {
    await fetchMetadata(key, { file_id: Number(file.id) });
  }
};

// 获取未修改的示例文件 URL。后端会直接引用系统文件，避免把大文件内容回传。
const getFileUrls = (): Record<string, string> => {
  const urls: Record<string, string> = {};
  for (const config of fileConfigs.value) {
    const fileData = fileDataMap.value[config.key];
    if (fileData?.fileUrl && !fileData.dirty) {
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
};

// ========== Metadata 解析 ==========
const fetchMetadata = async (
  key: string,
  params: { file_id?: number; file_url?: string },
) => {
  metadataLoading.value = true;
  try {
    const data = await inspectFile(params);
    metadataMap.value[key] = data;
    metadataPage.value = 1;

    // 将 metadata 列名通过 headersChange 上报，复用 column_select 联动
    const allHeaders: Record<string, string[]> = {};
    for (const [fileKey, meta] of Object.entries(metadataMap.value)) {
      if (meta?.columns?.length > 0) {
        allHeaders[fileKey] = meta.columns;
      }
    }
    // 合并表格文件的 headers
    for (const [fileKey, fileData] of Object.entries(fileDataMap.value)) {
      if (
        fileData.fileType === 'tabular' &&
        fileData.data?.length > 0 &&
        fileData.data[0]
      ) {
        const headers = fileData.data[0].filter((h) => h.trim() !== '');
        if (headers.length > 0) {
          allHeaders[fileKey] = headers;
        }
      }
    }
    emit('headersChange', allHeaders);
    // 上报 metadata summary 数据，供 column_value_select 联动使用
    emit('metadataChange', { ...metadataMap.value });
    message.success(`已解析 ${data.n_cells} 个细胞的 metadata`);
  } catch (error: any) {
    console.error('Metadata inspection failed:', error);
    // 不阻塞流程，只提示
    message.warning('Metadata 解析失败，参数需手动输入');
  } finally {
    metadataLoading.value = false;
  }
};

// metadata 汇总表格列定义
const metadataColumns = [
  { title: '列名', dataIndex: 'column', width: 140 },
  { title: '类型', dataIndex: 'type', width: 80 },
  { title: '唯一值', dataIndex: 'unique', width: 70, align: 'center' as const },
  { title: '详情', dataIndex: 'detail' },
];

defineExpose({
  fillAllExamples,
  getFileContents,
  setFileContents,
  setFileUrls,
  setFileIds,
  getFileUrls,
  getFileIds,
});
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
        <Button v-if="!allBinaryMode" @click="downloadExample">
          下载示例 数据表
        </Button>
        <!-- 二进制模式提示 -->
        <span v-if="allBinaryMode" class="binary-hint-text">
          <Icon icon="mdi:information-outline" class="hint-icon-inline" />
          点击「示例」按钮加载示例数据文件
        </span>
      </Space>
    </div>

    <!-- ========== 全二进制模式：与普通模式一致的行布局 ========== -->
    <template v-if="allBinaryMode">
      <div
        v-for="config in fileConfigs"
        :key="config.key"
        class="file-input-row"
      >
        <label class="input-label">
          <span v-if="config.required" class="required">*</span>
          <span class="label-text"> {{ config.label || config.key }}： </span>
        </label>

        <Input
          :value="fileDataMap[config.key]?.fileName || '请选择文件'"
          readonly
          class="filename-input"
          placeholder="请选择文件"
        />

        <div class="action-buttons">
          <Button
            type="primary"
            class="btn-import"
            @click="openPlatformSelector(config.key)"
          >
            从我的数据选择
          </Button>
        </div>
      </div>

      <!-- 二进制文件状态卡片 -->
      <div
        class="binary-file-card"
        :class="{ 'card-success': currentBinaryFileData?.fileName }"
      >
        <Icon
          :icon="
            currentBinaryFileData?.fileName
              ? 'mdi:check-circle'
              : 'mdi:file-document-outline'
          "
          class="file-card-icon"
        />
        <div class="file-card-info">
          <div class="file-card-name">
            {{ currentBinaryFileData?.fileName || '请选择数据文件' }}
          </div>
          <div class="file-card-hint">
            {{
              currentBinaryFileData?.fileName
                ? '文件已选择，可以进行下一步'
                : '请先在我的数据上传 RDS/H5AD 文件后选择'
            }}
          </div>
        </div>
      </div>

      <!-- Metadata 汇总表格 -->
      <Spin :spinning="metadataLoading" tip="正在解析 metadata...">
        <div v-if="currentMetadataSummary.length" class="metadata-section">
          <div class="metadata-header">
            <Icon icon="mdi:table-eye" style="font-size: 16px" />
            <span>Metadata 概览</span>
            <Tag color="blue">
              {{ currentMetadata?.n_cells?.toLocaleString() }} cells
            </Tag>
            <Tag> {{ currentMetadata?.columns?.length }} columns </Tag>
          </div>
          <Table
            :columns="metadataColumns"
            :data-source="currentMetadataSummary"
            :pagination="metadataTablePagination"
            size="small"
            row-key="column"
            class="metadata-table"
          >
            <template #bodyCell="{ column: col, record }">
              <template v-if="col.dataIndex === 'type'">
                <Tag
                  :color="
                    record.type === 'numeric'
                      ? 'green'
                      : record.type === 'categorical'
                        ? 'blue'
                        : 'orange'
                  "
                >
                  {{ record.type }}
                </Tag>
              </template>
              <template v-else-if="col.dataIndex === 'detail'">
                <template v-if="record.type === 'numeric'">
                  <span class="detail-text">
                    min: {{ record.min }} / max: {{ record.max }} / mean:
                    {{ record.mean }}
                  </span>
                </template>
                <template v-else-if="record.values">
                  <Tooltip
                    v-if="record.values.length > 3"
                    :title="record.values.join(', ')"
                  >
                    <span class="detail-text">
                      {{ record.values.slice(0, 3).join(', ') }}
                      <span v-if="record.values.length > 3" class="more-text">
                        ...+{{ record.values.length - 3 }}
                      </span>
                    </span>
                  </Tooltip>
                  <span v-else class="detail-text">
                    {{ record.values.join(', ') }}
                  </span>
                </template>
              </template>
            </template>
          </Table>
        </div>
      </Spin>
    </template>

    <!-- ========== 普通模式：表格编辑模式 ========== -->
    <template v-else>
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
            :before-upload="
              (file: File) => handleImportForKey(config.key, file)
            "
            accept=".csv,.txt,.tsv,.xls,.xlsx"
          >
            <Button type="primary" class="btn-import">导 入</Button>
          </Upload>
          <Button
            danger
            class="btn-clear"
            @click="handleClearForKey(config.key)"
          >
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
        <Spin :spinning="fileDataMap[activeTab]?.loading" tip="正在解析文件...">
          <template v-for="config in fileConfigs" :key="config.key">
            <!-- 二进制文件：卡片展示 -->
            <div
              v-if="
                activeTab === config.key &&
                fileDataMap[config.key]?.fileType === 'binary'
              "
              class="binary-file-card"
            >
              <Icon icon="mdi:file-document-outline" class="file-card-icon" />
              <div class="file-card-info">
                <div class="file-card-name">
                  {{ fileDataMap[config.key]?.fileName }}
                </div>
                <div class="file-card-hint">
                  该文件为特殊格式（如 RDS、H5AD），无法在线预览
                </div>
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
        </Spin>
      </div>
    </template>

    <!-- 底部提示 + 下一步 -->
    <div class="footer">
      <div v-if="!allBinaryMode" class="hint">
        <Icon icon="mdi:information-outline" class="hint-icon" />
        <span>{{ footerHintText }}</span>
      </div>
      <div v-else></div>
      <Button type="primary" class="btn-next" @click="goNext">下一步</Button>
    </div>

    <!-- 平台文件选择器 -->
    <PlatformFileSelector
      v-model:open="platformSelectorOpen"
      :accept="
        allBinaryMode
          ? '.rds,.rdata,.rda,.h5ad,.h5,.loom,.zarr,.hdf5'
          : undefined
      "
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
  gap: 14px;
  align-items: center;
  min-height: 72px;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  transition: all 0.3s ease;
}

/* 成功状态：淡静雅致绿 */
.binary-file-card.card-success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.binary-file-card.card-success .file-card-icon {
  color: #10b981;
}

.binary-file-card.card-success .file-card-name {
  color: #065f46;
}

.binary-file-card.card-success .file-card-hint {
  color: #047857;
}

/* 表格区域内的卡片需要更大高度 */
.spreadsheet-area .binary-file-card {
  min-height: 200px;
}

.file-card-icon {
  flex-shrink: 0;
  font-size: 38px;
  color: #94a3b8;
}

.file-card-info {
  flex: 1;
}

.file-card-name {
  margin-bottom: 2px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.file-card-hint {
  font-size: 13px;
  color: #64748b;
}

/* ========== Metadata 汇总表格 ========== */
.metadata-section {
  margin-top: 20px;
  border: 1px solid #f1f5f9;
  background: #ffffff;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.02),
    0 2px 4px -2px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.metadata-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
}

/* Metadata 表头背景轻微化与留白 */
.metadata-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc !important;
  color: #64748b !important;
  font-weight: 500 !important;
  padding: 10px 16px !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

/* Metadata 行极薄下边框与宽松留白 */
.metadata-table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px !important;
  border-bottom: 1px solid #f8fafc !important;
  color: #475569;
}

.metadata-table :deep(.ant-pagination) {
  margin: 12px 16px !important;
}

.metadata-table :deep(.ant-pagination-total-text) {
  color: #64748b;
}

/* 重构 AntDV 原生的 Tag 标签色彩，抛弃廉价主色转而使用莫兰迪高级无边框填充 */
.metadata-table :deep(.ant-tag) {
  border: none !important;
  font-weight: 500;
  border-radius: 4px;
  padding: 0 6px;
}
.metadata-table :deep(.ant-tag-green) {
  background: #ecfdf5 !important;
  color: #059669 !important;
}
.metadata-table :deep(.ant-tag-blue) {
  background: #eff6ff !important;
  color: #2563eb !important;
}
.metadata-table :deep(.ant-tag-orange) {
  background: #fff7ed !important;
  color: #ea580c !important;
}

.detail-text {
  font-size: 12px;
  color: #64748b;
  /* 防止过长参数数值组导致撑爆高度并换行 */
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.more-text {
  color: #3b82f6;
  font-weight: 500;
  margin-left: 2px;
}
</style>
