<script setup lang="ts">
/**
 * x-data-spreadsheet Vue 封装组件
 * 提供可编辑的电子表格功能
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import Spreadsheet from 'x-data-spreadsheet';

import 'x-data-spreadsheet/dist/xspreadsheet.css';

const props = defineProps<{
  data: any[][];
  height?: string;
}>();
const emit = defineEmits<{
  (e: 'update:data', data: any[][]): void;
  (e: 'change', data: any[][]): void;
}>();
// 设置中文
Spreadsheet.locale('zh-cn', {
  toolbar: {
    undo: '撤销',
    redo: '重做',
    print: '打印',
    paintformat: '格式刷',
    clearformat: '清除格式',
    format: '格式',
    fontName: '字体',
    fontSize: '字号',
    fontBold: '加粗',
    fontItalic: '斜体',
    underline: '下划线',
    strike: '删除线',
    color: '字体颜色',
    bgcolor: '背景颜色',
    border: '边框',
    merge: '合并单元格',
    align: '对齐',
    valign: '垂直对齐',
    textwrap: '自动换行',
    freeze: '冻结',
    autofilter: '自动筛选',
    formula: '公式',
    more: '更多',
  },
  contextmenu: {
    copy: '复制',
    cut: '剪切',
    paste: '粘贴',
    insertRow: '插入行',
    insertColumn: '插入列',
    deleteRow: '删除行',
    deleteColumn: '删除列',
    deleteCell: '删除单元格',
    deleteCellText: '删除单元格内容',
  },
  format: {
    normal: '常规',
    text: '文本',
    number: '数字',
    percent: '百分比',
    rmb: '人民币',
    usd: '美元',
    eur: '欧元',
    date: '日期',
    time: '时间',
    datetime: '日期时间',
    duration: '时长',
  },
});
Spreadsheet.locale('zh-cn');

const containerRef = ref<HTMLElement | null>(null);
let spreadsheet: any = null;
// 防止内部更新触发 watch 导致编辑器失去焦点
let isInternalUpdate = false;

// 将二维数组转换为 x-data-spreadsheet 格式
function arrayToSpreadsheetData(arr: any[][]): any {
  if (!arr || arr.length === 0) {
    return { name: 'Sheet1', rows: {} };
  }

  const rows: any = {};
  arr.forEach((row, rowIdx) => {
    const cells: any = {};
    row.forEach((cell: any, cellIdx: number) => {
      cells[cellIdx] = { text: String(cell ?? '') };
    });
    rows[rowIdx] = { cells };
  });

  return { name: 'Sheet1', rows };
}

// 从 x-data-spreadsheet 格式转换回二维数组
function spreadsheetDataToArray(sheetData: any): any[][] {
  const result: any[][] = [];
  const rows = sheetData.rows || {};

  // 找出最大行数和列数
  let maxRow = 0;
  let maxCol = 0;

  Object.keys(rows).forEach((rowKey) => {
    const rowIdx = Number.parseInt(rowKey, 10);
    if (!Number.isNaN(rowIdx)) {
      maxRow = Math.max(maxRow, rowIdx);
      const cells = rows[rowKey].cells || {};
      Object.keys(cells).forEach((colKey) => {
        const colIdx = Number.parseInt(colKey, 10);
        if (!Number.isNaN(colIdx)) {
          maxCol = Math.max(maxCol, colIdx);
        }
      });
    }
  });

  // 构建二维数组
  for (let r = 0; r <= maxRow; r++) {
    const row: any[] = [];
    const cells = rows[r]?.cells || {};
    for (let c = 0; c <= maxCol; c++) {
      row.push(cells[c]?.text ?? '');
    }
    result.push(row);
  }

  return result;
}

function initSpreadsheet() {
  if (!containerRef.value) return;

  // 清理旧实例
  if (spreadsheet) {
    containerRef.value.innerHTML = '';
    spreadsheet = null;
  }

  const sheetData = arrayToSpreadsheetData(props.data);

  spreadsheet = new Spreadsheet(containerRef.value, {
    mode: 'edit', // 编辑模式
    showToolbar: false, // 不显示工具栏
    showGrid: true,
    showContextmenu: true,
    view: {
      height: () => containerRef.value?.clientHeight || 400,
      width: () => containerRef.value?.clientWidth || 600,
    },
    row: {
      len: Math.max(100, (props.data?.length || 0) + 50),
      height: 25,
    },
    col: {
      len: Math.max(26, (props.data?.[0]?.length || 0) + 10),
      width: 100,
      indexWidth: 50,
      minWidth: 60,
    },
    style: {
      bgcolor: '#ffffff',
      align: 'left',
      valign: 'middle',
      textwrap: false,
      strike: false,
      underline: false,
      color: '#0a0a0a',
      font: {
        name: 'Arial',
        size: 10,
        bold: false,
        italic: false,
      },
    },
  });

  spreadsheet.loadData([sheetData]);

  // 监听变化
  spreadsheet.on('cell-edited', () => {
    const data = spreadsheet.getData();
    if (data && data[0]) {
      const arr = spreadsheetDataToArray(data[0]);
      // 标记为内部更新，防止 watch 重新加载数据
      isInternalUpdate = true;
      emit('update:data', arr);
      emit('change', arr);
      // 延迟重置标志，确保 watch 已处理完
      setTimeout(() => {
        isInternalUpdate = false;
      }, 100);
    }
  });
}

// 监听数据变化（仅响应外部数据变化）
watch(
  () => props.data,
  (newData) => {
    // 如果是内部更新触发的，跳过重新加载
    if (isInternalUpdate) return;

    if (spreadsheet && newData) {
      const sheetData = arrayToSpreadsheetData(newData);
      spreadsheet.loadData([sheetData]);
    }
  },
  { deep: true },
);

onMounted(() => {
  nextTick(() => {
    initSpreadsheet();
  });
});

onBeforeUnmount(() => {
  if (spreadsheet) {
    spreadsheet = null;
  }
});

// 暴露方法供外部调用
defineExpose({
  getData: () => {
    if (spreadsheet) {
      const data = spreadsheet.getData();
      return data && data[0] ? spreadsheetDataToArray(data[0]) : [];
    }
    return [];
  },
  loadData: (arr: any[][]) => {
    if (spreadsheet) {
      const sheetData = arrayToSpreadsheetData(arr);
      spreadsheet.loadData([sheetData]);
    }
  },
});
</script>

<template>
  <div
    ref="containerRef"
    class="x-spreadsheet-container"
    :style="{ height: height || '100%', width: '100%' }"
  ></div>
</template>

<style>
.x-spreadsheet-container {
  min-height: 200px;
}

/* 覆盖 x-data-spreadsheet 默认样式 */
.x-spreadsheet {
  font-family: Arial, sans-serif !important;
}

.x-spreadsheet-sheet {
  background: #fff;
}
</style>
