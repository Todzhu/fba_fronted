<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import Spreadsheet from 'x-data-spreadsheet';

// Import CSS
import 'x-data-spreadsheet/dist/locale/zh-cn';

// eslint-disable-next-line import/no-unresolved
import 'x-data-spreadsheet/dist/xspreadsheet.css';

const props = defineProps<{
  data: string[][];
  height?: string | number;
}>();

const spreadsheetContainer = ref<HTMLElement | null>(null);
let spreadsheetInstance: any = null;

// Convert 2D array to x-spreadsheet data format
const transformData = (matrix: string[][]) => {
  const rows: Record<string, any> = {};
  
  matrix.forEach((row, rIdx) => {
    const cells: Record<string, any> = {};
    row.forEach((cell, cIdx) => {
      cells[cIdx] = { text: cell };
    });
    rows[rIdx] = { cells };
  });

  return [{
    name: 'Preview',
    rows,
    styles: [],
    merges: [],
  }];
};

const renderSheet = () => {
  if (!spreadsheetContainer.value) return;

  // Cleanup existing
  if (spreadsheetInstance) {
    spreadsheetContainer.value.innerHTML = '';
  }

  const options = {
    showToolbar: false,
    showGrid: true,
    view: {
      height: () => (typeof props.height === 'number' ? props.height : 200),
      width: () => spreadsheetContainer.value?.clientWidth || 600,
    },
    row: {
      len: props.data.length + 5,
      height: 25,
    },
    col: {
      len: props.data[0]?.length ? props.data[0].length + 2 : 10,
      width: 100,
      indexWidth: 60,
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
        name: 'Helvetica',
        size: 10,
        bold: false,
        italic: false,
      },
    },
  };

  spreadsheetInstance = new Spreadsheet(spreadsheetContainer.value, options as any)
    .loadData(transformData(props.data)) // load data
    .change((data) => {
      // check data validation
    });

  // Force resize to fit container
  setTimeout(() => {
    spreadsheetInstance.reRender();
  }, 100);
};

// Override default locale to CN
// Spreadsheet.locale('zh-cn'); // If supported by the version

onMounted(() => {
  renderSheet();
});

watch(
  () => props.data,
  () => {
    renderSheet(); // Re-render when data changes
  },
  { deep: true },
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
  overflow: hidden;
  border-radius: 6px;
}

.spreadsheet-container {
  width: 100%;
  height: 100%;
}

/* Override x-spreadsheet global styles scope if needed */
:deep(.x-spreadsheet-toolbar) {
  display: none !important; /* Double ensure toolbar is hidden */
}

:deep(.x-spreadsheet-sheet) {
  background: #fff;
}
</style>
