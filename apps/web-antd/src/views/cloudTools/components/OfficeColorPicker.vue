<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Button, Popover } from 'ant-design-vue';

const props = defineProps<{
  defaultColor?: string;
  modelValue?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const visible = ref(false);
const nativeInput = ref<HTMLInputElement>();

const themeColors = [
  [
    '#000000',
    '#FFFFFF',
    '#44546A',
    '#4472C4',
    '#ED7D31',
    '#A5A5A5',
    '#FFC000',
    '#5B9BD5',
    '#70AD47',
  ],
  [
    '#F2F2F2',
    '#7F7F7F',
    '#D6DCE4',
    '#D9E1F2',
    '#FCE4D6',
    '#EDEDED',
    '#FFF2CC',
    '#DDEBF7',
    '#E2EFDA',
  ],
  [
    '#D9D9D9',
    '#595959',
    '#ACB9CA',
    '#B4C6E7',
    '#F8CBAD',
    '#DBDBDB',
    '#FFE699',
    '#BDD7EE',
    '#C6E0B4',
  ],
  [
    '#BFBFBF',
    '#3F3F3F',
    '#8497B0',
    '#8EA9DB',
    '#F4B084',
    '#C9C9C9',
    '#FFD966',
    '#9BC2E6',
    '#A9D08E',
  ],
  [
    '#A6A6A6',
    '#262626',
    '#333F50',
    '#305496',
    '#C65911',
    '#7B7B7B',
    '#BF9000',
    '#2F75B5',
    '#548235',
  ],
  [
    '#7F7F7F',
    '#0C0C0C',
    '#222B35',
    '#203764',
    '#833C0C',
    '#525252',
    '#806000',
    '#1F4E78',
    '#375623',
  ],
];

const standardColors = [
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
  '#002060',
  '#7030A0',
];

const handleSelect = (color: string) => {
  emit('update:modelValue', color);
  emit('change', color);
  visible.value = false;
};

const handleDefault = () => {
  if (props.defaultColor) {
    handleSelect(props.defaultColor);
  }
};

const currentColor = computed(
  () => props.modelValue || props.defaultColor || '#000000',
);
</script>

<template>
  <Popover
    v-model:open="visible"
    trigger="click"
    placement="bottomLeft"
    overlay-class-name="office-color-picker-popover"
  >
    <template #content>
      <div class="color-panel">
        <div class="top-actions">
          <div
            class="current-color-preview"
            :style="{ backgroundColor: currentColor }"
          ></div>
          <Button size="small" @click="handleDefault">默认颜色</Button>
        </div>

        <div class="section-title">主题颜色</div>
        <div class="color-grid">
          <div
            v-for="(_col, colIndex) in themeColors[0]"
            :key="colIndex"
            class="color-column"
          >
            <div
              v-for="(rowColor, rowIndex) in themeColors.map(
                (row) => row[colIndex]!,
              )"
              :key="rowIndex"
              class="color-cell"
              :style="{ backgroundColor: rowColor }"
              @click="handleSelect(rowColor)"
              :title="rowColor"
            ></div>
          </div>
        </div>

        <div class="section-title mt-2">标准颜色</div>
        <div class="standard-grid">
          <div
            v-for="color in standardColors"
            :key="color"
            class="color-cell"
            :style="{ backgroundColor: color }"
            @click="handleSelect(color)"
            :title="color"
          ></div>
        </div>

        <div class="more-colors" @click="nativeInput?.click()">
          更多颜色...
          <input
            ref="nativeInput"
            type="color"
            class="hidden-input"
            :value="currentColor"
            @input="(e) => handleSelect((e.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </template>

    <!-- Trigger -->
    <div class="color-trigger">
      <div
        class="color-circle"
        :style="{ backgroundColor: currentColor }"
      ></div>
    </div>
  </Popover>
</template>

<style scoped>
.color-panel {
  width: 240px;
  padding: 4px;
}

.top-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.current-color-preview {
  width: 60px;
  height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.section-title {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
}

.color-grid {
  display: flex;
  gap: 2px;
  justify-content: space-between;
}

.color-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.standard-grid {
  display: flex;
  gap: 2px;
  justify-content: space-between;
  margin-bottom: 8px;
}

.color-cell {
  width: 20px;
  height: 20px;
  cursor: pointer;
  border: 1px solid rgb(0 0 0 / 10%);
  transition: transform 0.1s;
}

.color-cell:hover {
  z-index: 1;
  border: 1px solid #fff;
  box-shadow: 0 0 4px rgb(0 0 0 / 30%);
  transform: scale(1.2);
}

.mt-2 {
  margin-top: 12px;
}

.more-colors {
  padding-top: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #1890ff;
  cursor: pointer;
  border-top: 1px solid #f0f0f0;
}

.hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

/* Trigger Styles */
.color-trigger {
  display: inline-flex;
  cursor: pointer;
}

.color-circle {
  width: 24px;
  height: 24px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #d9d9d9;
}
</style>
