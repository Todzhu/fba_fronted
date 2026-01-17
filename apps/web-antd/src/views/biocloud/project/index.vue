<script lang="ts" setup>
import type { VbenFormProps } from '@vben/common-ui';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ProjectInfoParams, ProjectInfoResult } from '#/api/project';

import { computed, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createProjectInfoApi,
  deleteProjectInfoApi,
  getProjectInfoListApi,
  updateProjectInfoApi,
} from '#/api/project';

import { getFormSchema, querySchema, useColumns } from './data';

defineOptions({
  name: 'ProjectInfo',
});

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  wrapperClass:
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  submitButtonOptions: {
    content: $t('common.query'),
  },
  schema: querySchema,
};

const gridOptions: VxeTableGridOptions<ProjectInfoResult> = {
  rowConfig: {
    keyField: 'id',
  },
  checkboxConfig: {
    highlight: true,
  },
  columnConfig: {
    resizable: true,
    useKey: true,
  },
  height: 'auto',
  toolbarConfig: {
    export: true,
    print: true,
    refresh: { code: 'query' },
    custom: true,
    zoom: true,
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await getProjectInfoListApi({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
};
const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

function onRefresh() {
  gridApi.query();
}

function handleAddProject() {
  modalApi.setData(null).open();
}

async function onActionClick({
  code,
  row,
}: OnActionClickParams<ProjectInfoResult>) {
  switch (code) {
    case 'delete': {
      try {
        await deleteProjectInfoApi([row.id]);
        message.success('删除成功');
        onRefresh();
      } catch {
        message.error('删除失败');
      }
      break;
    }
    case 'edit': {
      modalApi.setData(row).open();
      break;
    }
  }
}

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-4',
  schema: getFormSchema(false),
});

const formData = ref<ProjectInfoResult>();

const modalTitle = computed(() => {
  return formData.value?.id ? '编辑项目信息' : '新增项目信息';
});

const [modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  modalProps: {
    width: 1000,
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      const data = await formApi.getValues<ProjectInfoParams>();
      try {
        await (formData.value?.id
          ? updateProjectInfoApi(formData.value.id, data)
          : createProjectInfoApi(data));
        message.success('操作成功');
        await modalApi.close();
        onRefresh();
      } finally {
        modalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<ProjectInfoResult>();
      formApi.resetForm();
      if (data && data.id) {
        // 编辑模式
        formData.value = data;
        formApi.updateSchema(getFormSchema(true));
        formApi.setValues(formData.value);
      } else {
        // 新增模式
        formData.value = undefined;
        formApi.updateSchema(getFormSchema(false));
      }
    }
  },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="handleAddProject">
          <MaterialSymbolsAdd class="size-5" />
          新增项目
        </VbenButton>
      </template>
    </Grid>

    <modal :title="modalTitle" width="1000px">
      <Form />
    </modal>
  </Page>
</template>
