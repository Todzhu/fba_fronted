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

// @ts-ignore
import { Icon } from '@iconify/vue';
import {
  Button,
  Collapse,
  CollapsePanel,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Tooltip,
} from 'ant-design-vue';

import OfficeColorPicker from './OfficeColorPicker.vue';
import PaletteSelect from './PaletteSelect.vue';

interface SchemaProperty {
  type?: string; // 改为可选，因为从 schema 读取时可能为 undefined
  title?: string;
  description?: string;
  default?: unknown;
  widget?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  step?: number;
  group?: string; // 分组名称
  required?: boolean; // 支持属性内部的 required 标记
  multiple?: boolean; // metadata_value_select 是否允许多选
  palettePreview?: string; // 调色板预览类型
}

interface SchemaPropertyWithKey extends SchemaProperty {
  key: string;
}

interface ParamSchema {
  type: 'object';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  order?: string[]; // 参数顺序
  default_expanded_groups?: string[];
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

// 解析 schema 属性列表（按 order 数组排序）
const properties = computed(() => {
  if (!props.schema?.properties) return [];
  const allKeys = Object.keys(props.schema.properties);
  // 按 order 数组排序，未在 order 中的放到最后
  const orderedKeys = props.schema.order
    ? [
        ...props.schema.order.filter((k) => allKeys.includes(k)),
        ...allKeys.filter((k) => !props.schema!.order!.includes(k)),
      ]
    : allKeys;
  return orderedKeys.map((key) => ({
    key,
    ...props.schema!.properties![key],
  }));
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

const defaultExpandedGroups = computed(
  () => props.schema?.default_expanded_groups ?? [],
);

const MAX_EXPANDED_ITEMS = 8;
const activeKeys = ref<string[]>([]);
const collapseTouched = ref(false);

const groupHasRequiredParam = (items: typeof properties.value): boolean => {
  const requiredKeys = new Set(props.schema?.required ?? []);
  return items.some((prop) => prop.required || requiredKeys.has(prop.key));
};

const getDefaultActiveKeys = (
  groups: Array<[string, typeof properties.value]>,
): string[] => {
  const groupNames = new Set(groups.map(([name]) => name));
  const configuredGroups = props.schema?.default_expanded_groups ?? [];
  if (configuredGroups.length > 0) {
    return configuredGroups.filter((name) => groupNames.has(name));
  }

  const totalItems = groups.reduce((sum, [, items]) => sum + items.length, 0);
  if (groups.length <= 2 || totalItems <= MAX_EXPANDED_ITEMS) {
    return groups.map(([name]) => name);
  }

  const requiredGroups = groups
    .filter(([, items]) => groupHasRequiredParam(items))
    .map(([name]) => name);
  const firstGroup = groups[0]?.[0];
  const firstOptionalGroup = groups.find(
    ([name]) => !requiredGroups.includes(name),
  )?.[0];

  return Array.from(
    new Set(
      [firstGroup, ...requiredGroups, firstOptionalGroup].filter(
        Boolean,
      ) as string[],
    ),
  );
};

type CollapseKey = number | string;

const normalizeActiveKeys = (keys: CollapseKey | CollapseKey[]) =>
  (Array.isArray(keys) ? keys : [keys]).map(String);

const handleCollapseChange = (keys: CollapseKey | CollapseKey[]) => {
  collapseTouched.value = true;
  activeKeys.value = normalizeActiveKeys(keys);
};

watch(
  [groupedProperties, defaultExpandedGroups],
  ([groups]) => {
    const groupNames = groups.map(([name]) => name);
    if (collapseTouched.value) {
      const preservedKeys = activeKeys.value.filter((key) =>
        groupNames.includes(key),
      );
      activeKeys.value =
        preservedKeys.length > 0 ? preservedKeys : getDefaultActiveKeys(groups);
      return;
    }

    activeKeys.value = getDefaultActiveKeys(groups);
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

const splitPairValue = (value: unknown): [string, string] => {
  if (typeof value !== 'string' || !value) return ['', ''];
  const parts = value.split(',', 2).map((item) => item.trim());
  return [parts[0] || '', parts[1] || ''];
};

const updatePairValue = (key: string, side: 0 | 1, value: unknown) => {
  const pair = splitPairValue(props.modelValue[key]);
  pair[side] = typeof value === 'string' ? value : '';

  const otherSide = side === 0 ? 1 : 0;
  if (pair[side] && pair[side] === pair[otherSide]) {
    pair[otherSide] = '';
  }

  if (!pair[0] && !pair[1]) {
    updateField(key, '');
    return;
  }

  updateField(key, `${pair[0]},${pair[1]}`);
};

const palettePreviewColors: Record<string, string[]> = {
  nature36: [
    '#3B6EA8',
    '#E64B35',
    '#00A087',
    '#4DBBD5',
    '#F39B7F',
    '#8491B4',
    '#91D1C2',
    '#DC0000',
    '#7E6148',
    '#B09C85',
    '#6F99AD',
    '#D98C3F',
  ],
  polychrome36: [
    '#5A5156',
    '#E4E1E3',
    '#F6222E',
    '#FE00FA',
    '#16FF32',
    '#3283FE',
    '#FEAF16',
    '#B00068',
    '#1CFFCE',
    '#90AD1C',
    '#2ED9FF',
    '#DEA0FD',
  ],
  tableau20: [
    '#4E79A7',
    '#A0CBE8',
    '#F28E2B',
    '#FFBE7D',
    '#59A14F',
    '#8CD17D',
    '#B6992D',
    '#F1CE63',
    '#499894',
    '#86BCB6',
  ],
  npg: [
    '#E64B35',
    '#4DBBD5',
    '#00A087',
    '#3C5488',
    '#F39B7F',
    '#8491B4',
    '#91D1C2',
    '#DC0000',
    '#7E6148',
    '#B09C85',
  ],
  lancet: [
    '#00468B',
    '#ED0000',
    '#42B540',
    '#0099B4',
    '#925E9F',
    '#FDAF91',
    '#AD002A',
    '#ADB6B6',
    '#1B1919',
  ],
  jco: [
    '#0073C2',
    '#EFC000',
    '#868686',
    '#CD534C',
    '#7AA6DC',
    '#003C67',
    '#8F7700',
    '#3B3B3B',
    '#A73030',
    '#4A6990',
  ],
  okabe_ito: [
    '#0072B2',
    '#E69F00',
    '#009E73',
    '#D55E00',
    '#CC79A7',
    '#56B4E9',
    '#F0E442',
    '#000000',
  ],
  clinical: [
    '#4E79A7',
    '#E15759',
    '#59A14F',
    '#B07AA1',
    '#F28E2B',
    '#76B7B2',
    '#EDC948',
    '#9C755F',
  ],
  jama: [
    '#374E55',
    '#DF8F44',
    '#00A1D5',
    '#B24745',
    '#79AF97',
    '#6A6599',
    '#80796B',
  ],
  nejm: [
    '#BC3C29',
    '#0072B5',
    '#E18727',
    '#20854E',
    '#7876B1',
    '#6F99AD',
    '#FFDC91',
    '#EE4C97',
  ],
  tableau10: [
    '#4E79A7',
    '#F28E2B',
    '#59A14F',
    '#E15759',
    '#76B7B2',
    '#EDC948',
    '#B07AA1',
    '#FF9DA7',
    '#9C755F',
    '#BAB0AC',
  ],
};

const inferPalettePreview = (prop: SchemaPropertyWithKey) => {
  if (prop.palettePreview) return prop.palettePreview;
  if (prop.key === 'celltype_palette') return 'celltype';
  if (prop.key === 'group_palette') return 'group';
  return '';
};

const hasPalettePreview = (prop: SchemaPropertyWithKey) =>
  Boolean(inferPalettePreview(prop));

const getPalettePreviewColors = (value: unknown) => {
  if (typeof value !== 'string') return [];
  return palettePreviewColors[value] || [];
};

// 确定渲染的组件类型
const getWidgetType = (prop: SchemaPropertyWithKey): string => {
  if (prop.widget) return prop.widget;
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

const getParamItemClass = (prop: SchemaPropertyWithKey) => {
  const widgetType = getWidgetType(prop);
  return [
    'param-item',
    'param-item--inline',
    {
      'param-item--wide':
        ['metadata_pair_select', 'multi-select'].includes(widgetType) ||
        prop.key === 'split_by' ||
        hasPalettePreview(prop),
      'param-item--comparison-column': prop.key === 'split_by',
      'param-item--multi-select': widgetType === 'multi-select',
      'param-item--pair-select': widgetType === 'metadata_pair_select',
      'param-item--palette-preview': hasPalettePreview(prop),
      'param-item--switch': widgetType === 'switch',
    },
  ];
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
      class="compact-collapse"
      expand-icon-position="start"
      @change="handleCollapseChange"
    >
      <CollapsePanel
        v-for="[groupName, items] in groupedProperties"
        :key="groupName"
      >
        <template #header>
          <div class="param-group-header">
            <span>{{ groupName }}</span>
            <span class="param-count">{{ items.length }}</span>
          </div>
        </template>
        <div class="param-grid">
          <div
            v-for="prop in items"
            :key="prop.key"
            :class="getParamItemClass(prop)"
          >
            <!-- 标签 -->
            <div class="param-label">
              <span class="label-text">{{ prop.title || prop.key }}</span>
              <span
                v-if="prop.required || schema?.required?.includes(prop.key)"
                class="required-mark"
                >*</span
              >
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
                    prop.enum || ['pal1', 'pal2', 'pal3', 'pal4', 'pal5']
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
                  @change="(val) => updateField(prop.key, val)"
                >
                  <Select.Option
                    v-for="opt in prop.enum"
                    :key="opt"
                    :value="opt"
                  >
                    <div
                      v-if="hasPalettePreview(prop)"
                      class="palette-select-option"
                    >
                      <span class="palette-option-label">{{ opt }}</span>
                      <span class="palette-swatch-row">
                        <span
                          v-for="(color, index) in getPalettePreviewColors(opt)"
                          :key="`${opt}-${index}`"
                          class="palette-swatch"
                          :style="{ backgroundColor: color }"
                        ></span>
                      </span>
                    </div>
                    <template v-else>{{ opt }}</template>
                  </Select.Option>
                </Select>
                <div
                  v-if="hasPalettePreview(prop)"
                  class="palette-selected-preview"
                >
                  <span
                    v-for="(color, index) in getPalettePreviewColors(
                      (modelValue[prop.key] as string) ?? prop.default,
                    )"
                    :key="`${prop.key}-selected-${index}`"
                    class="palette-selected-swatch"
                    :style="{ backgroundColor: color }"
                  ></span>
                </div>
              </template>

              <!-- 多选下拉（metadata_value_select 运行时转为 multi-select） -->
              <template v-else-if="getWidgetType(prop) === 'multi-select'">
                <Select
                  :value="
                    (modelValue[prop.key]
                      ? typeof modelValue[prop.key] === 'string'
                        ? (modelValue[prop.key] as string)
                            .split(',')
                            .filter(Boolean)
                        : modelValue[prop.key]
                      : []) as any
                  "
                  mode="multiple"
                  class="select-input"
                  :placeholder="prop.description || '请先选择对应的列名'"
                  :disabled="!prop.enum || prop.enum.length === 0"
                  @change="
                    (val: any) =>
                      updateField(prop.key, (val as string[]).join(','))
                  "
                >
                  <Select.Option
                    v-for="opt in prop.enum"
                    :key="opt"
                    :value="opt"
                  >
                    {{ opt }}
                  </Select.Option>
                </Select>
              </template>

              <!-- 成对比较选择器（如 CellChat 指定比较组合） -->
              <template
                v-else-if="getWidgetType(prop) === 'metadata_pair_select'"
              >
                <div class="pair-select-control">
                  <Select
                    :value="
                      splitPairValue(modelValue[prop.key])[0] || undefined
                    "
                    allow-clear
                    class="pair-select-input"
                    placeholder="选择分组 A"
                    :disabled="!prop.enum || prop.enum.length < 2"
                    @change="(val: any) => updatePairValue(prop.key, 0, val)"
                  >
                    <Select.Option
                      v-for="opt in prop.enum"
                      :key="opt"
                      :value="opt"
                      :disabled="
                        splitPairValue(modelValue[prop.key])[1] === opt
                      "
                    >
                      {{ opt }}
                    </Select.Option>
                  </Select>
                  <span class="pair-select-arrow">vs</span>
                  <Select
                    :value="
                      splitPairValue(modelValue[prop.key])[1] || undefined
                    "
                    allow-clear
                    class="pair-select-input"
                    placeholder="选择分组 B"
                    :disabled="!prop.enum || prop.enum.length < 2"
                    @change="(val: any) => updatePairValue(prop.key, 1, val)"
                  >
                    <Select.Option
                      v-for="opt in prop.enum"
                      :key="opt"
                      :value="opt"
                      :disabled="
                        splitPairValue(modelValue[prop.key])[0] === opt
                      "
                    >
                      {{ opt }}
                    </Select.Option>
                  </Select>
                </div>
              </template>

              <!-- 开关 -->
              <template v-else-if="getWidgetType(prop) === 'switch'">
                <Switch
                  size="small"
                  :checked="
                    (modelValue[prop.key] as boolean) ?? prop.default ?? false
                  "
                  @change="(checked) => updateField(prop.key, checked)"
                />
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
                    (modelValue[prop.key] as string) ||
                    (prop.default as string) ||
                    ''
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
      </CollapsePanel>
    </Collapse>

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
.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/* 可折叠面板样式 (重构分类头) */
:deep(.ant-collapse) {
  background: transparent;
}

:deep(.ant-collapse-item) {
  border-bottom: none !important; /* 去掉冗杂细线 */
  margin-bottom: 8px;
}

:deep(.ant-collapse-header) {
  min-height: 34px;
  padding: 6px 10px !important;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b !important;
  background: #f8fafc;
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  align-items: center !important;
}

.param-group-header {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.param-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #e2e8f0;
  border-radius: 999px;
}

:deep(.ant-collapse-content-box) {
  padding: 0 4px 0 !important;
}

/* ========== 参数网格布局（响应式） ========== */
.param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(252px, 1fr));
  gap: 8px 12px;
  align-items: start;
}

/* 单个参数项 */
.param-item {
  display: grid;
  gap: 6px 8px;
  align-items: center;
  min-height: 34px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

.param-item--inline {
  grid-template-columns: 92px minmax(0, 1fr);
}

.param-item--wide {
  grid-column: 1 / -1;
}

.param-item--switch {
  align-items: center;
}

.param-item--multi-select {
  grid-template-columns: 1fr;
  gap: 6px;
  align-items: stretch;
}

.param-item--multi-select .param-label {
  padding-top: 0;
}

.param-item--multi-select :deep(.ant-select-selector) {
  height: auto !important;
  max-height: 92px;
  overflow-y: auto;
  align-items: flex-start;
}

.param-item--multi-select :deep(.ant-select-selection-overflow) {
  row-gap: 4px;
  overflow-y: auto;
  align-content: flex-start;
}

.param-item--comparison-column,
.param-item--pair-select {
  grid-template-columns: 1fr;
  gap: 6px;
  align-items: stretch;
}

/* 标签样式升维 */
.param-label {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  min-height: 0;
  margin-bottom: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  color: #475569; /* 加深一点，提升可读性 */
}

.label-text {
  min-width: 0;
  margin-right: 0;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.help-icon {
  flex: 0 0 auto;
  font-size: 13px;
  color: #94a3b8;
  cursor: help;
  transition: color 0.2s ease;
}

.help-icon:hover {
  color: #3b82f6;
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
  margin-left: 4px;
  font-weight: bold;
  font-size: 13px;
  color: #f43f5e; /* 更高级醒目的玫瑰红 */
}

/* 输入控件容器 */
.param-control {
  min-width: 0;
  width: 100%;
}

/* 滑块+数字输入组合 */
.slider-input-combo {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
}

.slider {
  flex: 1;
}

.number-input {
  width: 64px;
}

/* 其他输入控件 */
.select-input {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.palette-select-option {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-width: 220px;
}

.palette-option-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: #1e293b;
}

.palette-swatch-row {
  display: inline-flex;
  flex: 1;
  gap: 2px;
  align-items: center;
  justify-content: flex-end;
  min-width: 86px;
  max-width: 132px;
}

.palette-swatch {
  width: 10px;
  height: 18px;
  border: 1px solid rgb(15 23 42 / 10%);
  border-radius: 2px;
}

.palette-selected-preview {
  display: flex;
  gap: 2px;
  align-items: center;
  width: 100%;
  max-width: none;
  height: 12px;
  padding: 2px;
  margin-top: 2px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.palette-selected-swatch {
  flex: 1;
  height: 100%;
  min-width: 6px;
  border: 1px solid rgb(15 23 42 / 8%);
  border-radius: 2px;
}

.pair-select-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  width: 100%;
}

.pair-select-input {
  min-width: 0;
  width: 100%;
}

.pair-select-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 7px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
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

/* 底部操作按钮模块化重构 */
.form-actions {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end; /* 主要行动靠右 */
  padding: 8px 10px;
  margin: 8px -4px 0;
  background: rgb(248 250 252 / 96%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 -8px 18px rgb(15 23 42 / 8%);
  backdrop-filter: blur(6px);
}

/* 重置推至最左侧边界 */
.form-actions > .ant-btn:first-child {
  margin-right: auto;
  border-color: #e2e8f0 !important;
  color: #64748b !important;
}

.form-actions .ant-btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 8px;
}

/* 提交按钮巨幅提亮设计 */
.form-actions .ant-btn-primary:not(.ant-btn-background-ghost) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  height: 30px;
  padding: 0 16px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.form-actions .ant-btn-primary:not(.ant-btn-background-ghost):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
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

/* 立体悬浮现代输入框样式 */
:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-select-selector) {
  min-height: 34px;
  height: 34px;
  background-color: #f8fafc !important;
  border-color: #e2e8f0 !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  transition: all 0.2s ease;
}

:deep(.ant-input:focus),
:deep(.ant-input:hover),
:deep(.ant-input-number:focus),
:deep(.ant-input-number:hover),
:deep(.ant-select-selector:hover),
:deep(.ant-select-focused .ant-select-selector) {
  background-color: #ffffff !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
}

/* 确保输入框内的值显示为正常深色（非 placeholder 样式） */
:deep(.ant-input) {
  height: 34px;
  color: #1e293b !important;
}

:deep(.ant-input-number-input) {
  height: 32px !important;
}

:deep(.ant-select-single .ant-select-selector .ant-select-selection-item),
:deep(
  .ant-select-single .ant-select-selector .ant-select-selection-placeholder
) {
  line-height: 32px !important;
}

:deep(.ant-select-multiple .ant-select-selector) {
  height: auto !important;
  min-height: 34px;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

:deep(.ant-select-multiple .ant-select-selection-overflow) {
  row-gap: 4px;
  align-content: flex-start;
}

:deep(.ant-select-multiple .ant-select-selection-item) {
  max-width: 100%;
}

:deep(.ant-slider) {
  margin: 8px 4px;
}

:deep(.ant-input::placeholder) {
  color: #94a3b8 !important;
}

:deep(.ant-slider-track) {
  background-color: #3b82f6;
}

:deep(.ant-slider-handle) {
  border-color: #3b82f6;
}

:deep(.ant-switch-checked) {
  background-color: #3b82f6;
}

@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
  }

  .param-item--inline {
    grid-template-columns: 1fr;
  }

  .param-label {
    min-height: 18px;
  }

  .form-actions {
    flex-wrap: wrap;
  }
}
</style>
