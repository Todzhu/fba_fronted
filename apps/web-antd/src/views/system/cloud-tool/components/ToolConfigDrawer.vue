<script lang="ts" setup>
/**
 * ToolConfigDrawer - 工具配置可视化编辑器
 *
 * 提供可视化界面编辑 CloudTool 的 JSON Schema 配置：
 * - input_schema: 输入文件配置
 * - param_schema: 执行参数配置
 * - output_config: 输出可视化配置
 */
import { computed, ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
} from 'ant-design-vue';

import type { AnalysisTool, CloudToolUpdateParams } from '#/api/analysis-tools';
import { updateCloudToolApi } from '#/api/analysis-tools';

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
});

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
  type: 'string' | 'integer' | 'number' | 'boolean';
  title: string;
  widget: 'text' | 'number' | 'slider' | 'select' | 'switch';
  default: string;
  enum: string;
  minimum?: number;
  maximum?: number;
}
const paramItems = ref<ParamItem[]>([]);

// 输出配置
interface OutputItem {
  key: string;
  path: string;
  type: 'echarts' | 'table' | 'download' | 'pdf';
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
    };

    // 输入文件
    const inputSchema = tool.input_schema as { files?: any[] } | null;
    inputFiles.value = (inputSchema?.files || []).map((f: any) => ({
      key: f.key || '',
      label: f.label || '',
      required: f.required || false,
      extensions: (f.extensions || []).join(', '),
    }));

    // 参数
    const paramSchema = tool.param_schema as { properties?: Record<string, any> } | null;
    if (paramSchema?.properties) {
      paramItems.value = Object.entries(paramSchema.properties).map(([key, p]) => ({
        key,
        type: p.type || 'string',
        title: p.title || key,
        widget: p.widget || (p.enum ? 'select' : p.type === 'boolean' ? 'switch' : 'text'),
        default: String(p.default ?? ''),
        enum: (p.enum || []).join(', '),
        minimum: p.minimum,
        maximum: p.maximum,
      }));
    } else {
      paramItems.value = [];
    }

    // 输出
    const outputConfig = tool.output_config as { outputs?: any[] } | null;
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
  inputFiles.value.push({ key: '', label: '', required: true, extensions: '.txt, .csv' });
};

const removeInputFile = (index: number) => {
  inputFiles.value.splice(index, 1);
};

const addParam = () => {
  paramItems.value.push({
    key: '',
    type: 'string',
    title: '',
    widget: 'text',
    default: '',
    enum: '',
  });
};

const removeParam = (index: number) => {
  paramItems.value.splice(index, 1);
};

const addOutput = () => {
  outputItems.value.push({ key: '', path: '', type: 'echarts', title: '' });
};

const removeOutput = (index: number) => {
  outputItems.value.splice(index, 1);
};

// ========== 保存 ==========
const handleSave = async () => {
  if (!props.tool) return;

  // 构建 input_schema
  const input_schema = {
    files: inputFiles.value.map((f) => ({
      key: f.key,
      label: f.label,
      required: f.required,
      extensions: f.extensions.split(',').map((e) => e.trim()).filter(Boolean),
    })),
  };

  // 构建 param_schema
  const properties: Record<string, any> = {};
  for (const p of paramItems.value) {
    const prop: any = {
      type: p.type,
      title: p.title,
    };
    if (p.widget && p.widget !== 'text') prop.widget = p.widget;
    if (p.default) {
      prop.default = p.type === 'integer' || p.type === 'number'
        ? Number(p.default)
        : p.type === 'boolean'
          ? p.default === 'true'
          : p.default;
    }
    if (p.enum) {
      prop.enum = p.enum.split(',').map((e) => e.trim()).filter(Boolean);
    }
    if (p.minimum !== undefined) prop.minimum = p.minimum;
    if (p.maximum !== undefined) prop.maximum = p.maximum;
    properties[p.key] = prop;
  }
  const param_schema = { type: 'object', properties };

  // 构建 output_config
  const output_config = {
    outputs: outputItems.value.map((o) => ({
      key: o.key,
      path: o.path,
      type: o.type,
      title: o.title,
    })),
  };

  const updateData: CloudToolUpdateParams = {
    ...basicInfo.value,
    input_schema,
    param_schema,
    output_config,
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
  { title: 'Key', dataIndex: 'key', width: 100 },
  { title: '标签', dataIndex: 'label', width: 120 },
  { title: '必填', dataIndex: 'required', width: 60 },
  { title: '扩展名', dataIndex: 'extensions' },
  { title: '操作', dataIndex: 'action', width: 60 },
];

const paramColumns = [
  { title: 'Key', dataIndex: 'key', width: 80 },
  { title: '标题', dataIndex: 'title', width: 100 },
  { title: '类型', dataIndex: 'type', width: 80 },
  { title: '控件', dataIndex: 'widget', width: 80 },
  { title: '默认值', dataIndex: 'default', width: 80 },
  { title: '操作', dataIndex: 'action', width: 60 },
];

const outputColumns = [
  { title: 'Key', dataIndex: 'key', width: 80 },
  { title: '路径', dataIndex: 'path' },
  { title: '类型', dataIndex: 'type', width: 80 },
  { title: '标题', dataIndex: 'title', width: 100 },
  { title: '操作', dataIndex: 'action', width: 60 },
];
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="`配置: ${tool?.title || ''}`"
    width="720"
    :footer-style="{ textAlign: 'right' }"
  >
    <Tabs v-model:active-key="activeTab">
      <!-- 基本信息 -->
      <Tabs.TabPane key="basic" tab="基本信息">
        <Form layout="vertical">
          <Form.Item label="执行引擎">
            <Select v-model:value="basicInfo.runner_type">
              <Select.Option value="r_script">R Script</Select.Option>
              <Select.Option value="python">Python</Select.Option>
              <Select.Option value="snakemake">Snakemake</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="脚本路径">
            <Input v-model:value="basicInfo.script_path" placeholder="scripts/go_enrichment.R" />
          </Form.Item>
        </Form>
      </Tabs.TabPane>

      <!-- 输入文件 -->
      <Tabs.TabPane key="input" tab="输入文件">
        <div class="tab-actions">
          <Button type="primary" size="small" @click="addInputFile">+ 添加文件</Button>
        </div>
        <Table :columns="inputColumns" :data-source="inputFiles" :pagination="false" size="small">
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
              <Input v-model:value="record.extensions" size="small" placeholder=".txt, .csv" />
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
          <Button type="primary" size="small" @click="addParam">+ 添加参数</Button>
        </div>
        <Table :columns="paramColumns" :data-source="paramItems" :pagination="false" size="small">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'key'">
              <Input v-model:value="record.key" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'title'">
              <Input v-model:value="record.title" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'type'">
              <Select v-model:value="record.type" size="small" style="width: 100%">
                <Select.Option value="string">string</Select.Option>
                <Select.Option value="integer">integer</Select.Option>
                <Select.Option value="number">number</Select.Option>
                <Select.Option value="boolean">boolean</Select.Option>
              </Select>
            </template>
            <template v-else-if="column.dataIndex === 'widget'">
              <Select v-model:value="record.widget" size="small" style="width: 100%">
                <Select.Option value="text">text</Select.Option>
                <Select.Option value="number">number</Select.Option>
                <Select.Option value="slider">slider</Select.Option>
                <Select.Option value="select">select</Select.Option>
                <Select.Option value="switch">switch</Select.Option>
              </Select>
            </template>
            <template v-else-if="column.dataIndex === 'default'">
              <Input v-model:value="record.default" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <Popconfirm title="确定删除?" @confirm="removeParam(index)">
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <!-- 输出配置 -->
      <Tabs.TabPane key="output" tab="输出配置">
        <div class="tab-actions">
          <Button type="primary" size="small" @click="addOutput">+ 添加输出</Button>
        </div>
        <Table :columns="outputColumns" :data-source="outputItems" :pagination="false" size="small">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'key'">
              <Input v-model:value="record.key" size="small" />
            </template>
            <template v-else-if="column.dataIndex === 'path'">
              <Input v-model:value="record.path" size="small" placeholder="result/plot.json" />
            </template>
            <template v-else-if="column.dataIndex === 'type'">
              <Select v-model:value="record.type" size="small" style="width: 100%">
                <Select.Option value="echarts">ECharts</Select.Option>
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
    </Tabs>

    <template #footer>
      <Space>
        <Button @click="visible = false">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSave">保存配置</Button>
      </Space>
    </template>
  </Drawer>
</template>

<style scoped>
.tab-actions {
  margin-bottom: 12px;
}
</style>
