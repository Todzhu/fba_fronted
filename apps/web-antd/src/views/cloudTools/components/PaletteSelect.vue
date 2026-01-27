<script lang="ts" setup>
/**
 * PaletteSelect - 调色板可视化选择器
 *
 * 为 ROE 等热图分析工具提供可视化的调色板选择
 * 显示渐变色条预览，用户可直观选择配色方案
 */
import { computed } from 'vue';

import { Select } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options?: string[]; // 从 enum 传入的选项列表
  }>(),
  {
    modelValue: 'pal2',
    options: () => ['pal1', 'pal2', 'pal3', 'pal4', 'pal5'],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// 预定义调色板配置
const paletteConfigs: Record<string, { colors: string[]; label: string }> = {
  pal1: {
    label: '橙色渐变',
    colors: ['#ffffff', '#fde6ce', '#fcc08b', '#f5904a', '#e6540d'],
  },
  pal2: {
    label: '红色渐变',
    colors: ['#ffffff', '#fee5d9', '#fcbba1', '#fc9272', '#de2d26'],
  },
  pal3: {
    label: '黄橙渐变',
    colors: ['#ffffff', '#fff7bc', '#fee391', '#fec44f', '#d95f0e'],
  },
  pal4: {
    label: '亮红渐变',
    colors: ['#ffffff', '#ffddd8', '#ffb3a3', '#ff7f7f', '#e41a1c'],
  },
  pal5: {
    label: '粉色渐变',
    colors: ['#ffffff', '#fde0dd', '#fa9fb5', '#f768a1', '#c51b8a'],
  },
};

// 根据传入的选项过滤可用的调色板
const availablePalettes = computed(() => {
  return props.options
    .filter((key) => paletteConfigs[key])
    .map((key) => ({
      value: key,
      ...paletteConfigs[key],
    }));
});

const handleChange = (value: string) => {
  emit('update:modelValue', value);
};

// 生成渐变 CSS
const getGradientStyle = (colors: string[]) => {
  return {
    background: `linear-gradient(to right, ${colors.join(', ')})`,
  };
};
</script>

<template>
  <Select
    :value="modelValue"
    class="palette-select"
    :dropdown-match-select-width="false"
    @change="handleChange"
  >
    <Select.Option
      v-for="palette in availablePalettes"
      :key="palette.value"
      :value="palette.value"
    >
      <div class="palette-option">
        <div
          class="palette-preview"
          :style="getGradientStyle(palette.colors)"
        ></div>
        <span class="palette-label">{{ palette.label }}</span>
      </div>
    </Select.Option>
  </Select>
</template>

<style scoped>
.palette-select {
  min-width: 180px;
}

/* 下拉选项样式 */
.palette-option {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 4px 0;
}

.palette-preview {
  width: 80px;
  height: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.palette-label {
  font-size: 13px;
  color: #334155;
}

/* 已选中项的预览（显示在下拉框右侧） */
.selected-preview {
  width: 40px;
  height: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
}

/* 下拉选项悬停效果 */
:deep(.ant-select-item-option:hover) .palette-preview {
  border-color: #3b82f6;
}

:deep(.ant-select-item-option-selected) .palette-preview {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgb(59 130 246 / 20%);
}
</style>
