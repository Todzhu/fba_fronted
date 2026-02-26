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
  // 渐变色板（用于热图等）
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
  // ggsci 科学期刊配色（用于PCA、散点图等）
  npg: {
    label: 'NPG 自然',
    colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F'],
  },
  lancet: {
    label: 'Lancet 柳叶刀',
    colors: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F'],
  },
  aaas: {
    label: 'AAAS 科学',
    colors: ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280'],
  },
  nejm: {
    label: 'NEJM 医学',
    colors: ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1'],
  },
  jama: {
    label: 'JAMA 医学',
    colors: ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97'],
  },
  jco: {
    label: 'JCO 肿瘤',
    colors: ['#0073C2', '#EFC000', '#868686', '#CD534C', '#7AA6DC'],
  },
  ucscgb: {
    label: 'UCSC 基因组',
    colors: ['#FF0000', '#FF9900', '#FFCC00', '#00FF00', '#6699FF'],
  },
  d3: {
    label: 'D3 配色',
    colors: ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD'],
  },
};

// 判断是否为渐变配色（pal系列）
const isGradientPalette = (key: string): boolean => {
  return key.startsWith('pal');
};

// 根据传入的选项过滤可用的调色板
const availablePalettes = computed(() => {
  return props.options
    .filter((key) => paletteConfigs[key])
    .map((key) => ({
      value: key,
      isGradient: isGradientPalette(key),
      ...paletteConfigs[key],
    }));
});

const handleChange = (value: string) => {
  emit('update:modelValue', value);
};

// 生成渐变 CSS（用于热图配色）
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
        <!-- 渐变配色：显示渐变条 -->
        <div
          v-if="palette.isGradient"
          class="palette-preview"
          :style="getGradientStyle(palette.colors)"
        ></div>
        <!-- 离散配色：显示独立色块 -->
        <div v-else class="palette-blocks">
          <span
            v-for="(color, index) in palette.colors"
            :key="index"
            class="color-block"
            :style="{ backgroundColor: color }"
          ></span>
        </div>
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

/* 渐变配色预览条 */
.palette-preview {
  width: 80px;
  height: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

/* 离散配色色块容器 */
.palette-blocks {
  display: flex;
  gap: 2px;
  width: 80px;
  height: 20px;
}

/* 单个色块 */
.color-block {
  flex: 1;
  height: 100%;
  border-radius: 2px;
}

.color-block:first-child {
  border-radius: 4px 0 0 4px;
}

.color-block:last-child {
  border-radius: 0 4px 4px 0;
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
:deep(.ant-select-item-option:hover) .palette-preview,
:deep(.ant-select-item-option:hover) .palette-blocks {
  box-shadow: 0 0 0 2px rgb(59 130 246 / 20%);
}

:deep(.ant-select-item-option-selected) .palette-preview,
:deep(.ant-select-item-option-selected) .palette-blocks {
  box-shadow: 0 0 0 2px rgb(59 130 246 / 30%);
}
</style>
