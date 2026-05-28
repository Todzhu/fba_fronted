<script lang="ts" setup>
/**
 * DynamicForm - 根据 JSON Schema 动态生成表单
 *
 * 参照 Hiplot 设计:
 *   - 分组参数布局
 *   - 滑块+数字输入框组合
 *   - 开关在右侧
 *   - 支持 widget: slider, select, switch, number, text, color
 */
import { computed, watch } from 'vue';

// @ts-ignore
import { Icon } from '@iconify/vue';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Tooltip,
} from 'antdv-next';

import OfficeColorPicker from './OfficeColorPicker.vue';
import PaletteSelect from './PaletteSelect.vue';

interface SchemaProperty {
  type?: string; // 改为可选，因为从 schema 读取时可能为 undefined
  title?: string;
  description?: string;
  default?: unknown;
  widget?: string;
  enum?: string[];
  disabledEnum?: string[];
  minimum?: number;
  maximum?: number;
  step?: number;
  group?: string; // 分组名称
  required?: boolean; // 支持属性内部的 required 标记
  depends_on?: string; // 依赖的参数 key（用于 metadata_value_select 等联动）
  fileKey?: string; // 绑定的输入文件 key（用于 column_select）
  key?: string;
  typeWidget?: string[];
}

interface SchemaPropertyWithKey extends SchemaProperty {
  key: string;
}

interface ParamSchema {
  type: 'object';
  param_items?: SchemaPropertyWithKey[];
  properties?: Record<string, SchemaProperty> | SchemaPropertyWithKey[];
  required?: string[];
  order?: string[]; // 参数顺序
}

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>;
    schema: null | ParamSchema;
    showActions?: boolean;
  }>(),
  {
    showActions: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void;
  (e: 'reset'): void;
  (e: 'import'): void;
  (e: 'export'): void;
  (e: 'submit'): void;
}>();

const normalizeProperty = (key: string, rawProp: SchemaProperty) => {
  const prop = { ...rawProp };
  if (Array.isArray(prop.typeWidget)) {
    prop.type = prop.type ?? prop.typeWidget[0];
    prop.widget = prop.widget ?? prop.typeWidget[1];
  }
  const rawEnum = prop.enum as unknown;
  if (rawEnum === '') {
    delete prop.enum;
  } else if (typeof rawEnum === 'string') {
    prop.enum = rawEnum
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  delete prop.typeWidget;
  return {
    key,
    ...prop,
  };
};

const normalizedProperties = computed<Record<string, SchemaProperty>>(() => {
  const rawProperties = props.schema?.properties;
  const rawItems = Array.isArray(rawProperties)
    ? rawProperties
    : Array.isArray(props.schema?.param_items)
      ? props.schema.param_items
      : null;

  if (rawItems) {
    const result: Record<string, SchemaProperty> = {};
    for (const item of rawItems) {
      if (!item.key) continue;
      const { key, ...prop } = item;
      result[key] = prop;
    }
    return result;
  }

  if (rawProperties && !Array.isArray(rawProperties)) {
    return rawProperties;
  }

  return {};
});

// 解析 schema 属性列表（按 order 数组排序）
const properties = computed(() => {
  const schemaProperties = normalizedProperties.value;
  const allKeys = Object.keys(schemaProperties);
  if (allKeys.length === 0) return [];
  // 按 order 数组排序，未在 order 中的放到最后
  const orderedKeys = props.schema?.order
    ? [
        ...props.schema.order.filter((k) => allKeys.includes(k)),
        ...allKeys.filter((k) => !props.schema!.order!.includes(k)),
      ]
    : allKeys;
  return orderedKeys.map((key) => normalizeProperty(key, schemaProperties[key]!));
});

// 按分组整理属性
const groupedProperties = computed(() => {
  // 使用 Map 保持插入顺序，或者依赖对象的插入顺序（ES2015+）
  // 这里为了稳健，我们建立一个 orderedGroups 数组来记录分组出现的顺序
  const groupOrder: string[] = [];
  const groups: Record<string, typeof properties.value> = {};

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
      groupOrder.push(groupName); // 记录新分组出现顺序
    }
    groups[groupName]!.push(prop);
  }

  // 按照分组出现的顺序返回
  return groupOrder.map(
    (name) => [name, groups[name]] as [string, typeof properties.value],
  );
});

// 初始化默认值
watch(
  () => props.schema,
  (schema) => {
    if (!schema) return;
    const defaults: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(normalizedProperties.value)) {
      // 使用 || 让空字符串也能被默认值替换
      if (prop.default !== undefined && !props.modelValue[key]) {
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

const getEnumOptions = (prop: SchemaPropertyWithKey): string[] => {
  return Array.isArray(prop.enum) ? prop.enum : [];
};

const getSelectOptions = (prop: SchemaPropertyWithKey) => {
  const disabledValues = new Set(prop.disabledEnum || []);
  return getEnumOptions(prop).map((value) => ({
    disabled: disabledValues.has(value),
    label: value,
    value,
  }));
};

const getNumberValue = (prop: SchemaPropertyWithKey) => {
  const value = props.modelValue[prop.key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return typeof prop.default === 'number' ? prop.default : 0;
};

const normalizeIntegerValue = (prop: SchemaPropertyWithKey, value: number) => {
  const min = prop.minimum;
  const max = prop.maximum;
  let nextValue = Math.round(value);
  if (typeof min === 'number') nextValue = Math.max(min, nextValue);
  if (typeof max === 'number') nextValue = Math.min(max, nextValue);
  return nextValue;
};

const updateIntegerField = (prop: SchemaPropertyWithKey, value: number | null) => {
  const fallback = getNumberValue(prop);
  updateField(prop.key, normalizeIntegerValue(prop, value ?? fallback));
};

const stepIntegerField = (prop: SchemaPropertyWithKey, direction: -1 | 1) => {
  const step = Number.isFinite(prop.step) ? Number(prop.step) : 1;
  const current = getNumberValue(prop);
  updateIntegerField(prop, current + direction * Math.max(1, Math.round(step)));
};

const getNumberPrecision = (prop: SchemaPropertyWithKey) => {
  const step = prop.step ?? 0.01;
  const stepText = String(step);
  if (!stepText.includes('.')) return 0;
  return stepText.split('.')[1]?.length ?? 0;
};

const normalizeNumberValue = (prop: SchemaPropertyWithKey, value: number) => {
  const min = prop.minimum;
  const max = prop.maximum;
  const precision = getNumberPrecision(prop);
  let nextValue = Number(value.toFixed(precision));
  if (typeof min === 'number') nextValue = Math.max(min, nextValue);
  if (typeof max === 'number') nextValue = Math.min(max, nextValue);
  return Number(nextValue.toFixed(precision));
};

const updateNumberField = (prop: SchemaPropertyWithKey, value: number | null) => {
  const fallback = getNumberValue(prop);
  updateField(prop.key, normalizeNumberValue(prop, value ?? fallback));
};

const stepNumberField = (prop: SchemaPropertyWithKey, direction: -1 | 1) => {
  const step = typeof prop.step === 'number' ? prop.step : 0.01;
  const current = getNumberValue(prop);
  updateNumberField(prop, current + direction * step);
};

// 确定渲染的组件类型
const getWidgetType = (prop: SchemaPropertyWithKey): string => {
  // metadata 联动 widget：有选项时降级为 select/multi-select，无选项时降级为 text
  if (prop.widget === 'metadata_column_select') {
    return prop.enum && prop.enum.length > 0 ? 'select' : 'text';
  }
  if (prop.widget === 'metadata_value_select') {
    return prop.enum && prop.enum.length > 0 ? 'multi-select' : 'text';
  }

  if (prop.widget) return prop.widget;
  if (prop.widget === 'multi-select') return 'multi-select';
  if (prop.enum) return 'select';
  if (prop.type === 'boolean') return 'switch';
  if (prop.type === 'integer' || prop.type === 'number') return 'slider';
  if (prop.widget === 'int') return 'int';
  if (prop.widget === 'float') return 'float';

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
    <!-- 参数分组 -->
    <div class="param-groups">
      <section
        v-for="[groupName, items] in groupedProperties"
        :key="groupName"
        class="param-group"
      >
        <h4 class="param-group-title">{{ groupName }}</h4>
        <div class="param-grid">
          <div v-for="prop in items" :key="prop.key" class="param-item">
            <!-- 标签 -->
            <div class="param-label">
              <span class="label-text">{{ prop.title || prop.key }}</span>
              <span
                v-if="prop.required || schema?.required?.includes(prop.key)"
                class="required-mark">*</span>
              <Tooltip
                v-if="prop.description"
                placement="topLeft"
                :overlay-style="{ maxWidth: '320px' }"
              >
                <template #title>
                  <div class="tooltip-content">
                    <div class="tooltip-title">
                      {{ prop.title || prop.key }}
                    </div>
                    <div class="tooltip-desc">{{ prop.description }}</div>
                  </div>
                </template>
                <Icon
                  icon="ant-design:question-circle-outlined"
                  class="help-icon"
                />
              </Tooltip>
            </div>
            <!-- 输入控件 -->
            <div class="param-control">
              <!-- 滑块+数字输入组合 -->
              <template v-if="getWidgetType(prop) === 'slider'">
                <div class="slider-input-combo">
                  <Slider
                    :value="
                      (modelValue[prop.key] as number) ?? prop.default ?? 0
                    "
                    :min="prop.minimum ?? 0"
                    :max="prop.maximum ?? 100"
                    :step="prop.step ?? 0.01"
                    class="slider"
                    @change="(val) => updateField(prop.key, val)"
                  />
                  <InputNumber
                    :value="
                      (modelValue[prop.key] as number) ?? prop.default ?? 0
                    "
                    :min="prop.minimum"
                    :max="prop.maximum"
                    :step="prop.step ?? 0.01"
                    class="number-input"
                    @change="(val) => updateField(prop.key, val)"
                  />
                </div>
              </template>

              <!-- 调色板选择器 -->
              <template v-else-if="getWidgetType(prop) === 'palette_select'">
                <PaletteSelect
                  :model-value="
                    (modelValue[prop.key] as string) ?? prop.default ?? 'pal2'
                  "
                  :options="
                    getEnumOptions(prop).length > 0
                      ? getEnumOptions(prop)
                      : ['pal1', 'pal2', 'pal3', 'pal4', 'pal5']
                  "
                  @update:model-value="(val) => updateField(prop.key, val)"
                />
              </template>

              <!-- 下拉选择 / 列名选择 -->
              <template
                v-else-if="
                  getWidgetType(prop) === 'select' ||
                  getWidgetType(prop) === 'column_select'
                "
              >
                <Select
                  :value="(modelValue[prop.key] as string) ?? prop.default"
                  class="select-input"
                  style="width: 100%"
                  :options="getSelectOptions(prop)"
                  :placeholder="getEnumOptions(prop).length > 0 ? '请选择' : '请先加载数据文件'"
                  @change="(val) => updateField(prop.key, val)"
                />
              </template>

              <!-- 多选下拉（值以逗号分隔字符串存储，兼容 R 脚本） -->
              <template
                v-else-if="getWidgetType(prop) === 'multi-select'"
              >
                <Select
                  :value="typeof modelValue[prop.key] === 'string' && modelValue[prop.key] ? (modelValue[prop.key] as string).split(',') : (Array.isArray(modelValue[prop.key]) ? modelValue[prop.key] : [])"
                  class="select-input"
                  style="width: 100%"
                  mode="multiple"
                  :options="getSelectOptions(prop)"
                  :max-tag-count="3"
                  placeholder="请选择（可多选）"
                  @change="(val) => updateField(prop.key, Array.isArray(val) ? val.join(',') : val)"
                />
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

              <!-- 整数步进输入 -->
              <template v-else-if="getWidgetType(prop) === 'integer-stepper'">
                <div class="integer-stepper">
                  <Button
                    class="stepper-button"
                    size="small"
                    @click="stepIntegerField(prop, -1)"
                  >
                    <Icon icon="mdi:minus" />
                  </Button>
                  <InputNumber
                    :value="getNumberValue(prop)"
                    :min="prop.minimum"
                    :max="prop.maximum"
                    :step="prop.step ?? 1"
                    :precision="0"
                    class="stepper-input"
                    @change="(val) => updateIntegerField(prop, val as number | null)"
                  />
                  <Button
                    class="stepper-button"
                    size="small"
                    @click="stepIntegerField(prop, 1)"
                  >
                    <Icon icon="mdi:plus" />
                  </Button>
                </div>
              </template>

              <!-- 小数步进输入 -->
              <template v-else-if="getWidgetType(prop) === 'number-stepper'">
                <div class="integer-stepper">
                  <Button
                    class="stepper-button"
                    size="small"
                    @click="stepNumberField(prop, -1)"
                  >
                    <Icon icon="mdi:minus" />
                  </Button>
                  <InputNumber
                    :value="getNumberValue(prop)"
                    :min="prop.minimum"
                    :max="prop.maximum"
                    :step="prop.step ?? 0.01"
                    :precision="getNumberPrecision(prop)"
                    class="stepper-input"
                    @change="(val) => updateNumberField(prop, val as number | null)"
                  />
                  <Button
                    class="stepper-button"
                    size="small"
                    @click="stepNumberField(prop, 1)"
                  >
                    <Icon icon="mdi:plus" />
                  </Button>
                </div>
              </template>

              <!-- 整数输入 -->
              <template v-else-if="getWidgetType(prop) === 'int'">
                <InputNumber
                  :value="(modelValue[prop.key] as number) ?? prop.default"
                  :min="prop.minimum"
                  :max="prop.maximum"
                  :step="prop.step ?? 1"
                  :precision="0"
                  class="number-input-only"
                  @change="(val) => updateField(prop.key, val)"
                />
              </template>

              <!-- 浮点数输入 -->
              <template v-else-if="getWidgetType(prop) === 'float'">
                <InputNumber
                  :value="(modelValue[prop.key] as number) ?? prop.default"
                  :min="prop.minimum"
                  :max="prop.maximum"
                  :step="prop.step ?? 0.01"
                  class="number-input-only"
                  @change="(val) => updateField(prop.key, val)"
                />
              </template>

              <!-- 数字输入 (通用) -->
              <template v-else-if="getWidgetType(prop) === 'number'">
                <InputNumber
                  :value="(modelValue[prop.key] as number) ?? prop.default"
                  :min="prop.minimum"
                  :max="prop.maximum"
                  :step="prop.step ?? 0.01"
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
                  :value="
                    (modelValue[prop.key] as string) || (prop.default as string) || ''
                  "
                  :placeholder="
                    prop.description || `请输入${prop.title || prop.key}`
                  "
                  class="text-input"
                  @change="
                    (e: Event) =>
                      updateField(
                        prop.key,
                        (e.target as HTMLInputElement).value,
                      )
                  "
                />
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部操作按钮 -->
    <div v-if="showActions" class="form-actions">
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
/* 响应式：小屏幕单列 */
@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
}

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

/* 参数分组 */
.param-groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.param-group {
  padding-bottom: 14px;
  border-bottom: 1px solid #e2e8f0;
}

.param-group:last-child {
  border-bottom: none;
}

.param-group-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* ========== 参数网格布局（响应式） ========== */
.param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px 24px; /* 减少行间距 16px -> 12px */
}

/* 单个参数项 (无边框极简风格) */
.param-item {
  display: flex;
  flex-direction: column;
  gap: 4px; /* 标签和输入框间距 6px -> 4px */
  padding: 0; /* 去除内边距 */

  /* 去除背景和边框 */
  background: transparent;
  border: none;
  border-radius: 0;
}

/* 标签样式 */
.param-label {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b; /* 颜色稍微淡一点，不再那么抢眼 */
}

.label-text {
  margin-right: 4px;
}

.help-icon {
  font-size: 13px;
  color: #94a3b8;
  cursor: help;
  transition: color 0.2s ease;
}

.help-icon:hover {
  color: #09f;
}

/* Tooltip 内容样式 */
.tooltip-content {
  padding: 4px 0;
}

.tooltip-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.tooltip-desc {
  font-size: 12px;
  line-height: 1.6;
  color: rgb(255 255 255 / 85%);
}

.required-mark {
  margin-right: 2px;
  margin-left: 2px;
  font-weight: bold;
  color: #ef4444;
}

/* 输入控件容器 */
.param-control {
  width: 100%;
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

.integer-stepper {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.stepper-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 32px;
  padding: 0;
}

.stepper-button :deep(svg) {
  font-size: 16px;
}

.stepper-input {
  width: 100%;
}

.stepper-input :deep(.ant-input-number-handler-wrap) {
  display: none;
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

/* 确保输入框内的值显示为正常深色（非 placeholder 样式） */
:deep(.ant-input) {
  color: #1e293b !important;
}

:deep(.ant-input::placeholder) {
  color: #94a3b8 !important;
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
