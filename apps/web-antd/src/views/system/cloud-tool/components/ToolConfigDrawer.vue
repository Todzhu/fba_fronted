<script lang="ts" setup>
import type { AnalysisTool, CloudToolUpdateParams } from '#/api/analysis-tools';

/**
 * ToolConfigDrawer - 工具配置可视化编辑器
 *
 * 提供可视化界面编辑 CloudTool 的 JSON Schema 配置：
 * - input_schema: 输入文件配置
 * - param_schema: 执行参数配置
 * - output_config: 输出可视化配置
 */
import { computed, nextTick, ref, watch } from 'vue';

import { MarkdownEditor } from '@vben/common-ui';

// @ts-ignore
import { Icon } from '@iconify/vue';
import {
  Button,
  Card,
  Cascader,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue';
// @ts-ignore
import Sortable from 'sortablejs';

import { updateCloudToolApi } from '#/api/analysis-tools';
import { uploadFile } from '#/api/user-file';

// ========== Props & Emits ==========
const props = defineProps<{
  open: boolean;
  tool: AnalysisTool | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved'): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
});

// ========== 表单状态 ==========
const loading = ref(false);
const activeTab = ref('basic');

// 基本信息
const basicInfo = ref({
  runner_type: 'r_script',
  script_path: '',
  guide_doc: '',
  video_url: '',
  env_type: '' as string, // 环境类型: singularity|conda|docker|system
  env_config: {} as Record<string, any>, // 环境配置
});

// 示例数据配置
interface ExampleItem {
  key: string;
  name: string;
  url: string;
  description: string;
  fileName?: string; // 上传文件名
  uploading?: boolean; // 上传状态
}
const exampleItems = ref<ExampleItem[]>([]);

// 输入文件配置
interface InputFile {
  key: string;
  label: string;
  required: boolean;
  extensions: string;
}
const inputFiles = ref<InputFile[]>([]);

// 参数配置
interface ParamItem {
  key: string;
  typeWidget: [string, string]; // 级联选择: [type, widget]
  title: string;
  description: string; // 参数描述（用于 tooltip 显示）
  default: string;
  enum: string;
  required: boolean; // 是否必填
  minimum?: number;
  maximum?: number;
  group: string; // 分组，默认 "通用参数"
  format?: string;
}
const paramItems = ref<ParamItem[]>([]);

// 类型-控件级联选项
const typeWidgetOptions = [
  {
    value: 'string',
    label: '字符串 (string)',
    children: [
      { value: 'text', label: '单行文本' },
      { value: 'textarea', label: '多行文本' },
      { value: 'select', label: '下拉选择' },
      { value: 'palette_select', label: '调色板选择器' },
      { value: 'color', label: '颜色选择器' },
      { value: 'column_select', label: '列选择器' },
    ],
  },
  {
    value: 'number',
    label: '数值 (number)',
    children: [
      { value: 'number', label: '数字输入' },
      { value: 'slider', label: '滑块' },
    ],
  },
  {
    value: 'integer',
    label: '整数 (integer)',
    children: [
      { value: 'int', label: '整数输入' },
      { value: 'slider', label: '滑块' },
    ],
  },
  {
    value: 'boolean',
    label: '布尔 (boolean)',
    children: [{ value: 'switch', label: '开关' }],
  },
];

// 输出配置
interface OutputItem {
  key: string;
  path: string;
  type: 'download' | 'echarts' | 'pdf' | 'table';
  title: string;
}
const outputItems = ref<OutputItem[]>([]);

// ========== 初始化数据 ==========
watch(
  () => props.tool,
  (tool) => {
    if (!tool) return;

    // 基本信息
    basicInfo.value = {
      runner_type: tool.runner_type || 'r_script',
      script_path: tool.script_path || '',
      guide_doc: tool.guide_doc || '',
      video_url: tool.video_url || '',
      env_type: tool.env_type || '',
      env_config: tool.env_config || {},
    };

    // 示例数据
    exampleItems.value = (tool.example_data || []).map((e: any) => ({
      key: e.key || '',
      name: e.name || '',
      url: e.url || '',
      description: e.description || '',
    }));

    // 输入文件
    const inputSchema = tool.input_schema as null | { files?: any[] };
    inputFiles.value = (inputSchema?.files || []).map((f: any) => ({
      key: f.key || '',
      label: f.label || '',
      required: f.required || false,
      extensions: (f.extensions || []).join(', '),
    }));

    // 参数
    const paramSchema = tool.param_schema as {
      order?: string[]; // 参数顺序
      properties?: Record<string, any>;
    } | null;
    if (paramSchema?.properties) {
      // 获取所有参数键
      const allKeys = Object.keys(paramSchema.properties);
      // 按 order 数组排序，未在 order 中的放到最后
      const orderedKeys = paramSchema.order
        ? [
            ...paramSchema.order.filter((k) => allKeys.includes(k)),
            ...allKeys.filter((k) => !paramSchema.order!.includes(k)),
          ]
        : allKeys;

      paramItems.value = orderedKeys.map((key) => {
        const p = paramSchema.properties![key];
        // 推断 widget - 使用辅助函数避免嵌套三元
        const inferWidget = (prop: any): string => {
          if (prop.widget) return prop.widget;
          if (prop.format === 'color') return 'color';
          if (prop.enum) return 'select';
          if (prop.type === 'boolean') return 'switch';
          if (prop.type === 'integer') return 'int';
          if (prop.type === 'number') return 'number';
          return 'text';
        };
        const inferredWidget = inferWidget(p);
        return {
          key,
          typeWidget: [p.type || 'string', inferredWidget] as [string, string],
          title: p.title || key,
          description: p.description || '',
          default: String(p.default ?? ''),
          enum: (p.enum || []).join(', '),
          required: p.required || false,
          minimum: p.minimum,
          maximum: p.maximum,
          group: p.group || '通用参数',
          format: p.format,
        };
      });
    } else {
      paramItems.value = [];
    }

    // 输出
    const outputConfig = tool.output_config as null | { outputs?: any[] };
    outputItems.value = (outputConfig?.outputs || []).map((o: any) => ({
      key: o.key || '',
      path: o.path || '',
      type: o.type || 'echarts',
      title: o.title || '',
    }));
  },
  { immediate: true },
);

// ========== 添加/删除操作 ==========
const addInputFile = () => {
  inputFiles.value.push({
    key: '',
    label: '',
    required: true,
    extensions: '.txt, .csv',
  });
};

const removeInputFile = (index: number) => {
  inputFiles.value.splice(index, 1);
};

const addParam = () => {
  // 新增模式：设置索引为 -1，确认后再实际添加
  editingParamIndex.value = -1;
  editingParam.value = {
    key: '',
    typeWidget: ['string', 'text'],
    title: '',
    description: '',
    default: '',
    enum: '',
    required: false,
    group: '通用参数',
  };
  paramEditVisible.value = true;
};

const removeParam = (index: number) => {
  paramItems.value.splice(index, 1);
};

// ========== 参数编辑对话框 ==========
const paramEditVisible = ref(false);
const editingParamIndex = ref(-1); // -1 表示新增模式
const editingParam = ref<ParamItem>({
  key: '',
  typeWidget: ['string', 'text'],
  title: '',
  description: '',
  default: '',
  enum: '',
  required: false,
  group: '通用参数',
});

const openParamEditModal = (index: number) => {
  editingParamIndex.value = index;
  // 复制当前参数数据到编辑表单
  editingParam.value = { ...paramItems.value[index]! };
  paramEditVisible.value = true;
};

const handleParamEditOk = () => {
  if (editingParamIndex.value === -1) {
    // 新增模式：添加到列表
    paramItems.value.push({ ...editingParam.value });
  } else {
    // 编辑模式：更新现有项
    paramItems.value[editingParamIndex.value] = { ...editingParam.value };
  }
  paramEditVisible.value = false;
  editingParamIndex.value = -1;
};

const handleParamEditCancel = () => {
  // 取消时直接关闭，不做任何修改
  paramEditVisible.value = false;
  editingParamIndex.value = -1;
};

const addOutput = () => {
  outputItems.value.push({ key: '', path: '', type: 'echarts', title: '' });
};

const removeOutput = (index: number) => {
  outputItems.value.splice(index, 1);
};

const addExample = () => {
  exampleItems.value.push({
    key: '',
    name: '',
    url: '',
    description: '',
    fileName: '',
  });
};

const removeExample = (index: number) => {
  exampleItems.value.splice(index, 1);
};

// ========== 拖拽排序 ==========
const initSortable = () => {
  const el = document.querySelector(
    '.param-table .ant-table-tbody',
  ) as HTMLElement;
  if (!el) return;

  // 避免重复初始化（虽然 Create 会返回新实例，但最好检查一下，这里简单处理先销毁再创建思路太麻烦，直接让 Sortable 自己处理）
  // 实际上 Sortable.create 会绑定事件，如果多次创建可能会有问题
  // 这里简化处理，假设每次切换 Tab 重新创建是安全的（只要 DOM 被销毁重建）

  Sortable.create(el, {
    handle: '.drag-handle',
    animation: 300,
    ghostClass: 'sortable-ghost',
    onEnd: ({
      oldIndex,
      newIndex,
    }: {
      newIndex?: number;
      oldIndex?: number;
    }) => {
      if (
        typeof oldIndex !== 'number' ||
        typeof newIndex !== 'number' ||
        oldIndex === newIndex
      ) {
        return;
      }
      const targetRow = paramItems.value.splice(oldIndex, 1)[0];
      if (targetRow) {
        paramItems.value.splice(newIndex, 0, targetRow);
      }
    },
  });
};

watch(activeTab, (val) => {
  if (val === 'params') {
    nextTick(() => {
      setTimeout(initSortable, 100);
    });
  }
});

// 示例文件上传处理
const handleExampleUpload = async (index: number, file: File) => {
  const item = exampleItems.value[index];
  if (!item) return false;

  item.uploading = true;
  item.fileName = file.name;

  try {
    const result = await uploadFile(file);
    // 构建完整的公开下载 URL
    const userId = result.user_id;
    const storagePath = result.storage_path || '';
    item.url = `/api/v1/sys/my-data/example/${userId}/${storagePath}`;
    message.success(`${file.name} 上传成功`);
  } catch (error) {
    message.error(`${file.name} 上传失败`);
    console.error('Upload failed:', error);
  } finally {
    item.uploading = false;
  }

  return false; // 阻止默认上传行为
};

// ========== 保存 ==========
const handleSave = async () => {
  if (!props.tool) return;

  // 构建 input_schema
  const input_schema = {
    files: inputFiles.value.map((f) => {
      // 容错处理：extensions 可能是字符串或数组
      let extensions: string[] = [];
      if (Array.isArray(f.extensions)) {
        extensions = f.extensions;
      } else if (typeof f.extensions === 'string') {
        extensions = f.extensions
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
      }
      return {
        key: f.key,
        label: f.label,
        required: f.required,
        extensions,
      };
    }),
  };

  // 构建 param_schema
  const properties: Record<string, any> = {};
  const order: string[] = []; // 记录参数顺序
  for (const p of paramItems.value) {
    // 容错处理：确保 typeWidget 是有效数组
    const typeWidget = Array.isArray(p.typeWidget)
      ? p.typeWidget
      : ['string', 'text'];
    const [type, widget] = typeWidget;

    // 验证 key 是否有效
    if (!p.key || p.key.trim() === '') {
      console.warn('跳过无效参数：缺少 key', p);
      continue;
    }

    const prop: any = {
      type: type || 'string',
      title: p.title || p.key,
    };
    if (p.required) prop.required = true;
    if (widget && widget !== 'text') prop.widget = widget;
    if (widget === 'color') prop.format = 'color';
    if (p.group) prop.group = p.group;
    if (p.default !== undefined && p.default !== '') {
      if (type === 'integer' || type === 'number') {
        prop.default = Number(p.default);
      } else if (type === 'boolean') {
        prop.default = String(p.default) === 'true';
      } else {
        prop.default = p.default;
      }
    }
    if (p.enum && typeof p.enum === 'string' && p.enum.trim() !== '') {
      prop.enum = p.enum
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }
    if (p.description) prop.description = p.description;
    if (p.minimum !== undefined) prop.minimum = p.minimum;
    if (p.maximum !== undefined) prop.maximum = p.maximum;
    properties[p.key] = prop;
    order.push(p.key); // 按顺序添加 key
  }
  const param_schema = { type: 'object', properties, order };

  // 构建 output_config
  const output_config = {
    outputs: outputItems.value.map((o) => ({
      key: o.key,
      path: o.path,
      type: o.type,
      title: o.title,
    })),
  };

  // 构建 example_data
  const example_data = exampleItems.value.map((e) => ({
    key: e.key,
    name: e.name,
    url: e.url,
    description: e.description,
  }));

  const updateData: CloudToolUpdateParams = {
    ...basicInfo.value,
    // 处理环境配置的空值
    env_type: basicInfo.value.env_type || null,
    env_config:
      Object.keys(basicInfo.value.env_config || {}).length > 0
        ? basicInfo.value.env_config
        : null,
    input_schema,
    param_schema,
    output_config,
    example_data: example_data.length > 0 ? example_data : null,
  };

  loading.value = true;
  try {
    await updateCloudToolApi(props.tool.id, updateData);
    message.success('配置保存成功');
    emit('saved');
    visible.value = false;
  } catch (error) {
    message.error('保存失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// ========== 表格列定义 ==========
const inputColumns = [
  {
    title: '序号',
    dataIndex: 'index',
    width: 50,
    align: 'center' as const,
    customRender: ({ index }: { index: number }) => index + 1,
  },
  { title: 'Key', dataIndex: 'key', width: 100 },
  { title: '标签', dataIndex: 'label', width: 120 },
  { title: '必填', dataIndex: 'required', width: 60 },
  { title: '扩展名', dataIndex: 'extensions' },
  { title: '操作', dataIndex: 'action', width: 60 },
];

const paramColumns = [
  { title: '排序', dataIndex: 'sort', width: 50, align: 'center' as const },
  { title: 'Key', dataIndex: 'key', width: 120 },
  { title: '标题', dataIndex: 'title', width: 140 },
  { title: '类型', dataIndex: 'typeWidget', width: 160 },
  { title: '必填', dataIndex: 'required', width: 60, align: 'center' as const },
  { title: '分组', dataIndex: 'group', width: 100 },
  { title: '操作', dataIndex: 'action', width: 120, align: 'center' as const },
];

const outputColumns = [
  {
    title: '序号',
    dataIndex: 'index',
    width: 50,
    align: 'center' as const,
    customRender: ({ index }: { index: number }) => index + 1,
  },
  { title: 'Key', dataIndex: 'key', width: 80 },
  { title: '路径', dataIndex: 'path' },
  { title: '类型', dataIndex: 'type', width: 80 },
  { title: '标题', dataIndex: 'title', width: 100 },
  { title: '操作', dataIndex: 'action', width: 60 },
];

// ========== 导出配置 ==========
const handleExportConfig = () => {
  const config = {
    version: '1.0',
    tool_title: props.tool?.title || 'unknown',
    exported_at: new Date().toISOString(),
    basic_info: basicInfo.value,
    input_files: inputFiles.value,
    param_items: paramItems.value,
    output_items: outputItems.value,
    example_items: exampleItems.value,
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tool_config_${props.tool?.title || 'export'}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  message.success('配置已导出');
};

// ========== 导入配置 ==========
const handleImportConfig = async (file: File) => {
  try {
    const text = await file.text();
    const config = JSON.parse(text);

    // 验证配置版本
    if (!config.version) {
      message.error('无效的配置文件格式');
      return false;
    }

    // 导入基本信息
    if (config.basic_info) {
      basicInfo.value = {
        runner_type: config.basic_info.runner_type || 'r_script',
        script_path: config.basic_info.script_path || '',
        guide_doc: config.basic_info.guide_doc || '',
        video_url: config.basic_info.video_url || '',
        env_type: config.basic_info.env_type || '',
        env_config: config.basic_info.env_config || {},
      };
    }

    // 导入输入文件配置
    if (config.input_files) {
      inputFiles.value = config.input_files;
    }

    // 导入参数配置
    if (config.param_items) {
      paramItems.value = config.param_items;
    }

    // 导入输出配置
    if (config.output_items) {
      outputItems.value = config.output_items;
    }

    // 导入示例数据
    if (config.example_items) {
      exampleItems.value = config.example_items;
    }

    message.success(`配置已导入 (来自: ${config.tool_title || '未知'})`);
  } catch (error) {
    console.error('Import failed:', error);
    message.error('配置文件解析失败');
  }
  return false; // 阻止默认上传
};
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="`配置: ${tool?.title || ''}`"
    width="960"
    :footer-style="{ textAlign: 'right' }"
    class="config-drawer"
  >
    <Tabs v-model:active-key="activeTab">
      <!-- 基本信息 -->
      <Tabs.TabPane key="basic" tab="基本信息">
        <Form layout="vertical" class="basic-form">
          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="执行引擎">
                <Select v-model:value="basicInfo.runner_type">
                  <Select.Option value="r_script">R Script</Select.Option>
                  <Select.Option value="python">Python</Select.Option>
                  <Select.Option value="snakemake">Snakemake</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="脚本路径">
                <Input
                  v-model:value="basicInfo.script_path"
                  placeholder="scripts/go_enrichment.R"
                />
              </Form.Item>
            </Col>
          </Row>

          <!-- 运行环境配置 -->
          <Card size="small" title="运行环境配置" class="env-config-card">
            <Row :gutter="16">
              <Col :span="8">
                <Form.Item label="环境类型">
                  <Select
                    v-model:value="basicInfo.env_type"
                    placeholder="选择运行环境"
                    allow-clear
                    @change="() => (basicInfo.env_config = {})"
                  >
                    <Select.Option value="system">系统默认</Select.Option>
                    <Select.Option value="singularity">
                      Singularity (.sif)
                    </Select.Option>
                    <Select.Option value="conda">Conda 环境</Select.Option>
                    <Select.Option value="docker">Docker 容器</Select.Option>
                  </Select>
                </Form.Item>
              </Col>

              <!-- Singularity 配置 -->
              <template v-if="basicInfo.env_type === 'singularity'">
                <Col :span="16">
                  <Form.Item label="容器镜像路径 (.sif)">
                    <Input
                      v-model:value="basicInfo.env_config.image"
                      placeholder="/path/to/container.sif"
                    />
                  </Form.Item>
                </Col>
                <Col :span="24">
                  <Form.Item
                    label="绑定目录 (每行一个，格式: /host:/container)"
                  >
                    <Input.TextArea
                      :value="
                        (basicInfo.env_config.bind_paths || []).join('\n')
                      "
                      :rows="2"
                      placeholder="/data:/data&#10;/tmp:/tmp"
                      @change="
                        (e: Event) =>
                          (basicInfo.env_config.bind_paths = (
                            e.target as HTMLTextAreaElement
                          ).value
                            .split('\n')
                            .filter(Boolean))
                      "
                    />
                  </Form.Item>
                </Col>
              </template>

              <!-- Conda 配置 -->
              <template v-else-if="basicInfo.env_type === 'conda'">
                <Col :span="8">
                  <Form.Item label="环境名称">
                    <Input
                      v-model:value="basicInfo.env_config.env_name"
                      placeholder="bioinfo_env"
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="Conda 路径 (可选)">
                    <Input
                      v-model:value="basicInfo.env_config.conda_path"
                      placeholder="conda"
                    />
                  </Form.Item>
                </Col>
              </template>

              <!-- Docker 配置 -->
              <template v-else-if="basicInfo.env_type === 'docker'">
                <Col :span="16">
                  <Form.Item label="Docker 镜像">
                    <Input
                      v-model:value="basicInfo.env_config.image"
                      placeholder="bioinfo/rstudio:latest"
                    />
                  </Form.Item>
                </Col>
                <Col :span="24">
                  <Form.Item label="挂载卷 (每行一个，格式: /host:/container)">
                    <Input.TextArea
                      :value="(basicInfo.env_config.volumes || []).join('\n')"
                      :rows="2"
                      placeholder="/data:/data"
                      @change="
                        (e: Event) =>
                          (basicInfo.env_config.volumes = (
                            e.target as HTMLTextAreaElement
                          ).value
                            .split('\n')
                            .filter(Boolean))
                      "
                    />
                  </Form.Item>
                </Col>
              </template>

              <!-- System 配置 -->
              <template v-else-if="basicInfo.env_type === 'system'">
                <Col :span="16">
                  <Form.Item label="自定义可执行文件路径 (可选)">
                    <Input
                      v-model:value="basicInfo.env_config.executable"
                      placeholder="/usr/bin/Rscript"
                    />
                  </Form.Item>
                </Col>
              </template>
            </Row>
          </Card>

          <Form.Item label="视频教程" style="margin-top: 16px">
            <Input
              v-model:value="basicInfo.video_url"
              placeholder="视频教程链接 (如 Bilibili/YouTube)"
            />
          </Form.Item>
          <Form.Item label="使用指南 (Markdown)">
            <div class="md-editor-wrapper">
              <MarkdownEditor
                v-model:value="basicInfo.guide_doc"
                :height="320"
                mode="wysiwyg"
              />
            </div>
          </Form.Item>
        </Form>
      </Tabs.TabPane>

      <!-- 输入文件 -->
      <Tabs.TabPane key="input" tab="输入文件">
        <div class="tab-actions">
          <Button type="primary" size="small" @click="addInputFile">
            + 添加文件
          </Button>
        </div>
        <Table
          :columns="inputColumns"
          :data-source="inputFiles"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'key'">
              <Input v-model:value="record.key" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'label'">
              <Input v-model:value="record.label" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'required'">
              <Switch v-model:checked="record.required" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'extensions'">
              <Input
                v-model:value="record.extensions"
                size="small"
                placeholder=".txt, .csv"
              />
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <Popconfirm title="确定删除?" @confirm="removeInputFile(index)">
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <!-- 参数配置 -->
      <Tabs.TabPane key="params" tab="参数配置">
        <div class="tab-actions">
          <Button type="primary" size="small" @click="addParam">
            + 添加参数
          </Button>
        </div>
        <Table
          class="param-table"
          :columns="paramColumns"
          :data-source="paramItems"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'sort'">
              <Icon
                icon="mdi:drag"
                class="drag-handle"
                style="font-size: 18px; color: #9ca3af; cursor: move"
              />
            </template>
            <template v-else-if="column.dataIndex === 'key'">
              <span class="param-key">{{ record.key || '-' }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'title'">
              <Tooltip v-if="record.description" :title="record.description">
                <span class="param-title">{{ record.title || record.key }}</span>
              </Tooltip>
              <span v-else class="param-title">{{ record.title || record.key }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'typeWidget'">
              <Tag color="blue">
                {{ record.typeWidget?.[0] || 'string' }}
              </Tag>
              <Tag>{{ record.typeWidget?.[1] || 'text' }}</Tag>
            </template>
            <template v-else-if="column.dataIndex === 'required'">
              <Tag v-if="record.required" color="red">必填</Tag>
              <span v-else class="optional-text">可选</span>
            </template>
            <template v-else-if="column.dataIndex === 'group'">
              <span class="group-text">{{ record.group || '通用参数' }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <Space :size="4">
                <Button type="link" size="small" @click="openParamEditModal(index)">
                  编辑
                </Button>
                <Popconfirm title="确定删除?" @confirm="removeParam(index)">
                  <Button type="link" danger size="small">删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>

        <!-- 参数编辑对话框 -->
        <Modal
          v-model:open="paramEditVisible"
          :title="editingParamIndex === -1 ? '添加参数' : '编辑参数'"
          width="560px"
          :mask-closable="false"
          @ok="handleParamEditOk"
          @cancel="handleParamEditCancel"
        >
          <Form layout="vertical" class="param-edit-form">
            <Row :gutter="16">
              <Col :span="12">
                <Form.Item label="参数 Key" required>
                  <Input v-model:value="editingParam.key" placeholder="参数唯一标识" />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item label="参数标题">
                  <Input v-model:value="editingParam.title" placeholder="显示名称" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="参数描述">
              <Input.TextArea
                v-model:value="editingParam.description"
                :rows="2"
                placeholder="参数说明，用于 tooltip 提示"
              />
            </Form.Item>

            <Row :gutter="16">
              <Col :span="12">
                <Form.Item label="类型/控件">
                  <Cascader
                    v-model:value="editingParam.typeWidget"
                    :options="typeWidgetOptions"
                    placeholder="选择类型和控件"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item label="默认值">
                  <Input v-model:value="editingParam.default" placeholder="默认值" />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :span="12">
                <Form.Item label="分组">
                  <Input v-model:value="editingParam.group" placeholder="通用参数" />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item label="必填">
                  <Switch v-model:checked="editingParam.required" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              v-if="editingParam.typeWidget?.[1] === 'select'"
              label="选项列表"
            >
              <Input.TextArea
                v-model:value="editingParam.enum"
                :rows="2"
                placeholder="多个选项用逗号分隔，如: 选项1,选项2,选项3"
              />
            </Form.Item>

            <Row
              v-if="['number', 'integer'].includes(editingParam.typeWidget?.[0] || '')"
              :gutter="16"
            >
              <Col :span="12">
                <Form.Item label="最小值">
                  <InputNumber
                    v-model:value="editingParam.minimum"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item label="最大值">
                  <InputNumber
                    v-model:value="editingParam.maximum"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </Tabs.TabPane>

      <!-- 输出配置 -->
      <Tabs.TabPane key="output" tab="输出配置">
        <div class="tab-actions">
          <Button type="primary" size="small" @click="addOutput">
            + 添加输出
          </Button>
        </div>
        <Table
          :columns="outputColumns"
          :data-source="outputItems"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'key'">
              <Input v-model:value="record.key" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'path'">
              <Input
                v-model:value="record.path"
                size="small"
                placeholder="result/plot.json"
              />
            </template>
            <template v-else-if="column.dataIndex === 'type'">
              <Select
                v-model:value="record.type"
                size="small"
                style="width: 100%"
              >
                <Select.Option value="echarts">ECharts</Select.Option>
                <Select.Option value="image">Image (图片)</Select.Option>
                <Select.Option value="table">Table</Select.Option>
                <Select.Option value="download">Download</Select.Option>
                <Select.Option value="pdf">PDF</Select.Option>
              </Select>
            </template>
            <template v-else-if="column.dataIndex === 'title'">
              <Input v-model:value="record.title" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <Popconfirm title="确定删除?" @confirm="removeOutput(index)">
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <!-- 示例数据 -->
      <Tabs.TabPane key="example" tab="示例数据">
        <div class="example-section">
          <div class="section-header">
            <span class="section-title">示例文件配置</span>
            <Button type="primary" @click="addExample"> + 添加示例 </Button>
          </div>

          <div v-if="exampleItems.length === 0" class="empty-tip">
            暂无示例数据，点击「添加示例」开始配置
          </div>

          <div class="example-list">
            <Card
              v-for="(item, index) in exampleItems"
              :key="index"
              class="example-card"
            >
              <template #title>
                <div class="card-title">
                  <span>示例 {{ index + 1 }}</span>
                  <Popconfirm title="确定删除?" @confirm="removeExample(index)">
                    <Button type="text" danger>删除</Button>
                  </Popconfirm>
                </div>
              </template>

              <Row :gutter="16">
                <Col :span="12">
                  <Form.Item label="Key" class="form-item">
                    <Input
                      v-model:value="item.key"
                      placeholder="对应输入文件 key"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="名称" class="form-item">
                    <Input v-model:value="item.name" placeholder="示例名称" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="示例文件" class="form-item">
                <div class="file-upload-row">
                  <Upload
                    :before-upload="
                      (file: File) => handleExampleUpload(index, file)
                    "
                    :show-upload-list="false"
                    accept=".csv,.txt,.xlsx,.xls,.tsv"
                  >
                    <Button :loading="item.uploading">
                      {{
                        item.uploading
                          ? '上传中...'
                          : item.fileName || '选择文件'
                      }}
                    </Button>
                  </Upload>
                  <Input
                    v-model:value="item.url"
                    class="file-url-input"
                    placeholder="文件存储路径"
                    :readonly="false"
                  />
                </div>
              </Form.Item>

              <Form.Item label="描述" class="form-item">
                <Input
                  v-model:value="item.description"
                  placeholder="示例数据说明"
                />
              </Form.Item>
            </Card>
          </div>
        </div>
      </Tabs.TabPane>
    </Tabs>

    <template #footer>
      <div class="footer-actions">
        <Space>
          <Button @click="handleExportConfig">
            <Icon icon="mdi:download" />
            导出 JSON
          </Button>
          <Upload
            :before-upload="handleImportConfig"
            :show-upload-list="false"
            accept=".json"
          >
            <Button>
              <Icon icon="mdi:upload" />
              导入 JSON
            </Button>
          </Upload>
        </Space>
        <Space>
          <Button @click="visible = false">取消</Button>
          <Button type="primary" :loading="loading" @click="handleSave">
            保存配置
          </Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.config-drawer :deep(.ant-drawer-body) {
  padding: 16px 24px;
}

/* Footer 布局：左侧导入导出，右侧保存取消 */
.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.basic-form {
  max-width: 100%;
}

.md-editor-wrapper {
  overflow: hidden;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.md-editor-wrapper :deep(.vditor) {
  border: none;
}

.tab-actions {
  margin-bottom: 12px;
}

:deep(.ant-tabs-content) {
  padding: 8px 0;
}

:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-table) {
  font-size: 13px;
}

:deep(.ant-table-thead > tr > th) {
  padding: 8px 12px;
  background: #fafafa;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
}

/* 示例数据区域样式 */
.example-section {
  padding: 0 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.empty-tip {
  padding: 48px 24px;
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.example-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s;
}

.example-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgb(59 130 246 / 15%);
}

.example-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0 16px;
  background: #f8fafc;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 12px 12px 0 0;
}

.example-card :deep(.ant-card-head-title) {
  padding: 12px 0;
}

.example-card :deep(.ant-card-body) {
  padding: 20px;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}

.form-item {
  margin-bottom: 16px !important;
}

.form-item :deep(.ant-form-item-label) {
  padding-bottom: 6px;
}

.form-item :deep(.ant-form-item-label > label) {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.file-upload-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.file-url-input {
  flex: 1;
}

/* 保留旧样式兼容 */
.compact-form-item {
  margin-bottom: 8px !important;
}

.compact-form-item :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.compact-form-item :deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: #64748b;
}

.upload-area {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
}

.sortable-ghost {
  background-color: #e6f7ff !important;
  opacity: 0.8;
}

/* 参数表格只读样式 */
.param-key {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: #1e40af;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.param-title {
  color: #334155;
  cursor: default;
}

.param-title:hover {
  color: #3b82f6;
}

.optional-text {
  font-size: 12px;
  color: #94a3b8;
}

.group-text {
  font-size: 12px;
  color: #64748b;
}

/* 参数编辑对话框样式 */
.param-edit-form {
  padding: 8px 0;
}

.param-edit-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.param-edit-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}
</style>
