<script lang="ts" setup>
/**
 * 分析工具通用使用页面 - 配置驱动版本 (Pro Max Optimized)
 *
 * 布局：左侧参数配置 (Config) / 右侧结果展示 (Result)
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import type {
  AnalysisTool,
  TaskInputFileRestoreInfo,
  TaskResultFile,
} from '#/api/analysis-tools';

import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useTabs } from '@vben/hooks';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Icon } from '@iconify/vue';
import {
  Button,
  message,
  Modal,
  Space,
  Spin,
  TabPane,
  Tabs,
  Typography,
} from 'ant-design-vue';

import {
  executeAnalysisTool,
  getAnalysisTool,
  getTaskFileUrl,
  getTaskInputData,
  getTaskResultFiles,
  getTaskStatus,
  replaceRunAnalysisTask,
  rerunAnalysisTask,
  saveTaskResultFile,
} from '#/api/analysis-tools';
import { getUserFolderTree } from '#/api/my-data';

import DataFileSelector from './components/DataFileSelector.vue';
import DynamicForm from './components/DynamicForm.vue';
import ResultRenderer from './components/ResultRenderer.vue';
import { pollTaskUntilDone } from './taskPolling';

const route = useRoute();
const router = useRouter();
const { setTabTitle } = useTabs();
const userStore = useUserStore();

// 获取 API 基础 URL
const apiBaseUrl = import.meta.env.VITE_GLOB_API_URL || '';

// 获取完整图片 URL（处理相对路径）
const getFullImageUrl = (url: null | string | undefined) => {
  if (!url) return '';
  if (url.startsWith('http') || !url.includes('/')) {
    return url;
  }
  return `${apiBaseUrl}${url}`;
};

// ========== 工具信息 ==========
const toolId = computed(() => Number(route.params.id));
const tool = ref<AnalysisTool | null>(null);
const loading = ref(false);
const analyzing = ref(false);
const activeTab = ref('data');
const trialRestrictionMessage =
  '当前账号暂未开通该功能。注册用户可使用示例数据体验分析。如需上传个人数据、保存结果到我的数据或提升每日分析次数，请联系管理员。';

const isRegisteredTrialUser = computed(() => {
  const roles = userStore.userInfo?.roles ?? [];
  return roles.includes('注册用户');
});

const showTrialRestriction = () => {
  Modal.info({
    title: '当前账号暂未开通该功能',
    content: trialRestrictionMessage,
    okText: '我知道了',
  });
};

const isTrialRestrictionError = (messageText: string) =>
  messageText.includes('注册用户') ||
  messageText.includes('暂未开通') ||
  messageText.includes('今日示例分析次数已用完');

// ========== 配置驱动计算属性 ==========
const hasInputSchema = computed(() => {
  const schema = tool.value?.input_schema as null | { files?: unknown[] };
  return schema?.files && schema.files.length > 0;
});

const hasParamSchema = computed(() => {
  const schema = tool.value?.param_schema as null | { properties?: object };
  return schema?.properties && Object.keys(schema.properties).length > 0;
});

const hasOutputConfig = computed(() => {
  const config = tool.value?.output_config as null | { outputs?: unknown[] };
  return config?.outputs && config.outputs.length > 0;
});

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  return '#';
}

function renderInlineMarkdown(value: string): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    const token = `@@GUIDE_TOKEN_${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  let text = value.replaceAll(/`([^`]+)`/g, (_match, code) =>
    stash(`<code>${escapeHtml(code)}</code>`),
  );

  text = text.replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url) => {
    const safeUrl = escapeAttr(sanitizeUrl(url));
    return stash(
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${renderInlineMarkdown(
        label,
      )}</a>`,
    );
  });

  let html = escapeHtml(text)
    .replaceAll(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  tokens.forEach((tokenHtml, index) => {
    html = html.replaceAll(`@@GUIDE_TOKEN_${index}@@`, tokenHtml);
  });

  return html;
}

function splitMarkdownTableRow(row: string): string[] {
  return row
    .trim()
    .replaceAll(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(row: string): boolean {
  const cells = splitMarkdownTableRow(row);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(/\s/g, '')))
  );
}

function renderMarkdownTable(lines: string[]): string {
  const [headerLine, , ...bodyLines] = lines;
  const headers = splitMarkdownTableRow(headerLine ?? '')
    .map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`)
    .join('');
  const rows = bodyLines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = splitMarkdownTableRow(line)
        .map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<div class="guide-table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function isBlockStart(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  return (
    /^#{1,6}\s+/.test(trimmed) ||
    /^-{3,}$/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*+]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    trimmed.startsWith('```') ||
    (trimmed.includes('|') && !!nextLine && isMarkdownTableSeparator(nextLine))
  );
}

function parseMarkdownHeading(
  line: string,
): null | { level: number; text: string } {
  const marker = line.match(/^#{1,6}/)?.[0];
  if (!marker || line[marker.length] !== ' ') return null;
  return {
    level: marker.length,
    text: line.slice(marker.length + 1),
  };
}

function parseMarkdownListItem(
  line: string,
): null | { ordered: boolean; text: string } {
  const trimmed = line.trim();
  if (['*', '+', '-'].includes(trimmed[0] ?? '') && trimmed[1] === ' ') {
    return {
      ordered: false,
      text: trimmed.slice(2),
    };
  }

  const separatorIndex = trimmed.indexOf('. ');
  if (separatorIndex > 0 && /^\d+$/.test(trimmed.slice(0, separatorIndex))) {
    return {
      ordered: true,
      text: trimmed.slice(separatorIndex + 2),
    };
  }

  return null;
}

// 将工具配置中的 Markdown 渲染为安全、结构化的使用说明 HTML。
function markdownToGuideHtml(markdown: string): string {
  const lines = markdown
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    const nextLine = lines[index + 1];

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLanguage = trimmed.slice(3).trim();
      const language = codeLanguage
        ? ` language-${escapeAttr(codeLanguage)}`
        : '';
      const codeLines: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !(lines[index] ?? '').trim().startsWith('```')
      ) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      html.push(
        `<pre><code class="${language.trim()}">${escapeHtml(
          codeLines.join('\n'),
        )}</code></pre>`,
      );
      continue;
    }

    const heading = parseMarkdownHeading(trimmed);
    if (heading) {
      const { level, text } = heading;
      html.push(`<h${level}>${renderInlineMarkdown(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (
      trimmed.includes('|') &&
      nextLine &&
      isMarkdownTableSeparator(nextLine)
    ) {
      const tableLines = [line, nextLine];
      index += 2;
      while (
        index < lines.length &&
        (lines[index] ?? '').trim().includes('|')
      ) {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }
      html.push(renderMarkdownTable(tableLines));
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (
        index < lines.length &&
        /^>\s?/.test((lines[index] ?? '').trim())
      ) {
        quoteLines.push((lines[index] ?? '').trim().replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(
        `<blockquote>${quoteLines
          .map((quoteLine) => renderInlineMarkdown(quoteLine))
          .join('<br>')}</blockquote>`,
      );
      continue;
    }

    const listMatch = parseMarkdownListItem(trimmed);
    if (listMatch) {
      const ordered = listMatch.ordered;
      const tag = ordered ? 'ol' : 'ul';
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = parseMarkdownListItem(lines[index] ?? '');
        if (!itemMatch || itemMatch.ordered !== ordered) break;
        items.push(`<li>${renderInlineMarkdown(itemMatch.text)}</li>`);
        index += 1;
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() &&
      !isBlockStart(lines[index] ?? '', lines[index + 1])
    ) {
      paragraphLines.push((lines[index] ?? '').trim());
      index += 1;
    }
    html.push(
      `<p>${paragraphLines
        .map((paragraphLine) => renderInlineMarkdown(paragraphLine))
        .join('<br>')}</p>`,
    );
  }

  return html.join('\n');
}

// 渲染 guide_doc
const renderedGuideHtml = computed(() => {
  const doc = tool.value?.guide_doc;
  if (!doc) return '';
  return markdownToGuideHtml(doc);
});

// ========== 表单状态 ==========
const inputFiles = ref<Record<string, null | number>>({});
const formParams = ref<Record<string, unknown>>({});

// ========== 表头状态 ==========
const currentHeaders = ref<Record<string, string[]>>({});
const handleHeadersChange = (headers: Record<string, string[]>) => {
  currentHeaders.value = headers;
};

// ========== Metadata 状态 ==========
const currentMetadata = ref<
  Record<
    string,
    {
      columns: string[];
      n_cells: number;
      reductions?: string[];
      summary: Array<{ column: string; type: string; values?: string[] }>;
    }
  >
>({});
const handleMetadataChange = (metadata: Record<string, any>) => {
  currentMetadata.value = metadata;
};

const pairSelectKeys = new Set(['compare_pairs']);

watch(
  () => formParams.value.split_by,
  (newValue, oldValue) => {
    if (
      oldValue !== undefined &&
      newValue !== oldValue &&
      formParams.value.compare_pairs
    ) {
      formParams.value = { ...formParams.value, compare_pairs: '' };
    }
  },
);

// 动态生成参数模式（注入表头选项）
const dynamicParamSchema = computed(() => {
  if (!tool.value?.param_schema) return null;

  // 深拷贝原始 schema 以免污染原始数据
  // 注意：需要使用 toRaw 解包 Vue 响应式 Proxy，否则 structuredClone 会报错
  const schema = structuredClone(toRaw(tool.value.param_schema));

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties) as any) {
      const usesPairSelect =
        pairSelectKeys.has(key) || prop.widget === 'metadata_pair_select';

      if (usesPairSelect && prop.widget === 'metadata_value_select') {
        prop.widget = 'metadata_pair_select';
      }

      if (prop.widget === 'column_select') {
        // 智能获取列名选项
        // 优先使用绑定的 fileKey，否则默认使用第一个输入文件
        const fileKey =
          prop.fileKey || tool.value.example_data?.[0]?.key || 'data_input';
        const headers = currentHeaders.value[fileKey] || [];

        if (headers.length > 0) {
          prop.type = 'string';
          prop.enum = headers;
        }
      }

      // === 通用 metadata 联动：与 cwmda 分支 scTenifoldKnk 模式一致 ===
      const fileKey =
        prop.fileKey || tool.value.example_data?.[0]?.key || 'data_input';
      const meta = currentMetadata.value[fileKey];

      if (meta?.summary && meta.summary.length > 0) {
        // metadata_column_select: 将 metadata 的 categorical 列注入下拉选项
        if (prop.widget === 'metadata_column_select') {
          const categoryCols = meta.summary
            .filter((col: any) => col.type === 'categorical')
            .map((col: any) => col.column);
          if (categoryCols.length > 0) {
            prop.type = 'string';
            prop.enum = categoryCols;
            prop.widget = 'select';
          }
        }

        // metadata_reduction_select: 将 Seurat reductions / AnnData obsm 注入下拉选项
        if (prop.widget === 'metadata_reduction_select') {
          const reductions = Array.isArray(meta.reductions)
            ? meta.reductions
            : [];
          if (reductions.length > 0) {
            prop.type = 'string';
            prop.enum = reductions;
            prop.widget = 'select';
          }
        }

        // metadata_value_select: 依赖另一参数选中的列，填充该列唯一值
        if (
          (prop.widget === 'metadata_value_select' ||
            prop.widget === 'metadata_pair_select') &&
          prop.depends_on
        ) {
          const selectedCol = formParams.value[prop.depends_on] as string;
          if (selectedCol) {
            const colMeta = meta.summary.find(
              (col: any) => col.column === selectedCol,
            );
            if (colMeta?.values) {
              const values = Array.isArray(colMeta.values)
                ? colMeta.values
                : [];
              if (values.length > 0) {
                prop.type = 'string';
                prop.enum = values;
                prop.widget = usesPairSelect
                  ? 'metadata_pair_select'
                  : prop.multiple === false
                    ? 'select'
                    : 'multi-select';
              }
            }
          }
        }
      }
    }
  }
  return schema;
});

// ========== 结果状态 ==========
const hasResult = ref(false);
const taskFailed = ref(false);
const errorMessage = ref('');
const taskId = ref<string>('');
const rerunTaskId = ref<number | null>(null);
const outputDir = ref<string>('');
const isRerunMode = computed(() => rerunTaskId.value !== null);
const sessionTaskId = ref<number | null>(null);
const isHistoricalTaskView = computed(() => Boolean(route.query.task_id));
const shouldReplaceCurrentShortTask = computed(
  () =>
    !tool.value?.is_long_running &&
    !isRerunMode.value &&
    !isHistoricalTaskView.value &&
    sessionTaskId.value !== null,
);

interface ConverterSummary {
  input_file_name?: string;
  input_file_size?: number;
  output_file_name?: string;
  conversion_direction?: string;
  conversion_direction_label?: string;
  source_file_name?: string;
  source_extension?: string;
  target_extension?: string;
  n_cells?: number;
  n_features?: number;
  assays?: string[];
  reductions?: string[];
  retained_content?: string[];
  output_file_size?: number;
  warnings?: string[];
}

interface ConverterFolderNode {
  children?: ConverterFolderNode[];
  key: string;
  title: string;
}

interface ConverterFolderOption {
  depth: number;
  id: null | number;
  name: string;
}

const converterResultFiles = ref<TaskResultFile[]>([]);
const converterSummary = ref<ConverterSummary | null>(null);
const converterDownloading = ref(false);
const converterSaveModalOpen = ref(false);
const converterSaving = ref(false);
const converterFolderPickerOpen = ref(false);
const converterFoldersLoading = ref(false);
const converterFolderTree = ref<ConverterFolderNode[]>([]);
const converterSaveFileName = ref('');
const converterSaveTargetFolderId = ref<null | number>(null);
const converterSaveTargetFolderName = ref('根目录');

const isRdsH5adConverter = computed(() => {
  const scriptPath = tool.value?.script_path || '';
  return scriptPath.includes('rds_h5ad_converter');
});

const converterMainFile = computed(() =>
  converterResultFiles.value.find((file) =>
    /_conver\.(h5ad|rds)$/i.test(file.name),
  ),
);

const converterDirectionLabels: Record<string, string> = {
  h5ad_to_rds: 'H5AD -> RDS',
  rds_to_h5ad: 'RDS -> H5AD',
};

const displayValueOrDash = (value?: null | string) => {
  const trimmed = value?.trim();
  return trimmed || '-';
};

const converterInputFileName = computed(() =>
  displayValueOrDash(
    converterSummary.value?.input_file_name ||
      converterSummary.value?.source_file_name,
  ),
);

const converterOutputFileName = computed(() =>
  displayValueOrDash(
    converterSummary.value?.output_file_name ||
      converterMainFile.value?.name.split('/').pop(),
  ),
);

const converterDirectionLabel = computed(() => {
  const label = converterSummary.value?.conversion_direction_label;
  if (label?.trim()) return label;

  const direction = converterSummary.value?.conversion_direction;
  return direction ? (converterDirectionLabels[direction] ?? direction) : '-';
});

const converterFolderOptions = computed<ConverterFolderOption[]>(() => {
  const options: ConverterFolderOption[] = [
    { depth: 0, id: null, name: '根目录（我的数据）' },
  ];
  const walk = (nodes: ConverterFolderNode[], depth: number) => {
    for (const node of nodes) {
      const id = Number(node.key);
      if (Number.isFinite(id)) {
        options.push({ depth, id, name: node.title });
      }
      if (node.children?.length) {
        walk(node.children, depth + 1);
      }
    }
  };
  walk(converterFolderTree.value, 1);
  return options;
});

const formatFileSize = (size?: number) => {
  if (!size || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatOptionalFileSize = (size?: number) =>
  size && size > 0 ? formatFileSize(size) : '-';

const converterOutputFileSize = computed(
  () =>
    converterSummary.value?.output_file_size ?? converterMainFile.value?.size,
);

const resetConverterResultState = () => {
  converterResultFiles.value = [];
  converterSummary.value = null;
  converterSaveModalOpen.value = false;
  converterFolderPickerOpen.value = false;
  converterSaveFileName.value = '';
  converterSaveTargetFolderId.value = null;
  converterSaveTargetFolderName.value = '根目录';
};

const fetchConverterSummary = async (currentTaskId: string) => {
  try {
    const accessStore = useAccessStore();
    const response = await fetch(
      getTaskFileUrl(Number(currentTaskId), '.conversion_summary.json'),
      {
        headers: {
          Authorization: accessStore.accessToken
            ? `Bearer ${accessStore.accessToken}`
            : '',
        },
      },
    );
    if (!response.ok) {
      converterSummary.value = null;
      return;
    }
    converterSummary.value = (await response.json()) as ConverterSummary;
  } catch {
    converterSummary.value = null;
  }
};

const fetchConverterResultDetails = async (currentTaskId = taskId.value) => {
  if (!currentTaskId || !isRdsH5adConverter.value) return;
  const files = await getTaskResultFiles(Number(currentTaskId));
  converterResultFiles.value = files.filter(
    (file) =>
      file.name !== 'task.log' &&
      file.name !== '.conversion_summary.json' &&
      /_conver\.(h5ad|rds)$/i.test(file.name),
  );
  await fetchConverterSummary(currentTaskId);
};

// ========== 组件引用 ==========
const dataFileSelectorRef = ref<InstanceType<typeof DataFileSelector>>();

// ========== 回退兼容：硬编码图表 ==========
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// ========== API 调用 ==========
const fetchTool = async () => {
  loading.value = true;
  try {
    tool.value = await getAnalysisTool(toolId.value);
    // 动态更新页签标题为工具名称
    if (tool.value?.title) {
      document.title = `${tool.value.title} - ${import.meta.env.VITE_APP_TITLE}`;
      setTabTitle(tool.value.title);
    }

    // 初始化参数默认值
    if (tool.value?.param_schema?.properties) {
      const defaults: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(
        tool.value.param_schema.properties as Record<string, any>,
      )) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
      }
      formParams.value = defaults;
    }
  } catch (error) {
    message.error('获取工具信息失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 提交分析
const submitAnalysis = async () => {
  if (analyzing.value) return;

  // 验证必填文件
  const inputSchema = tool.value?.input_schema as null | {
    files?: Array<{ key: string; label?: string; required?: boolean }>;
  };
  if (inputSchema?.files) {
    for (const file of inputSchema.files) {
      if (file.required && !inputFiles.value[file.key]) {
        message.warning(`请选择 ${file.label || file.key}`);
        return;
      }
    }
  }

  // 验证必填参数
  const paramSchema = tool.value?.param_schema as null | {
    properties?: Record<string, { required?: boolean; title?: string }>;
  };
  if (paramSchema?.properties) {
    for (const [key, config] of Object.entries(paramSchema.properties)) {
      if (config.required) {
        const value = formParams.value[key];
        // 检查值是否为空（null、undefined、空字符串）
        if (value === null || value === undefined || value === '') {
          message.warning(`${config.title || key} 是必填项`);
          return;
        }
      }
    }
  }

  const comparePairs = formParams.value.compare_pairs;
  if (typeof comparePairs === 'string' && comparePairs.trim()) {
    const pair = comparePairs
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (comparePairs.includes(';') || pair.length !== 2) {
      message.warning('指定比较组合需要同时选择两个分组，或清空以自动两两比较');
      return;
    }
    if (pair[0] === pair[1]) {
      message.warning('指定比较组合中的两个分组不能相同');
      return;
    }
    formParams.value = {
      ...formParams.value,
      compare_pairs: `${pair[0]},${pair[1]}`,
    };
  }

  analyzing.value = true;
  showGuide.value = false;
  hasResult.value = false;
  outputDir.value = '';
  taskFailed.value = false;
  errorMessage.value = '';
  resetConverterResultState();
  const replacingCurrentShortTask = shouldReplaceCurrentShortTask.value;
  message.loading(
    replacingCurrentShortTask ? '正在更新当前结果...' : '正在提交分析任务...',
    0,
  );

  try {
    // 获取表格数据内容
    const fileContents = dataFileSelectorRef.value?.getFileContents() ?? {};
    // 获取二进制文件 URL（示例数据等）
    const fileUrls = dataFileSelectorRef.value?.getFileUrls?.() ?? {};
    // 获取平台文件 ID
    const fileIds = dataFileSelectorRef.value?.getFileIds?.() ?? {};

    if (
      isRegisteredTrialUser.value &&
      (Object.keys(fileContents).length > 0 || Object.keys(fileIds).length > 0)
    ) {
      message.destroy();
      analyzing.value = false;
      showTrialRestriction();
      return;
    }

    const requestData = {
      files: fileIds,
      file_contents: fileContents,
      file_urls: fileUrls,
      params: formParams.value,
    };

    const response = isRerunMode.value
      ? await rerunAnalysisTask(rerunTaskId.value!, requestData)
      : replacingCurrentShortTask
        ? await replaceRunAnalysisTask(sessionTaskId.value!, requestData)
        : await executeAnalysisTool(toolId.value, requestData);

    taskId.value = String(response.task_id);
    if (
      !response.is_long_running &&
      !isRerunMode.value &&
      !isHistoricalTaskView.value
    ) {
      sessionTaskId.value = response.task_id;
    }
    message.destroy();

    // 长时间任务：跳转到任务中心
    if (response.is_long_running) {
      message.success(
        isRerunMode.value
          ? '任务已重新提交，请在任务中心查看进度'
          : '任务已提交，请在任务中心查看进度',
      );
      analyzing.value = false;
      // 根据当前路由判断跳转目标：用户端跳 /tasks，后台管理端跳 /analysis/tasks
      const tasksPath = route.path.startsWith('/analysis/')
        ? '/analysis/tasks'
        : '/tasks';
      router.push({
        path: tasksPath,
        query: { highlight: String(response.task_id) },
      });
      return;
    }

    // 短时间任务：保持原有轮询逻辑
    message.loading('任务已提交，正在分析中...', 0);

    const finalStatus = await pollTaskUntilDone(response.task_id, getTaskStatus);
    message.destroy();

    if (finalStatus.status === 'completed') {
      outputDir.value = finalStatus.output_dir || '';
      hasResult.value = true;
      rerunTaskId.value = null;
      if (isRdsH5adConverter.value) {
        await fetchConverterResultDetails(String(finalStatus.id));
      }
      message.success(replacingCurrentShortTask ? '结果已更新' : '分析完成！');

      // 回退兼容：如果没有 output_config，使用硬编码图表
      if (!tool.value?.output_config && !isRdsH5adConverter.value) {
        setTimeout(() => renderLegacyChart(), 100);
      }
    } else {
      hasResult.value = false;
      outputDir.value = '';
      taskFailed.value = true;
      errorMessage.value = finalStatus.error_message || '分析失败，请重试';
      message.error(finalStatus.error_message || '分析失败，请重试');
    }
  } catch (error: any) {
    message.destroy();
    hasResult.value = false;
    outputDir.value = '';
    taskFailed.value = true;
    errorMessage.value = error?.message || '分析失败，请重试';
    if (isTrialRestrictionError(errorMessage.value)) {
      showTrialRestriction();
    } else {
      message.error(errorMessage.value);
    }
    console.error(error);
  } finally {
    analyzing.value = false;
  }
};

// 回退兼容：硬编码图表渲染
const renderLegacyChart = () => {
  renderEcharts({
    title: { text: tool.value?.title || '分析结果', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '15%', containLabel: true },
    xAxis: { type: 'value', name: 'Count' },
    yAxis: { type: 'category', data: ['示例1', '示例2', '示例3'] },
    series: [{ type: 'bar', data: [10, 20, 30] }],
  });
};

// 监听参数变化，实时更新图表
watch(
  formParams,
  () => {
    if (
      hasResult.value &&
      !tool.value?.output_config &&
      !isRdsH5adConverter.value
    ) {
      renderLegacyChart();
    }
  },
  { deep: true },
);

// 返回上一页：优先使用浏览器历史，否则根据 referrer 判断
const goBack = () => {
  // 如果有浏览历史，直接返回上一页
  if (window.history.length > 1) {
    router.back();
  } else {
    // 否则跳转到云工具广场
    router.push('/tools');
  }
};

const showGuide = ref(true);
const openGuide = () => {
  showGuide.value = true;
};

const previewResult = () => {
  // 如果已有结果，直接切换视图
  if (hasResult.value) {
    showGuide.value = false;
    return;
  }

  // 切换到结果视图，显示空状态提示（引导用户操作）
  showGuide.value = false;
};

const downloadConverterMainFile = async () => {
  if (!taskId.value || !converterMainFile.value) {
    return message.warning('暂无可下载的转换结果');
  }

  if (converterDownloading.value) return;

  converterDownloading.value = true;
  message.loading({
    content: '正在下载转换文件，请稍候...',
    key: 'converterDownload',
    duration: 0,
  });

  try {
    const accessStore = useAccessStore();
    const response = await fetch(
      getTaskFileUrl(Number(taskId.value), converterMainFile.value.name),
      {
        headers: {
          Authorization: accessStore.accessToken
            ? `Bearer ${accessStore.accessToken}`
            : '',
        },
      },
    );
    if (!response.ok) {
      return message.error({
        content: '下载失败，请重试',
        key: 'converterDownload',
      });
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      converterMainFile.value.name.split('/').pop() ||
      converterMainFile.value.name;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return message.success({
      content: '下载开始',
      key: 'converterDownload',
    });
  } catch (error) {
    console.error('Converter download failed:', error);
    return message.error({
      content: '下载失败，请重试',
      key: 'converterDownload',
    });
  } finally {
    converterDownloading.value = false;
  }
};

const selectConverterSaveFolder = (id: null | number, name: string) => {
  converterSaveTargetFolderId.value = id;
  converterSaveTargetFolderName.value = name;
  converterFolderPickerOpen.value = false;
};

const openConverterSaveModal = async () => {
  if (!converterMainFile.value) {
    return message.warning('暂无可保存的转换结果');
  }
  if (isRegisteredTrialUser.value) {
    showTrialRestriction();
    return;
  }
  converterSaveFileName.value =
    converterMainFile.value.name.split('/').pop() || converterMainFile.value.name;
  converterSaveTargetFolderId.value = null;
  converterSaveTargetFolderName.value = '根目录';
  converterSaveModalOpen.value = true;
  converterFoldersLoading.value = true;
  try {
    const tree = (await getUserFolderTree()) as unknown as ConverterFolderNode[];
    const root = tree[0];
    converterFolderTree.value =
      root?.key === 'root' ? (root.children ?? []) : tree;
  } catch {
    converterFolderTree.value = [];
  } finally {
    converterFoldersLoading.value = false;
  }
};

const confirmConverterSave = async () => {
  if (!taskId.value || !converterMainFile.value) return;
  converterSaving.value = true;
  try {
    const saved = await saveTaskResultFile(Number(taskId.value), {
      file_path: converterMainFile.value.name,
      folder_id: converterSaveTargetFolderId.value,
      filename: converterSaveFileName.value,
    });
    converterSaveModalOpen.value = false;
    message.success(
      `已保存到「${converterSaveTargetFolderName.value}」: ${saved.name}`,
    );
  } catch (error: any) {
    message.error(`保存失败: ${error?.message || '未知错误'}`);
  } finally {
    converterSaving.value = false;
  }
};

const downloadResult = async () => {
  if (!hasResult.value || !taskId.value) {
    return message.warning('请先提交分析');
  }

  if (isRdsH5adConverter.value) {
    return downloadConverterMainFile();
  }

  // 获取 output_config 中的输出文件配置
  const outputConfig = tool.value?.output_config as null | {
    outputs?: Array<{
      key: string;
      path: string;
      title?: string;
      type?: string;
    }>;
  };
  const outputs = outputConfig?.outputs || [];

  if (outputs.length === 0) {
    return message.warning('暂无可下载的结果文件');
  }

  message.loading({ content: '正在准备下载...', key: 'download' });

  try {
    // 下载所有输出文件
    for (const output of outputs) {
      const fileUrl = `/api/v1/sys/analysis-tools/tasks/${taskId.value}/files/${output.path}`;

      // 使用 store 获取 Token 进行认证下载
      const accessStore = useAccessStore();
      const token = accessStore.accessToken;

      const response = await fetch(fileUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      // 获取文件 blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = output.path.split('/').pop() || output.path;
      document.body.append(link);
      link.click();
      link.remove();

      // 释放 URL
      URL.revokeObjectURL(url);

      // 如果有多个文件，稍微延迟一下避免浏览器阻止
      if (outputs.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    message.success({ content: '下载完成', key: 'download' });
  } catch (error) {
    console.error('下载失败:', error);
    message.error({ content: '下载失败，请重试', key: 'download' });
  }
};

// 重置参数为默认值
const handleReset = () => {
  if (tool.value?.param_schema?.properties) {
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(
      tool.value.param_schema.properties as Record<string, any>,
    )) {
      if (prop.default !== undefined) {
        defaults[key] = prop.default;
      }
    }
    formParams.value = defaults;
    message.success('参数已重置');
  }
};

// 导入参数文件
const handleImportParams = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (typeof json === 'object') {
        formParams.value = { ...formParams.value, ...json };
        message.success('参数导入成功');
      }
    } catch {
      message.error('参数文件格式错误');
    }
  });
  input.click();
};

// 导出参数文件
const handleExportParams = () => {
  const data = JSON.stringify(formParams.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tool.value?.title || 'analysis'}_params_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('参数导出成功');
};

type RestoreTaskInputDataOptions = {
  restoreFiles?: boolean;
};

// 从 URL 参数加载历史任务输入；查看结果时可跳过文件恢复，避免重新解析大型 RDS/H5AD。
const restoreTaskInputData = async (
  taskIdFromUrl: number,
  options: RestoreTaskInputDataOptions = {},
) => {
  const { restoreFiles = true } = options;
  const inputData = await getTaskInputData(taskIdFromUrl);
  if (inputData.input_params) {
    formParams.value = inputData.input_params as Record<string, unknown>;
  }

  setTimeout(() => {
    if (
      inputData.file_contents &&
      Object.keys(inputData.file_contents).length > 0
    ) {
      dataFileSelectorRef.value?.setFileContents(inputData.file_contents);
    }

    if (!restoreFiles) {
      return;
    }

    const fileUrls: Record<string, string> = {};
    const fileIds: Record<string, number> = {};
    const missingFiles: string[] = [];

    for (const [key, info] of Object.entries(
      inputData.input_files ?? {},
    ) as Array<[string, TaskInputFileRestoreInfo]>) {
      if (info.kind === 'example_url' && info.file_url) {
        fileUrls[key] = info.file_url;
      } else if (info.kind === 'platform_file' && info.file_id) {
        fileIds[key] = info.file_id;
      } else if (!inputData.file_contents?.[key]) {
        missingFiles.push(info.file_name || key);
      }
    }

    dataFileSelectorRef.value?.setFileUrls?.(fileUrls);
    dataFileSelectorRef.value?.setFileIds?.(fileIds);

    if (missingFiles.length > 0) {
      message.warning(
        `以下历史输入文件无法自动恢复，请重新选择：${missingFiles.join('、')}`,
      );
    }
  }, 100);
};

const loadTaskResult = async (taskIdFromUrl: number) => {
  try {
    const status = await getTaskStatus(taskIdFromUrl);
    sessionTaskId.value = null;
    if (status.status === 'completed') {
      taskId.value = String(taskIdFromUrl);
      outputDir.value = status.output_dir || '';
      hasResult.value = true;
      showGuide.value = false;
      activeTab.value = 'params';

      // 查看历史结果直接使用任务状态中的参数快照，避免请求 input-data 导致大文件任务超时。
      if (status.input_params) {
        formParams.value = status.input_params as Record<string, unknown>;
      }

      if (isRdsH5adConverter.value) {
        await fetchConverterResultDetails(String(status.id));
      }

      message.success('已加载任务结果');
    } else if (status.status === 'failed') {
      taskFailed.value = true;
      errorMessage.value = status.error_message || '任务执行失败';
      showGuide.value = false;
    }
  } catch (error) {
    console.error('加载任务结果失败:', error);
  }
};

const loadTaskForRerun = async (taskIdFromUrl: number) => {
  try {
    const status = await getTaskStatus(taskIdFromUrl);
    sessionTaskId.value = null;
    if (status.status !== 'failed') {
      message.warning('只有失败任务可以调整参数并重跑');
      return;
    }

    rerunTaskId.value = taskIdFromUrl;
    taskId.value = String(taskIdFromUrl);
    hasResult.value = false;
    taskFailed.value = false;
    errorMessage.value = '';
    showGuide.value = false;
    activeTab.value = 'params';
    await restoreTaskInputData(taskIdFromUrl);
    message.success('已载入失败任务参数，请调整后重新提交');
  } catch (error) {
    console.error('加载失败任务输入数据失败:', error);
    message.error('加载失败任务输入数据失败');
  }
};

onMounted(async () => {
  await fetchTool();

  // 检查 URL 中是否有 task_id 参数
  const taskIdParam = route.query.task_id;
  const rerunTaskIdParam = route.query.rerun_task_id;
  const taskNameParam = route.query.task_name;

  if (rerunTaskIdParam) {
    await loadTaskForRerun(Number(rerunTaskIdParam));
  } else if (taskIdParam) {
    await loadTaskResult(Number(taskIdParam));

    // 如果有任务名称，使用任务名称更新标签
    if (taskNameParam && typeof taskNameParam === 'string') {
      setTabTitle(taskNameParam);
      document.title = `${taskNameParam} - ${import.meta.env.VITE_APP_TITLE}`;
    }
  }
});
</script>

<template>
  <Page auto-content-height class="page-container">
    <Spin :spinning="loading">
      <!-- Header -->
      <div class="header-bar">
        <div class="header-left">
          <Button type="text" shape="circle" class="back-btn" @click="goBack">
            <Icon icon="mdi:arrow-left" style="font-size: 20px" />
          </Button>
          <div v-if="tool" class="tool-info">
            <div
              class="tool-icon"
              :style="{
                backgroundColor: tool.icon?.includes('/')
                  ? 'transparent'
                  : `${tool.color || '#1890ff'}15`,
                color: tool.color || '#1890ff',
                overflow: 'hidden',
              }"
            >
              <img
                v-if="tool.icon?.includes('/')"
                :src="getFullImageUrl(tool.icon)"
                alt="工具预览图"
                class="tool-preview-img"
              />
              <Icon v-else :icon="tool.icon?.trim() || 'mdi:chart-bar'" />
            </div>
            <h1 class="tool-title">{{ tool.title }}</h1>
          </div>
        </div>
      </div>

      <!-- Main Content: Result (Left) / Config (Right) -->
      <div class="main-content">
        <!-- Result: Main Panel (Flex Grow) -->
        <div class="result-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <Icon icon="mdi:chart-box" class="panel-header-icon" />
              <span class="panel-header-text">分析结果</span>
            </div>
            <Space>
              <Button
                :type="showGuide ? 'primary' : 'text'"
                size="small"
                @click="openGuide"
              >
                <Icon icon="mdi:book-open-outline" /> 使用指南
              </Button>
              <Button
                :type="!showGuide ? 'primary' : 'text'"
                :ghost="false"
                size="small"
                @click="previewResult"
              >
                <Icon icon="mdi:eye-outline" />
                {{ hasResult ? '查看结果' : '结果预览' }}
              </Button>
              <div class="v-divider"></div>
              <Button
                type="primary"
                size="small"
                :loading="converterDownloading"
                @click="downloadResult"
              >
                <Icon icon="mdi:download" /> 下载
              </Button>
            </Space>
          </div>

          <div class="result-content">
            <div v-if="analyzing" class="loading-state">
              <Spin size="large" />
              <p class="mt-4 text-slate-500">正在进行数据分析，请耐心等待...</p>
            </div>

            <!-- 使用指南 (Embedded - High Priority) -->
            <div v-else-if="showGuide" class="guide-content">
              <div class="guide-card">
                <!-- 使用 Vditor.md2html 渲染的纯 HTML -->
                <div
                  v-if="renderedGuideHtml"
                  class="guide-md-content vditor-reset"
                  v-html="renderedGuideHtml"
                ></div>
                <!-- Fallback: 默认通用指南 -->
                <Typography v-else>
                  <Typography.Title :level="3">快速开始</Typography.Title>
                  <Typography.Paragraph>
                    欢迎使用在线分析工具。本工具支持多种格式的数据文件输入，并提供高度可配置的参数选项。
                  </Typography.Paragraph>

                  <Typography.Title :level="4">1. 数据准备</Typography.Title>
                  <Typography.Paragraph>
                    请准备符合以下要求的 CSV 或 Excel 文件：
                    <ul>
                      <li>第一行为表头（列名）</li>
                      <li>第一列为样本或基因 ID</li>
                      <li>数值数据必须为纯数字</li>
                    </ul>
                  </Typography.Paragraph>

                  <Typography.Title :level="4">2. 参数设置</Typography.Title>
                  <Typography.Paragraph>
                    在右侧参数面板中配置分析参数：
                    <ul>
                      <li>
                        <strong>通用参数</strong>：包括图表标题、配色方案等。
                      </li>
                      <!-- eslint-disable vue/html-closing-bracket-newline -->
                      <li>
                        <strong>特殊参数</strong
                        >：根据分析方法设置的阈值、算法选项等。
                      </li>
                      <!-- eslint-enable vue/html-closing-bracket-newline -->
                    </ul>
                  </Typography.Paragraph>

                  <Typography.Title :level="4">3. 查看结果</Typography.Title>
                  <Typography.Paragraph>
                    点击"提交分析"后，系统将在左侧面板生成交互式图表。您可以：
                    <ul>
                      <li>缩放和拖拽图表</li>
                      <li>导出图片 (PNG/PDF)</li>
                      <li>下载原始分析结果文件</li>
                    </ul>
                  </Typography.Paragraph>

                  <div
                    class="demo-image-placeholder my-4 rounded border border-dashed bg-gray-50 p-4 text-center text-gray-400"
                  >
                    [示例数据截图占位符]
                  </div>
                </Typography>
              </div>
            </div>

            <div
              v-else-if="hasResult && isRdsH5adConverter"
              class="converter-result"
            >
              <div v-if="converterMainFile" class="converter-file-card">
                <div class="converter-file-main">
                  <Icon icon="mdi:file-swap" class="converter-file-icon" />
                  <div>
                    <div class="converter-file-name">
                      {{ converterMainFile.name }}
                    </div>
                    <div class="converter-file-size">
                      {{ formatFileSize(converterMainFile.size) }}
                    </div>
                  </div>
                </div>
                <Space>
                  <Button
                    type="primary"
                    :loading="converterDownloading"
                    @click="downloadConverterMainFile"
                  >
                    <Icon icon="mdi:download" /> 下载
                  </Button>
                  <Button @click="openConverterSaveModal">
                    <Icon icon="mdi:content-save-outline" />
                    保存到我的数据
                  </Button>
                </Space>
              </div>

              <div v-else class="converter-empty">
                <Icon icon="mdi:file-search-outline" />
                <span>暂无可用的转换主文件</span>
              </div>

              <div v-if="converterSummary" class="converter-summary">
                <h3>转换详情</h3>
                <div class="converter-summary-grid">
                  <div>
                    <span>输入文件</span>
                    <strong>{{ converterInputFileName }}</strong>
                  </div>
                  <div>
                    <span>输出文件</span>
                    <strong>{{ converterOutputFileName }}</strong>
                  </div>
                  <div>
                    <span>转换方向</span>
                    <strong>{{ converterDirectionLabel }}</strong>
                  </div>
                  <div>
                    <span>输入大小</span>
                    <strong>
                      {{
                        formatOptionalFileSize(converterSummary.input_file_size)
                      }}
                    </strong>
                  </div>
                  <div>
                    <span>细胞数</span>
                    <strong>{{ converterSummary.n_cells ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>基因数</span>
                    <strong>{{ converterSummary.n_features ?? '-' }}</strong>
                  </div>
                  <div>
                    <span>输出大小</span>
                    <strong>
                      {{ formatOptionalFileSize(converterOutputFileSize) }}
                    </strong>
                  </div>
                </div>
                <div v-if="converterSummary.assays?.length" class="converter-tags">
                  <span v-for="item in converterSummary.assays" :key="item">
                    {{ item }}
                  </span>
                </div>
                <div
                  v-if="converterSummary.reductions?.length"
                  class="converter-tags"
                >
                  <span v-for="item in converterSummary.reductions" :key="item">
                    {{ item }}
                  </span>
                </div>
                <ul
                  v-if="converterSummary.warnings?.length"
                  class="converter-warnings"
                >
                  <li
                    v-for="warning in converterSummary.warnings"
                    :key="warning"
                  >
                    {{ warning }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- 动态结果渲染 -->
            <ResultRenderer
              v-else-if="hasResult && hasOutputConfig"
              :config="tool?.output_config ?? null"
              :output-dir="outputDir"
              :task-id="taskId"
            />

            <!-- 回退兼容：硬编码图表 -->
            <div
              v-else-if="hasResult && !hasOutputConfig"
              class="chart-container"
            >
              <EchartsUI ref="chartRef" />
            </div>

            <!-- 任务失败状态 -->
            <div v-else-if="taskFailed" class="error-state">
              <div class="error-state-visual">
                <Icon icon="mdi:alert-circle-outline" />
              </div>
              <div class="text-center">
                <h3 class="error-title">分析失败</h3>
                <p class="error-desc">{{ errorMessage }}</p>
                <Button type="primary" class="mt-4" @click="submitAnalysis">
                  <Icon icon="mdi:refresh" /> 重新分析
                </Button>
              </div>
            </div>

            <div v-else class="empty-state">
              <div class="empty-state-visual">
                <Icon icon="mdi:chart-timeline-variant" />
              </div>
              <div class="text-center">
                <h3 class="empty-title">暂无分析结果</h3>
                <p class="empty-desc">
                  请先在右侧上传数据、调整参数，然后点击"提交分析"
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Config Panel (Fixed Width) -->
        <div class="control-panel">
          <div v-if="isRerunMode" class="rerun-notice">
            <Icon icon="mdi:refresh" />
            <span>已载入失败任务参数，修改后会在原任务上重新运行</span>
          </div>
          <div class="panel-scroll-content">
            <Tabs v-model:active-key="activeTab" class="config-tabs">
              <!-- Tab 1: Data Files -->
              <TabPane key="data" tab="数据文件">
                <div class="config-section">
                  <DataFileSelector
                    v-if="hasInputSchema"
                    ref="dataFileSelectorRef"
                    v-model="inputFiles"
                    :schema="tool?.input_schema ?? null"
                    :example-data="tool?.example_data ?? null"
                    :trial-example-only="isRegisteredTrialUser"
                    @headers-change="handleHeadersChange"
                    @metadata-change="handleMetadataChange"
                    @next-step="activeTab = 'params'"
                    @restricted="showTrialRestriction"
                  />
                  <DataFileSelector
                    v-else
                    ref="dataFileSelectorRef"
                    v-model="inputFiles"
                    :schema="{
                      files: [{ key: 'data', label: '数据表', required: true }],
                    }"
                    :example-data="tool?.example_data ?? null"
                    :trial-example-only="isRegisteredTrialUser"
                    @headers-change="handleHeadersChange"
                    @metadata-change="handleMetadataChange"
                    @next-step="activeTab = 'params'"
                    @restricted="showTrialRestriction"
                  />
                </div>
              </TabPane>

              <!-- Tab 2: Parameters -->
              <TabPane key="params" tab="参数设置">
                <div class="config-section params-section">
                  <DynamicForm
                    v-if="hasParamSchema"
                    v-model="formParams"
                    :schema="(dynamicParamSchema as any) ?? null"
                    @reset="handleReset"
                    @import="handleImportParams"
                    @export="handleExportParams"
                    @submit="submitAnalysis"
                  />
                  <div v-else class="empty-schema">
                    <Icon
                      icon="mdi:tune-variant-off"
                      class="empty-param-icon"
                    />
                    <p>此工具暂无可配置参数</p>
                    <p class="empty-param-hint">
                      选择数据文件后可直接提交任务
                    </p>
                    <div class="empty-param-actions">
                      <Button
                        type="primary"
                        :loading="analyzing"
                        @click="submitAnalysis"
                      >
                        <Icon icon="mdi:play-circle-outline" />
                        {{ analyzing ? '提交中...' : '提交任务' }}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </div>
        </div>
      </div>

      <div
        v-if="converterSaveModalOpen"
        class="converter-save-overlay"
        @click.self="converterSaveModalOpen = false"
      >
        <div class="converter-save-modal">
          <h3>保存到我的数据</h3>
          <label>文件名</label>
          <input v-model="converterSaveFileName" class="converter-save-input" />
          <label>保存位置</label>
          <button
            class="converter-folder-button"
            @click="converterFolderPickerOpen = !converterFolderPickerOpen"
          >
            <Icon icon="mdi:folder-outline" />
            <span>{{ converterSaveTargetFolderName }}</span>
            <Icon icon="mdi:chevron-down" />
          </button>
          <div v-if="converterFolderPickerOpen" class="converter-folder-list">
            <div v-if="converterFoldersLoading" class="converter-folder-loading">
              加载中...
            </div>
            <template v-else>
              <button
                v-for="folder in converterFolderOptions"
                :key="folder.id ?? 'root'"
                :style="{ paddingLeft: `${10 + folder.depth * 18}px` }"
                @click="selectConverterSaveFolder(folder.id, folder.name)"
              >
                {{ folder.name }}
              </button>
            </template>
          </div>
          <div class="converter-save-actions">
            <Button @click="converterSaveModalOpen = false">取消</Button>
            <Button
              type="primary"
              :disabled="converterSaving || !converterSaveFileName.trim()"
              @click="confirmConverterSave"
            >
              {{ converterSaving ? '保存中...' : '确认保存' }}
            </Button>
          </div>
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
@media (max-width: 1180px) {
  .main-content {
    flex-direction: column;
    height: auto;
    padding: 0 16px 24px;
  }

  .control-panel {
    flex: none;
    width: 100%;
    max-width: 100%;
  }

  .result-panel {
    flex: none;
    height: 600px;
  }
}

:global(body) {
  --bg-color: #f8fafc;
}

.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: 0;
  overflow: hidden;
  background-color: #f8fafc !important;
}

.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}

.header-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.back-btn {
  color: #64748b;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
  background: #f1f5f9;
}

.tool-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 24px;
  background-color: #eff6ff;
  border-radius: 12px;
}

.tool-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tool-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #1e293b;
  letter-spacing: -0.01em;
}

/* Layout */
.main-content {
  display: flex;
  flex: 1; /* Take remaining height */
  gap: 16px;
  min-height: 0; /* Important for nested scrolling */
  padding: 0 clamp(16px, 4vw, 160px) 16px;
}

/* Control Panel (now Left) */
.control-panel {
  display: flex;
  flex: 0 0 580px; /* Fixed width */
  flex-direction: column;
  order: -1; /* 排在左侧 */
  align-self: flex-start; /* 白卡片独立高度，贴合内容不强行拉伸 */
  max-height: 100%; /* 保证超长时可被弹性父级限制从而安全触发内部隐式内滚 */
  max-width: 580px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px; /* Smooth corners */
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.rerun-notice {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
  background: #fffbeb;
  border-bottom: 1px solid #fde68a;
  border-radius: 16px 16px 0 0;
}

.panel-scroll-content {
  flex: 1;
  overflow-y: auto;
  /* 针对各系浏览器根除丑陋的实体滚动轨道 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.panel-scroll-content::-webkit-scrollbar {
  display: none;
}

:deep(.config-tabs .ant-tabs-nav) {
  padding: 0 12px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.config-tabs .ant-tabs-tab) {
  padding: 10px 0;
  margin: 0 12px 0 0;
  font-size: 14px;
  color: #64748b;
  transition: all 0.3s;
}

:deep(.config-tabs .ant-tabs-tab:hover) {
  color: var(--primary-color);
}

:deep(.config-tabs .ant-tabs-tab-active) {
  font-weight: 600;
}

:deep(.config-tabs .ant-tabs-tab-btn) {
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.2s;
}

/* Selected Tab Style */
:deep(.config-tabs .ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--primary-color);
  background: #eff6ff;
}

:deep(.config-tabs .ant-tabs-ink-bar) {
  display: none; /* Hide default ink bar for custom look */
}

.config-section {
  padding: 14px 16px;
}

.params-section {
  padding: 10px 14px 12px;
}

.step-nav-area {
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px dashed #e2e8f0;
}

.submit-area {
  z-index: 10;
  padding: 24px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  box-shadow: 0 -4px 12px rgb(0 0 0 / 2%);
}

.submit-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgb(var(--primary-color-rgb) / 20%);
}

/* Result Panel (Right) */
.result-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 5%),
    0 2px 4px -2px rgb(0 0 0 / 5%);
}

.panel-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title-group {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  min-width: max-content;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.panel-header :deep(.ant-space) {
  flex: 1 1 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
  row-gap: 8px;
}

.panel-header-icon {
  font-size: 20px;
  color: #64748b;
}

.v-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: #e2e8f0;
}

.result-content {
  display: flex;
  flex: 1;
  min-height: 0; /* Important for flex child scrolling */
  overflow: hidden;
  background: #fff;
}

/* 非使用指南状态下居中显示 */
.result-content:has(.loading-state),
.result-content:has(.empty-state),
.result-content:has(.error-state),
.result-content:has(.chart-container) {
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.converter-result {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 16px;
  overflow-y: auto;
}

.converter-file-card,
.converter-summary,
.converter-empty,
.converter-save-modal {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.converter-file-card {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.converter-file-main {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.converter-file-icon {
  flex: 0 0 auto;
  font-size: 28px;
  color: #2563eb;
}

.converter-file-name {
  overflow-wrap: anywhere;
  font-weight: 600;
  color: #0f172a;
}

.converter-file-size {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.converter-empty {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px;
  color: #64748b;
}

.converter-empty .iconify {
  font-size: 22px;
}

.converter-summary {
  padding: 16px;
}

.converter-summary h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.converter-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.converter-summary-grid div {
  min-width: 0;
}

.converter-summary-grid span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #64748b;
}

.converter-summary-grid strong {
  overflow-wrap: anywhere;
  font-size: 14px;
  color: #0f172a;
}

.converter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.converter-tags span {
  padding: 3px 8px;
  font-size: 12px;
  color: #1d4ed8;
  background: #eff6ff;
  border-radius: 6px;
}

.converter-warnings {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #92400e;
}

.converter-save-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 45%);
}

.converter-save-modal {
  width: min(420px, calc(100vw - 32px));
  padding: 20px;
  box-shadow: 0 20px 45px rgb(15 23 42 / 20%);
}

.converter-save-modal h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.converter-save-modal label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.converter-save-input,
.converter-folder-button {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.converter-save-input {
  padding: 8px 10px;
}

.converter-folder-button {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  text-align: left;
  background: #fff;
}

.converter-folder-button span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.converter-folder-list {
  max-height: 190px;
  margin-top: 6px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.converter-folder-list button,
.converter-folder-loading {
  display: block;
  width: 100%;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  text-align: left;
  background: #fff;
  border: 0;
}

.converter-folder-list button:hover {
  background: #eff6ff;
}

.converter-save-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 18px;
}

.guide-content {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 18px;
  overflow-y: auto;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 44%), #fff;
}

.guide-card {
  width: 100%;
  min-height: 100%;
  padding: 0;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e5edf7;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgb(15 23 42 / 6%);
}

.guide-md-content {
  width: 100%;
  max-width: 920px;
  padding: 28px 36px 36px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.85;
  color: #26364f;
  word-break: break-word;
}

.guide-md-content :deep(h1) {
  padding-bottom: 14px;
  margin-top: 0;
  margin-bottom: 22px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  color: #0f1f35;
  border-bottom: 1px solid #d9e4f2;
}

.guide-md-content :deep(h2) {
  padding-top: 6px;
  margin-top: 26px;
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  color: #14233a;
}

.guide-md-content :deep(h3) {
  margin-top: 22px;
  margin-bottom: 10px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  color: #1d2f49;
}

.guide-md-content :deep(h4) {
  position: relative;
  padding-left: 12px;
  margin-top: 22px;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  color: #183153;
}

.guide-md-content :deep(h4)::before {
  position: absolute;
  top: 0.45em;
  left: 0;
  width: 4px;
  height: 1em;
  content: '';
  background: #2f7df6;
  border-radius: 4px;
}

.guide-md-content :deep(h5) {
  margin-top: 18px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  color: #26364f;
}

.guide-md-content :deep(h6) {
  margin-top: 16px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  color: #3c4d66;
}

.guide-md-content :deep(p) {
  margin: 0 0 14px;
}

.guide-md-content :deep(ul),
.guide-md-content :deep(ol) {
  padding-left: 22px;
  margin: 8px 0 16px;
}

.guide-md-content :deep(ul) {
  list-style: disc;
}

.guide-md-content :deep(ol) {
  list-style: decimal;
}

.guide-md-content :deep(li) {
  padding-left: 2px;
  margin-bottom: 8px;
}

.guide-md-content :deep(li)::marker {
  color: #2f7df6;
  font-weight: 700;
}

.guide-md-content :deep(code) {
  padding: 2px 6px;
  font-size: 0.92em;
  color: #0f3b7a;
  background: #eef5ff;
  border: 1px solid #d8e8ff;
  border-radius: 5px;
}

.guide-md-content :deep(pre) {
  padding: 16px;
  margin: 12px 0 18px;
  overflow-x: auto;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
}

.guide-md-content :deep(pre code) {
  padding: 0;
  color: #e5eefc;
  background: transparent;
  border: 0;
}

.guide-md-content :deep(blockquote) {
  padding: 10px 14px;
  margin: 14px 0 18px;
  color: #415572;
  background: #f5f9ff;
  border: 1px solid #dce9fa;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
}

.guide-md-content :deep(hr) {
  height: 1px;
  margin: 22px 0;
  background: #e4edf7;
  border: 0;
}

.guide-md-content :deep(a) {
  color: #1d6ff2;
  text-decoration: none;
}

.guide-md-content :deep(a:hover) {
  text-decoration: underline;
}

.guide-md-content :deep(.guide-table-wrap) {
  width: 100%;
  margin: 12px 0 18px;
  overflow-x: auto;
  border: 1px solid #dfebf7;
  border-radius: 8px;
}

.guide-md-content :deep(table) {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  background: #fff;
}

.guide-md-content :deep(th),
.guide-md-content :deep(td) {
  padding: 10px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e8eff7;
}

.guide-md-content :deep(th) {
  font-size: 13px;
  font-weight: 700;
  color: #243550;
  white-space: nowrap;
  background: #f3f7fc;
}

.guide-md-content :deep(td) {
  color: #33445f;
}

.guide-md-content :deep(tr:last-child td) {
  border-bottom: 0;
}

@media (max-width: 768px) {
  .guide-content {
    padding: 10px;
  }

  .guide-md-content {
    padding: 22px 18px 28px;
    font-size: 13px;
  }

  .guide-md-content :deep(h1) {
    font-size: 20px;
  }

  .guide-md-content :deep(h2) {
    font-size: 18px;
  }

  .guide-md-content :deep(table) {
    min-width: 100%;
  }

  .guide-md-content :deep(th),
  .guide-md-content :deep(td) {
    padding: 9px 10px;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-state-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  color: #cbd5e1;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 50%;
}

.empty-state-visual .iconify {
  font-size: 48px;
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #334155;
}

.empty-desc {
  max-width: 300px;
  font-size: 14px;
  color: #64748b;
}

.mt-4 {
  margin-top: 16px;
}

.empty-schema {
  padding: 24px;
  color: #94a3b8;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
}

.empty-param-icon {
  margin-bottom: 8px;
  font-size: 28px;
  color: #64748b;
}

.empty-param-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.empty-param-actions {
  margin-top: 18px;
}

/* 错误状态样式 */
.error-state {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.error-state-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  color: #ff4d4f;
  background: #fff2f0;
  border: 1px dashed #ffccc7;
  border-radius: 50%;
}

.error-state-visual .iconify {
  font-size: 48px;
}

.error-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #ff4d4f;
}

.error-desc {
  max-width: 500px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #cf1322;
  word-break: break-all;
  white-space: pre-wrap;
  background: #fff2f0;
  border-radius: 8px;
}

@media (max-width: 1180px) {
  .page-container {
    height: auto;
    min-height: 100vh;
  }

  .main-content {
    flex-direction: column;
    gap: 14px;
    height: auto;
    padding: 0 16px 24px;
  }

  .control-panel,
  .result-panel {
    flex: none;
    width: 100%;
    max-width: 100%;
  }

  .result-panel {
    min-height: 560px;
  }
}

@media (max-width: 640px) {
  .tool-header {
    padding: 14px 16px;
  }

  .tool-title {
    font-size: 18px;
  }

  .main-content {
    padding: 0 10px 18px;
  }

  .panel-header {
    gap: 12px;
    align-items: flex-start;
  }

  .panel-header :deep(.ant-space) {
    flex-wrap: wrap;
    row-gap: 8px;
    justify-content: flex-start;
  }
}

/* Scientific Minimalism Design System */
</style>
