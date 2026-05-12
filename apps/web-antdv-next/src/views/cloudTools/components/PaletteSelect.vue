<script lang="ts" setup>
/**
 * PaletteSelect - 调色板可视化选择器
 *
 * 为 ROE 等热图分析工具提供可视化的调色板选择
 * 显示渐变色条预览，用户可直观选择配色方案
 */
import { computed, ref } from 'vue';

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

const normalizedOptions = computed(() => {
  const rawOptions = props.options as string[] | string | undefined;
  const options = Array.isArray(rawOptions)
    ? rawOptions
    : typeof rawOptions === 'string'
      ? rawOptions.split(',')
      : [];

  return options.map((key) => key.trim()).filter(Boolean);
});

// 根据传入的选项过滤可用的调色板
const availablePalettes = computed(() => {
  return normalizedOptions.value
    .filter((key) => paletteConfigs[key])
    .map((key) => ({
      value: key,
      isGradient: isGradientPalette(key),
      ...paletteConfigs[key]!,
    }));
});

const selectedPalette = computed(() => {
  return (
    availablePalettes.value.find((palette) => palette.value === props.modelValue) ??
    availablePalettes.value[0]
  );
});

const open = ref(false);

const handleChange = (value: string) => {
  emit('update:modelValue', value);
  open.value = false;
};

// 生成渐变 CSS（用于热图配色）
const getGradientStyle = (colors: string[]) => {
  return {
    background: `linear-gradient(to right, ${colors.join(', ')})`,
  };
};
</script>

<template>
  <div
    class="palette-select-wrapper"
    tabindex="0"
    @blur="open = false"
  >
    <button
      type="button"
      class="palette-trigger"
      :title="selectedPalette?.label"
      @click="open = !open"
    >
      <span
        v-if="selectedPalette?.isGradient"
        class="selected-palette-preview"
        :style="getGradientStyle(selectedPalette.colors)"
      ></span>
      <span v-else class="selected-palette-preview palette-blocks">
        <span
          v-for="(color, index) in selectedPalette?.colors ?? []"
          :key="index"
          class="color-block"
          :style="{ backgroundColor: color }"
        ></span>
      </span>
      <span class="palette-arrow">⌄</span>
    </button>

    <div v-if="open" class="palette-menu">
      <button
        v-for="palette in availablePalettes"
        :key="palette.value"
        type="button"
        class="palette-option"
        :class="{ active: palette.value === modelValue }"
        :title="palette.label"
        @mousedown.prevent="handleChange(palette.value)"
      >
        <span
          v-if="palette.isGradient"
          class="palette-preview"
          :style="getGradientStyle(palette.colors)"
        ></span>
        <span v-else class="palette-preview palette-blocks">
          <span
            v-for="(color, index) in palette.colors"
            :key="index"
            class="color-block"
            :style="{ backgroundColor: color }"
          ></span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.palette-select-wrapper {
  position: relative;
  width: 112px;
}

.palette-trigger {
  display: flex;
  align-items: center;
  width: 112px;
  height: 32px;
  padding: 0 8px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.palette-trigger:hover,
.palette-select-wrapper:focus-within .palette-trigger {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(22 119 255 / 10%);
}

.palette-arrow {
  flex-shrink: 0;
  margin-left: 8px;
  color: #64748b;
  line-height: 1;
}

.palette-menu {
  position: absolute;
  z-index: 20;
  top: 36px;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 112px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow:
    0 10px 15px -3px rgb(15 23 42 / 10%),
    0 4px 6px -4px rgb(15 23 42 / 10%);
}

.selected-palette-preview {
  display: flex;
  flex: 1;
  height: 16px;
  overflow: hidden;
  border: 1px solid #d9e2ec;
  border-radius: 4px;
}

.palette-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 28px;
  padding: 4px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
}

.palette-option:hover,
.palette-option.active {
  background: #f1f5f9;
  border-color: #bfdbfe;
}

.palette-preview {
  display: flex;
  width: 100%;
  height: 18px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

/* 离散配色色块容器 */
.palette-blocks {
  display: flex;
  gap: 2px;
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
</style>
