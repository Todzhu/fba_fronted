<script lang="ts" setup>
import { inject } from 'vue';

const props = defineProps<{
  width?: number; // make optional
  minWidth?: number;
  maxWidth?: number;
  column?: any; // make optional
}>();

// Inject the resize handler from parent Table
const tableHandleResize = inject('tableHandleResize') as (column: any, width: number) => void;

const onMouseDown = (e: MouseEvent) => {
  const startX = e.pageX;
  const startWidth = props.column?.width || props.width || 100;

  const onMouseMove = (e: MouseEvent) => {
    const offset = e.pageX - startX;
    const newWidth = Math.max(props.minWidth || 50, startWidth + offset);
    if (tableHandleResize && props.column) {
        tableHandleResize(props.column, newWidth);
    }
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};
</script>

<template>
  <th class="resizable-header-cell" :style="{ width: (column?.width || width) + 'px' }">
    <div class="content-wrapper">
       <slot />
    </div>
    <div 
        v-if="column && column.resizable"
        class="resize-handle" 
        @mousedown.stop.prevent="onMouseDown" 
        @click.stop.prevent
    ></div>
  </th>
</template>

<style scoped>
.resizable-header-cell {
  position: relative !important;
  /* 保持默认的 display: table-cell 以维持表格结构 */
  padding: 0; /* 可以选择重置padding，在wrapper中设置 */
}

.content-wrapper {
  padding: 16px; /* Ant Design 默认 padding */
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: 10;
  /* 增加可点击区域，并添加右边框作为视觉引导 */
  border-right: 2px solid transparent; 
  transition: border-color 0.3s;
}

.resize-handle:hover {
  border-right-color: #1890ff; /* 悬停时显示蓝色分割线 */
}
</style>
