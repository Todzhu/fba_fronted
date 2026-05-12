<script lang="ts" setup>
import type { VbenFormProps } from '@vben/common-ui';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ReportJobItem } from '#/api/reporting';

import { Page, VbenButton } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteReportJobApi, listReportJobsApi } from '#/api/reporting';
import { router } from '#/router';

import { querySchema, useColumns } from './data';

function ensureReportingRoutes() {
  if (!router.hasRoute('MockReportCreate')) {
    router.addRoute('Root', {
      name: 'MockReportCreate',
      path: 'mock-report/create',
      component: () => import('./create.vue'),
      meta: {
        title: '创建报告',
        hideInMenu: true,
      },
    });
  }
  if (!router.hasRoute('MockReportDetail')) {
    router.addRoute('Root', {
      name: 'MockReportDetail',
      path: 'mock-report/:id/view',
      component: () => import('./detail.vue'),
      meta: {
        title: '查看报告',
        hideInMenu: true,
      },
    });
  }
}

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  schema: querySchema,
};

function onActionClick({ code, row }: OnActionClickParams<ReportJobItem>) {
  switch (code) {
    case 'delete': {
      deleteReportJob(row.id);
      break;
    }
    case 'view': {
      ensureReportingRoutes();
      router.push(`/mock-report/${row.id}/view`);
      break;
    }
  }
}

const gridOptions: VxeTableGridOptions<ReportJobItem> = {
  rowConfig: {
    keyField: 'id',
  },
  height: 'auto',
  exportConfig: {},
  printConfig: {},
  toolbarConfig: {
    custom: true,
    export: true,
    print: true,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    zoom: true,
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await listReportJobsApi({
          page: page.currentPage,
          page_size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

function onRefresh() {
  gridApi.query();
}

async function deleteReportJob(id: number) {
  try {
    await deleteReportJobApi(id);
    message.success('删除成功');
    onRefresh();
  } catch (error) {
    console.error(error);
  }
}

function createReport() {
  ensureReportingRoutes();
  router.push('/mock-report/create');
}
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="createReport">
          <MaterialSymbolsAdd class="size-5" />
          创建报告
        </VbenButton>
      </template>
    </Grid>
  </Page>
</template>
