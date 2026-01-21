<script lang="ts" setup>
/**
 * DynamicForm - 根据 JSON Schema 动态生成表单
 *
 * Props:
 *   - schema: JSON Schema 对象 (param_schema)
 *   - modelValue: 表单数据
 *
 * 支持的 widget 类型:
 *   - slider: 滑块 (integer/number + widget: slider)
 *   - select: 下拉选择 (enum)
 *   - switch: 开关 (boolean)
 *   - number: 数字输入 (integer/number)
 *   - text: 文本输入 (string, 默认)
 */
import { computed, watch } from 'vue';

import {
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
} from 'ant-design-vue';

interface SchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  widget?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

interface ParamSchema {
  type: 'object';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

const props = defineProps<{
  schema: ParamSchema | null;
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void;
}>();

// 解析 schema 属性列表
const properties = computed(() => {
  if (!props.schema?.properties) return [];
  return Object.entries(props.schema.properties).map(([key, prop]) => ({
    key,
    ...prop,
  }));
});

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
const getWidgetType = (prop: SchemaProperty): string => {
  if (prop.widget) return prop.widget;
  if (prop.enum) return 'select';
  if (prop.type === 'boolean') return 'switch';
  if (prop.type === 'integer' || prop.type === 'number') return 'number';
  return 'text';
};
</script>

<template>
  <Form v-if="schema" layout="vertical" size="small">
    <Form.Item
      v-for="prop in properties"
      :key="prop.key"
      :label="prop.title || prop.key"
      :tooltip="prop.description"
    >
      <Slider
        v-if="getWidgetType(prop) === 'slider'"
        :value="(modelValue[prop.key] as number) ?? prop.default ?? 0"
        :min="prop.minimum ?? 0"
        :max="prop.maximum ?? 100"
        @change="(val) => updateField(prop.key, val)"
      />

      <!-- Select (enum) -->
      <Select
        v-else-if="getWidgetType(prop) === 'select'"
        :value="(modelValue[prop.key] as string) ?? prop.default"
        class="w-full"
        @change="(val) => updateField(prop.key, val)"
      >
        <Select.Option v-for="opt in prop.enum" :key="opt" :value="opt">
          {{ opt }}
        </Select.Option>
      </Select>

      <!-- Switch (boolean) -->
      <Switch
        v-else-if="getWidgetType(prop) === 'switch'"
        :checked="(modelValue[prop.key] as boolean) ?? prop.default ?? false"
        @change="(checked) => updateField(prop.key, checked)"
      />

      <!-- InputNumber -->
      <InputNumber
        v-else-if="getWidgetType(prop) === 'number'"
        :value="(modelValue[prop.key] as number) ?? prop.default"
        :min="prop.minimum"
        :max="prop.maximum"
        class="w-full"
        @change="(val) => updateField(prop.key, val)"
      />

      <!-- Text Input (default) -->
      <Input
        v-else
        :value="(modelValue[prop.key] as string) ?? prop.default ?? ''"
        @change="(e: Event) => updateField(prop.key, (e.target as HTMLInputElement).value)"
      />
    </Form.Item>
  </Form>
  <div v-else class="empty-schema">
    <p>暂无可配置参数</p>
  </div>
</template>

<style scoped>
.empty-schema {
  padding: 24px;
  color: var(--text-color-secondary);
  text-align: center;
}

.w-full {
  width: 100%;
}
</style>
