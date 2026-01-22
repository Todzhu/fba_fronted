<script lang="ts" setup>
/**
 * DynamicForm - 根据 JSON Schema 动态生成表单
 *
 * 参照 Hiplot 设计:
 *   - 可折叠分组 (Collapse)
 *   - 滑块+数字输入框组合
 *   - 开关在右侧
 *   - 支持 widget: slider, select, switch, number, text, color
 */
import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Button,
  Collapse,
  CollapsePanel,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
} from 'ant-design-vue';

import OfficeColorPicker from './OfficeColorPicker.vue';

interface SchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  widget?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  step?: number;
  group?: string; // 分组名称
}

interface SchemaPropertyWithKey extends SchemaProperty {
  key: string;
}

interface ParamSchema {
  type: 'object';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

const props = defineProps<{
  modelValue: Record<string, unknown>;
  schema: null | ParamSchema;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void;
  (e: 'reset'): void;
  (e: 'import'): void;
  (e: 'export'): void;
  (e: 'submit'): void;
}>();

// 解析 schema 属性列表
const properties = computed(() => {
  if (!props.schema?.properties) return [];
  return Object.entries(props.schema.properties).map(([key, prop]) => ({
    key,
    ...prop,
  }));
});

// 按分组整理属性
const groupedProperties = computed(() => {
  const groups: Record<string, typeof properties.value> = {
    特殊参数: [],
    通用参数: [],
  };

  for (const prop of properties.value) {
    let groupName = prop.group;

    // 智能分组逻辑：如果未指定分组，根据 key 自动归类
    if (!groupName) {
      const lowerKey = prop.key.toLowerCase();
      groupName =
        lowerKey.includes('color') ||
        lowerKey.includes('颜色') ||
        lowerKey.includes('title') ||
        lowerKey.includes('标题') ||
        lowerKey.includes('size') ||
        lowerKey.includes('大小') ||
        lowerKey.includes('width') ||
        lowerKey.includes('height')
          ? '通用参数'
          : '特殊参数';
    }

    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(prop);
  }

  // 过滤空分组，确保通用参数在最后（或者根据需求调整顺序）
  // 这里保持原本的对象遍历顺序，但我们可以强制排序
  const ORDER = ['特殊参数', '通用参数'];
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .sort((a, b) => {
      const idxA = ORDER.indexOf(a[0]);
      const idxB = ORDER.indexOf(b[0]);
      // 如果都在列表中，按列表顺序；否则放在最后
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
});

// 默认展开所有分组
const activeKeys = ref<string[]>([]);

watch(
  groupedProperties,
  (groups) => {
    activeKeys.value = groups.map(([name]) => name);
  },
  { immediate: true },
);

// 初始化默认值
watch(
  () => props.schema,
  (schema) => {
    if (!schema?.properties) return;
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.default !== undefined && props.modelValue[key] === undefined) {
        defaults[key] = prop.default;
      }
    }
    if (Object.keys(defaults).length > 0) {
      emit('update:modelValue', { ...props.modelValue, ...defaults });
    }
  },
  { immediate: true },
);

// 更新单个字段
const updateField = (key: string, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

// 确定渲染的组件类型
const getWidgetType = (prop: SchemaPropertyWithKey): string => {
  if (prop.widget) return prop.widget;
  if (prop.enum) return 'select';
  if (prop.type === 'boolean') return 'switch';
  if (prop.type === 'integer' || prop.type === 'number') return 'slider';

  // 智能推断颜色类型
  const lowerKey = prop.key.toLowerCase();
  if (lowerKey.includes('color') || lowerKey.includes('颜色')) return 'color';

  return 'text';
};

// 重置表单
const handleReset = () => {
  emit('reset');
};

// 导入参数
const handleImport = () => {
  emit('import');
};

// 导出参数
const handleExport = () => {
  emit('export');
};

// 提交
const handleSubmit = () => {
  emit('submit');
};
</script>

<template>
  <div v-if="schema" class="dynamic-form">
    <!-- 可折叠分组 -->
    <Collapse
      v-model:active-key="activeKeys"
      :bordered="false"
      expand-icon-position="start"
    >
      <CollapsePanel
        v-for="[groupName, items] in groupedProperties"
        :key="groupName"
        :header="groupName"
      >
        <Form layout="vertical" class="param-form">
          <div v-for="prop in items" :key="prop.key" class="param-row">
            <!-- 标签 -->
            <div class="param-label">
              <span class="label-text">{{ prop.title || prop.key }}</span>
              <Tooltip :title="prop.description || prop.title || prop.key">
                <Icon
                  icon="ant-design:question-circle-outlined"
                  class="help-icon"
                />
              </Tooltip>
              <span class="colon">：</span>
            </div>

            <!-- 滑块+数字输入组合 -->
            <template v-if="getWidgetType(prop) === 'slider'">
              <div class="slider-input-combo">
                <Slider
                  :value="(modelValue[prop.key] as number) ?? prop.default ?? 0"
                  :min="prop.minimum ?? 0"
                  :max="prop.maximum ?? 100"
                  :step="prop.step ?? 0.01"
                  class="slider"
                  @change="(val) => updateField(prop.key, val)"
                />
                <InputNumber
                  :value="(modelValue[prop.key] as number) ?? prop.default ?? 0"
                  :min="prop.minimum"
                  :max="prop.maximum"
                  :step="prop.step ?? 0.01"
                  class="number-input"
                  @change="(val) => updateField(prop.key, val)"
                />
              </div>
            </template>

            <!-- 下拉选择 -->
            <template v-else-if="getWidgetType(prop) === 'select'">
              <Select
                :value="(modelValue[prop.key] as string) ?? prop.default"
                class="select-input"
                @change="(val) => updateField(prop.key, val)"
              >
                <Select.Option v-for="opt in prop.enum" :key="opt" :value="opt">
                  {{ opt }}
                </Select.Option>
              </Select>
            </template>

            <!-- 开关 -->
            <template v-else-if="getWidgetType(prop) === 'switch'">
              <Switch
                :checked="
                  (modelValue[prop.key] as boolean) ?? prop.default ?? false
                "
                @change="(checked) => updateField(prop.key, checked)"
              />
            </template>

            <!-- 数字输入 -->
            <template v-else-if="getWidgetType(prop) === 'number'">
              <InputNumber
                :value="(modelValue[prop.key] as number) ?? prop.default"
                :min="prop.minimum"
                :max="prop.maximum"
                class="number-input-only"
                @change="(val) => updateField(prop.key, val)"
              />
            </template>

            <!-- 颜色选择器 -->
            <template v-else-if="getWidgetType(prop) === 'color'">
              <div class="color-input-wrapper">
                <OfficeColorPicker
                  :model-value="
                    (modelValue[prop.key] as string) ??
                    prop.default ??
                    '#000000'
                  "
                  :default-color="prop.default as string"
                  @update:model-value="(val) => updateField(prop.key, val)"
                />
              </div>
            </template>

            <!-- 文本输入 -->
            <template v-else>
              <Input
                :value="(modelValue[prop.key] as string) ?? prop.default ?? ''"
                :placeholder="
                  prop.description || `请输入${prop.title || prop.key}`
                "
                class="text-input"
                @change="
                  (e: Event) =>
                    updateField(prop.key, (e.target as HTMLInputElement).value)
                "
              />
            </template>
          </div>
        </Form>
      </CollapsePanel>
    </Collapse>

    <!-- 底部操作按钮 -->
    <div class="form-actions">
      <Button @click="handleReset">重 置</Button>
      <Button type="primary" ghost @click="handleImport">
        <template #icon>
          <Icon icon="ant-design:code-outlined" />
        </template>
        导入参数文件
      </Button>
      <Button type="primary" ghost @click="handleExport">
        <template #icon>
          <Icon icon="ant-design:code-outlined" />
        </template>
        导出参数文件
      </Button>
      <Button type="primary" @click="handleSubmit">提 交</Button>
    </div>
  </div>

  <div v-else class="empty-schema">
    <p>暂无可配置参数</p>
  </div>
</template>

<style scoped>
.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 数据参数标签 */
.section-tab {
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

/* 可折叠面板样式 */
:deep(.ant-collapse) {
  background: transparent;
}

:deep(.ant-collapse-item) {
  border-bottom: 1px solid #e2e8f0 !important;
}

:deep(.ant-collapse-header) {
  padding: 12px 0 !important;
  font-weight: 500;
  color: #334155 !important;
}

:deep(.ant-collapse-content-box) {
  padding: 16px 0 !important;
}

/* 参数行 */
.param-row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.param-row:hover {
  background-color: #f8fafc;
}

.param-label {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  width: 140px;
  min-width: 140px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.help-icon {
  margin-left: 4px;
  color: #94a3b8;
  cursor: help;
}

.colon {
  margin-left: 2px;
}

/* 滑块+数字输入组合 */
.slider-input-combo {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
}

.slider {
  flex: 1;
}

.number-input {
  width: 80px;
}

/* 其他输入控件 */
.select-input {
  flex: 1;
  min-width: 200px;
}

.number-input-only {
  flex: 1;
  width: 100%;
}

.text-input {
  flex: 1;
}

/* 颜色选择器 */
.color-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.native-color-picker {
  width: 60px;
  height: 32px;
  padding: 2px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.color-value {
  font-family: monospace;
  font-size: 14px;
  color: #64748b;
}

/* 底部操作按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}

.form-actions .ant-btn {
  min-width: 80px;
}

/* 空状态 */
.empty-schema {
  padding: 32px;
  color: var(--text-color-secondary);
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}

/* 现代输入框样式 */
:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-select-selector) {
  border-color: #e2e8f0 !important;
  border-radius: 6px !important;
}

:deep(.ant-input:hover),
:deep(.ant-input-number:hover),
:deep(.ant-select-selector:hover) {
  border-color: var(--primary-color) !important;
}

:deep(.ant-slider-track) {
  background-color: #09f;
}

:deep(.ant-slider-handle) {
  border-color: #09f;
}

:deep(.ant-switch-checked) {
  background-color: #09f;
}
</style>
