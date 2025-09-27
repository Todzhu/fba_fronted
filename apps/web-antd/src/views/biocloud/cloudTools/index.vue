<template>
  <Page auto-content-height>
    <!-- 集成表格组件 -->
    <Grid table-title="分析工具管理">
      <template #toolbar-tools>
        <VbenButton type="primary" @click="handleAdd">
          <template #icon>
            <MaterialSymbolsAdd />
          </template>
          新增工具
        </VbenButton>
      </template>
    </Grid>

    <!-- 新增弹窗 -->
    <component :is="addModal" title="新增工具" :width="600">
      <AddForm />
    </component>

    <!-- 编辑弹窗 -->
    <component :is="editModal" title="编辑工具" :width="600">
      <EditForm />
    </component>
  </Page>
</template>

<script setup lang="ts">
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AnalysisTool, AnalysisToolManageQuery, AnalysisToolCreateRequest, AnalysisToolUpdateRequest } from '#/api/analysisTool';

import { ref, onMounted, computed, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import { VbenButton, useVbenModal, Page } from '@vben/common-ui';
import { MaterialSymbolsAdd } from '@vben/icons';
import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import type { VbenFormProps } from '@vben/common-ui';
import {
  fetchAnalysisToolManageList,
  fetchAnalysisToolDetail,
  createAnalysisTool,
  updateAnalysisTool,
  deleteAnalysisTool,
  fetchAnalysisToolCategories,
  fetchAnalysisToolFuncTypes,
} from '#/api/analysisTool';
import { useQuerySchema, useColumns, useAddSchema, useEditSchema } from './data';

// 当前编辑的工具ID
const editToolId = ref(0);

// 分类和类型选项
const categoryOptions = ref<string[]>([]);
const typeOptions = ref<string[]>([]);

// 表单配置
const formOptions: VbenFormProps = {
  collapsed: true,
  showCollapseButton: true,
  submitButtonOptions: {
    content: '搜索',
  },
  schema: computed(() => useQuerySchema(categoryOptions.value, typeOptions.value)),
};

// 表单组件
const [AddForm, addFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: computed(() => useAddSchema(categoryOptions.value, typeOptions.value)),
});

const [EditForm, editFormApi] = useVbenForm({
  showDefaultActions: false,
  schema: computed(() => useEditSchema(categoryOptions.value, typeOptions.value)),
});

// 弹窗组件
const [addModal, addModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await addFormApi.validate();
    if (valid) {
      addModalApi.lock();
      try {
        const data = await addFormApi.getValues<AnalysisToolCreateRequest>();
        await createAnalysisTool(data);
        message.success('新增成功');
        await addModalApi.close();
        onRefresh();
      } catch (error) {
        message.error('新增失败');
        console.error(error);
      } finally {
        addModalApi.unlock();
      }
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      addFormApi.resetForm();
    }
  },
});

const [editModal, editModalApi] = useVbenModal({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await editFormApi.validate();
    if (valid) {
      editModalApi.lock();
      try {
        const data = await editFormApi.getValues<AnalysisToolUpdateRequest>();
        await updateAnalysisTool(editToolId.value, data);
        message.success('更新成功');
        await editModalApi.close();
        onRefresh();
      } catch (error) {
        message.error('更新失败');
        console.error(error);
      } finally {
        editModalApi.unlock();
      }
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await nextTick();
      const data = editModalApi.getData<AnalysisTool>();
      if (data) {
        await editFormApi.resetForm();
        await editFormApi.setValues(data);
      }
    }
  },
});

// 表格配置
const gridOptions: VxeTableGridOptions = {
  id: 'AnalysisToolManage',
  height: 600,
  showOverflow: true,
  keepSource: true,
  columns: useColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  }),
  toolbarConfig: {
    refresh: { code: 'query' },
    custom: true,
    zoom: true,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await fetchAnalysisToolManageList({
          page: page.currentPage,
          size: page.pageSize,
          ...formValues,
        });
      },
    },
  },
  pagerConfig: {
    enabled: true,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
  },
};

// 创建集成组件
const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

// 事件处理函数
function onRefresh() {
  gridApi.reload();
}

function handleAdd() {
  addModalApi.open();
}

async function handleEdit(row: AnalysisTool) {
  try {
    const data = await fetchAnalysisToolDetail(row.id);
    editToolId.value = row.id;
    editModalApi.setData(data).open();
  } catch (error) {
    console.error('获取工具详情失败:', error);
    message.error('获取工具详情失败');
  }
}

async function handleDelete(row: AnalysisTool) {
  try {
    await deleteAnalysisTool(row.id);
    message.success('删除成功');
    onRefresh();
  } catch (error) {
    message.error('删除失败');
  }
}

// 初始化数据
async function fetchOptions() {
  try {
    const [categoriesRes, typesRes] = await Promise.all([
      fetchAnalysisToolCategories(),
      fetchAnalysisToolFuncTypes(),
    ]);
    
    categoryOptions.value = categoriesRes;
    typeOptions.value = typesRes;
  } catch (error) {
    console.error('获取选项失败:', error);
  }
}

onMounted(() => {
  fetchOptions();
});
</script>

<style scoped>
.analysis-tool-manage {
  padding: 16px;
}

.search-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.analysis-tool-grid {
  margin-top: 16px;
}
</style>