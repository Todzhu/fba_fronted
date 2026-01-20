<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import Spreadsheet from 'x-data-spreadsheet';
// @ts-ignore
import zhCN from 'x-data-spreadsheet/dist/locale/zh-cn';

// Import CSS - this path might need adjustment based on checking node_modules later
// but usually it's in dist
import 'x-data-spreadsheet/dist/xspreadsheet.css';

Spreadsheet.locale('zh-cn', zhCN);

const spreadsheetRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (spreadsheetRef.value) {
    const s = new Spreadsheet(spreadsheetRef.value, {
      view: {
        height: () => (spreadsheetRef.value ? spreadsheetRef.value.clientHeight : 700),
        width: () => (spreadsheetRef.value ? spreadsheetRef.value.clientWidth : 1000),
      },
    })
      .loadData({}) // load data
      .change((data) => {
        // save data to db
        console.log(data);
      });

    // Determine correctness of resize later
  }
});
</script>

<template>
  <Page title="Spreadsheet Demo">
    <div ref="spreadsheetRef" class="spreadsheet-container h-full w-full overflow-hidden"></div>
  </Page>
</template>

<style scoped>
.spreadsheet-container {
  /* Ensure it takes up space so the canvas can render */
  min-height: 600px;
}
</style>
