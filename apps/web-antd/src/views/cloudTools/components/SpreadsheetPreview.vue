<script lang="ts" setup>
/**
 * SpreadsheetPreview - 可编辑电子表格组件
 *
 * 基于 x-data-spreadsheet，支持：
 * - 工具栏显示/隐藏
 * - 编辑/只读模式
 * - 数据导入/导出
 */
import { onMounted, ref, watch } from 'vue';

import Spreadsheet from 'x-data-spreadsheet';

// Import CSS
import 'x-data-spreadsheet/dist/locale/zh-cn';

import 'x-data-spreadsheet/dist/xspreadsheet.css';

const props = withDefaults(
  defineProps<{
    data?: string[][];
    height?: number;
    readonly?: boolean;
    showToolbar?: boolean;
  }>(),
  {
    data: () => [],
    height: 400,
    showToolbar: false,
    readonly: false,
  },
);

const emit = defineEmits<{
  (e: 'change', data: string[][]): void;
}>();

const spreadsheetContainer = ref<HTMLElement | null>(null);
let spreadsheetInstance: any = null;

// 将 2D 数组转换为 x-spreadsheet 数据格式
const transformData = (matrix: string[][]) => {
  const rows: Record<string, any> = {};

  matrix.forEach((row, rIdx) => {
    const cells: Record<string, any> = {};
    row.forEach((cell, cIdx) => {
      cells[cIdx] = { text: cell };
    });
    rows[rIdx] = { cells };
  });

  return [
    {
      name: '数据表',
      rows,
      styles: [],
      merges: [],
    },
  ];
};

// 从 x-spreadsheet 数据格式提取 2D 数组
const extractData = (): string[][] => {
  if (!spreadsheetInstance) return [];

  const sheetData = spreadsheetInstance.getData();
  if (!sheetData || !sheetData[0]) return [];

  const sheet = sheetData[0];
  const result: string[][] = [];

  // 找出最大行列数
  let maxRow = 0;
  let maxCol = 0;

  if (sheet.rows) {
    Object.keys(sheet.rows).forEach((key) => {
      const rowIdx = Number.parseInt(key, 10);
      if (rowIdx > maxRow) maxRow = rowIdx;

      const row = sheet.rows[key];
      if (row.cells) {
        Object.keys(row.cells).forEach((cellKey) => {
          const colIdx = Number.parseInt(cellKey, 10);
          if (colIdx > maxCol) maxCol = colIdx;
        });
      }
    });
  }

  // 构建结果矩阵
  for (let r = 0; r <= maxRow; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const cellData = sheet.rows?.[r]?.cells?.[c];
      row.push(cellData?.text ?? '');
    }
    result.push(row);
  }

  return result;
};

const renderSheet = () => {
  if (!spreadsheetContainer.value) return;

  // 清除现有实例
  if (spreadsheetInstance) {
    spreadsheetContainer.value.innerHTML = '';
  }

  const options = {
    showToolbar: props.showToolbar,
    showGrid: true,
    showContextmenu: !props.readonly,
    view: {
      height: () =>
        props.height || spreadsheetContainer.value?.clientHeight || 400,
      width: () => spreadsheetContainer.value?.clientWidth || 600,
    },
    row: {
      len: Math.max(props.data.length + 10, 50),
      height: 25,
    },
    col: {
      len: Math.max(props.data[0]?.length || 0 + 5, 10),
      width: 100,
      indexWidth: 60,
      minWidth: 60,
    },
    style: {
      bgcolor: '#ffffff',
      align: 'left',
      valign: 'middle',
      textwrap: false,
      color: '#0a0a0a',
      font: {
        name: 'Arial',
        size: 10,
        bold: false,
        italic: false,
      },
    },
  };

  spreadsheetInstance = new Spreadsheet(
    spreadsheetContainer.value,
    options as any,
  )
    .loadData(transformData(props.data))
    .change(() => {
      // 数据变化时触发事件
      emit('change', extractData());
    });

  // 强制重新渲染以适应容器
  setTimeout(() => {
    spreadsheetInstance?.reRender();
  }, 100);
};

// ResizeObserver 以自动适应宽度
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  renderSheet();
  
  if (spreadsheetContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      // 触发 x-spreadsheet 重新读取 width()
      spreadsheetInstance?.reRender();
    });
    resizeObserver.observe(spreadsheetContainer.value);
  }
});

// 暴露方法给父组件
const getData = () => extractData();
const setData = (data: string[][]) => {
  if (spreadsheetInstance) {
    spreadsheetInstance.loadData(transformData(data));
  }
};
const clearData = () => {
  setData([]);
};

defineExpose({ getData, setData, clearData });

watch(
  () => props.data,
  () => {
    renderSheet(); // data 变化时完全重绘以确保一致性
  },
  { deep: true },
);

watch(
  () => props.showToolbar,
  () => {
    renderSheet();
  },
);
</script>

<template>
  <div class="spreadsheet-wrapper">
    <div ref="spreadsheetContainer" class="spreadsheet-container"></div>
  </div>
</template>

<style scoped>
.spreadsheet-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.spreadsheet-container {
  width: 100%;
  height: 100%;
}

/* x-spreadsheet 样式覆盖 */
:deep(.x-spreadsheet-toolbar) {
  width: 100% !important; /* 强制铺满 */
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  box-sizing: border-box;
}

:deep(.x-spreadsheet-sheet) {
  background: #fff;
}

:deep(.x-spreadsheet-bottombar) {
  display: none; /* 隐藏底部 sheet 切换栏 */
}

/* 强制容器宽度铺满，防止计算误差导致的留白 */
:deep(.x-spreadsheet) {
  width: 100% !important;
}
</style>
