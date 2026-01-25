<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type {
  AnalysisTool,
  CloudToolCreateParams,
  CloudToolUpdateParams,
} from '#/api';

import { computed, ref } from 'vue';

import { Page, useVbenModal, VbenButton } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createCloudToolApi,
  deleteCloudToolApi,
  getCloudToolListApi,
  updateCloudToolApi,
} from '#/api';
import {
  formSchema,
  querySchema,
  useColumns,
} from '#/views/system/cloud-tool/data';

import IconUploader from './components/IconUploader.vue';
import ToolConfigDrawer from './components/ToolConfigDrawer.vue';

const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: $t('common.form.query'),
  },
  schema: querySchema,
};

const gridOptions: VxeTableGridOptions<AnalysisTool> = {
  rowConfig: {
    keyField: 'id',
  },
  checkboxConfig: {
    highlight: true,
  },
  height: 'auto',
  exportConfig: {},
  printConfig: {},
  toolbarConfig: {
    export: true,
    print: true,
    refresh: true,
    refreshOptions: {
      code: 'query',
    },
    custom: true,
    zoom: true,
  },
  columns: useColumns(onActionClick),
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await getCloudToolListApi({
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

function onActionClick({ code, row }: OnActionClickParams<AnalysisTool>) {
  switch (code) {
    case 'config': {
      configTool.value = row;
      configDrawerOpen.value = true;
      break;
    }
    case 'delete': {
      deleteCloudToolApi(row.id).then(() => {
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [row.title]),
          key: 'action_process_msg',
        });
        onRefresh();
      });
      break;
    }
    case 'edit': {
      editId.value = row.id;
      iconValue.value = row.icon || '';
      modalApi.setData(row).open();
      break;
    }
  }
}

// 配置抽屉状态
const configDrawerOpen = ref(false);
const configTool = ref<AnalysisTool | null>(null);

// 图标上传值（独立管理）
const iconValue = ref('');

const [Form, formApi] = useVbenForm({
  showDefaultActions: false,
  schema: formSchema,
});

const editId = ref<null | number>(null);

const modalTitle = computed(() => {
  return editId.value
    ? $t('ui.actionTitle.edit', ['工具'])
    : $t('ui.actionTitle.create', ['工具']);
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-5/12',
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (valid) {
      modalApi.lock();
      try {
        const formData = await formApi.getValues<
          CloudToolCreateParams | CloudToolUpdateParams
        >();
        // 合并图标值
        const dataWithIcon = { ...formData, icon: iconValue.value || null };

        await (editId.value
          ? updateCloudToolApi(
              editId.value,
              dataWithIcon as CloudToolUpdateParams,
            )
          : createCloudToolApi(dataWithIcon as CloudToolCreateParams));
        message.success($t('ui.actionMessage.operationSuccess'));
        await modalApi.close();
        onRefresh();
      } finally {
        modalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<AnalysisTool>();
      formApi.resetForm();
      if (data) {
        editId.value = data.id;
        iconValue.value = data.icon || '';
        formApi.setValues(data);
      } else {
        editId.value = null;
        iconValue.value = '';
      }
    }
  },
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-actions>
        <VbenButton @click="() => modalApi.setData(null).open()">
          <MaterialSymbolsAdd class="size-5" />
          新增工具
        </VbenButton>
      </template>
    </Grid>
    <Modal :title="modalTitle">
      <Form />
      <!-- 工具图标区域 - 与表单风格统一 -->
      <div class="icon-section">
        <div class="icon-section-header">
          <span class="icon-section-label">工具图标</span>
          <span class="icon-section-optional">(可选)</span>
        </div>
        <IconUploader v-model:value="iconValue" />
      </div>
    </Modal>
    <ToolConfigDrawer
      v-model:open="configDrawerOpen"
      :tool="configTool"
      @saved="onRefresh"
    />
  </Page>
</template>

<style scoped>
.icon-section {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px dashed #e5e7eb;
}

.dark .icon-section {
  border-top-color: #374151;
}

.icon-section-header {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 12px;
}

.icon-section-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.dark .icon-section-label {
  color: #f3f4f6;
}

.icon-section-optional {
  font-size: 12px;
  color: #9ca3af;
}
</style>
