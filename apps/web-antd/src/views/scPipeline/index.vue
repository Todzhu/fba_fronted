<script lang="ts" setup>
/**
 * 单细胞分析流程列表页
 * 新建分析 / 历史分析列表
 */
import type { PipelineState } from './types/pipeline';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  TreeSelect,
  Typography,
} from 'ant-design-vue';

import { createPipeline, deletePipeline, listPipelines, updatePipeline } from './mock/mockApi';
import { getMyDataTree } from './mock/myDataMock';
import type { FileNode } from './mock/myDataMock';
import { STEP_LABELS } from './types/pipeline';

const router = useRouter();

// 状态
const loading = ref(false);
const pipelines = ref<PipelineState[]>([]);

// ========== 新建项目对话框 ==========
const createModalVisible = ref(false);
const createFormRef = ref();
const createLoading = ref(false);

// 表单数据
const createForm = reactive({
  name: '',
  dataPath: '',
  species: 'human',
  description: '',
});

// 物种选项
const speciesOptions = [
  { value: 'human', label: '人类 (Homo sapiens)' },
  { value: 'mouse', label: '小鼠 (Mus musculus)' },
  { value: 'rat', label: '大鼠 (Rattus norvegicus)' },
  { value: 'zebrafish', label: '斑马鱼 (Danio rerio)' },
  { value: 'drosophila', label: '果蝇 (Drosophila melanogaster)' },
  { value: 'other', label: '其他' },
];

// 表单校验规则
const createFormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度为 2-50 个字符', trigger: 'blur' },
  ],
  dataPath: [
    { required: true, message: '请输入样本数据位置', trigger: 'blur' },
  ],
  species: [
    { required: true, message: '请选择样本物种', trigger: 'change' },
  ],
};

// 打开新建对话框
const showCreateModal = async () => {
  // 重置表单
  Object.assign(createForm, {
    name: '',
    dataPath: '',
    species: 'human',
    description: '',
  });
  // 加载目录树
  await loadDataTree();
  createModalVisible.value = true;
};

// 目录树数据
const dataTreeData = ref<FileNode[]>([]);
const loadingTree = ref(false);

const loadDataTree = async () => {
  loadingTree.value = true;
  try {
    dataTreeData.value = await getMyDataTree();
  } finally {
    loadingTree.value = false;
  }
};

// 确认新建
const handleCreateConfirm = async () => {
  try {
    await createFormRef.value?.validate();
    createLoading.value = true;

    const { pipeline } = await createPipeline(createForm.name, {
      dataPath: createForm.dataPath,
      species: createForm.species,
      description: createForm.description,
    });

    message.success('项目创建成功');
    createModalVisible.value = false;
    router.push(`/analysis/sc-pipeline/${pipeline.id}`);
  } catch (error: any) {
    if (error?.errorFields) {
      // 表单验证失败，不做处理
      return;
    }
    message.error('创建失败');
  } finally {
    createLoading.value = false;
  }
};

// 取消新建
const handleCreateCancel = () => {
  createModalVisible.value = false;
};

// ========== 编辑项目对话框 ==========
const editModalVisible = ref(false);
const editFormRef = ref();
const editLoading = ref(false);
const editingPipeline = ref<PipelineState | null>(null);

// 编辑表单数据
const editForm = reactive({
  name: '',
  dataPath: '',
  species: 'human',
  description: '',
});

// 打开编辑对话框
const showEditModal = (pipeline: PipelineState) => {
  editingPipeline.value = pipeline;
  // 填充当前数据
  const metadata = (pipeline as any).metadata || {};
  Object.assign(editForm, {
    name: pipeline.name,
    dataPath: metadata.dataPath || '',
    species: metadata.species || 'human',
    description: metadata.description || '',
  });
  editModalVisible.value = true;
};

// 确认编辑
const handleEditConfirm = async () => {
  if (!editingPipeline.value) return;
  
  try {
    await editFormRef.value?.validate();
    editLoading.value = true;

    await updatePipeline(editingPipeline.value.id, editForm.name, {
      dataPath: editForm.dataPath,
      species: editForm.species,
      description: editForm.description,
    });

    message.success('项目信息已更新');
    editModalVisible.value = false;
    fetchPipelines(); // 刷新列表
  } catch (error: any) {
    if (error?.errorFields) {
      return;
    }
    message.error('更新失败');
  } finally {
    editLoading.value = false;
  }
};

// 取消编辑
const handleEditCancel = () => {
  editModalVisible.value = false;
  editingPipeline.value = null;
};

// 加载列表
const fetchPipelines = async () => {
  loading.value = true;
  try {
    pipelines.value = await listPipelines();
  } catch (error) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 打开分析
const handleOpen = (id: string) => {
  router.push(`/analysis/sc-pipeline/${id}`);
};

// 删除分析
const handleDelete = (pipeline: PipelineState) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除「${pipeline.name}」吗？此操作不可恢复。`,
    okType: 'danger',
    async onOk() {
      await deletePipeline(pipeline.id);
      message.success('已删除');
      fetchPipelines();
    },
  });
};

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 获取进度
const getProgress = (pipeline: PipelineState) => {
  const completed = pipeline.steps.filter((s) => s.status === 'completed').length;
  return `${completed}/${pipeline.steps.length}`;
};

// 获取当前步骤名称
const getCurrentStepLabel = (pipeline: PipelineState) => {
  const idx = Math.min(pipeline.currentStep, pipeline.steps.length - 1);
  const step = pipeline.steps[idx];
  return step ? STEP_LABELS[step.stepType] : '未知';
};

onMounted(fetchPipelines);
</script>

<template>
  <Page auto-content-height class="sc-pipeline-list">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <Icon icon="mdi:dna" class="title-icon" />
          单细胞分析
        </h1>
        <Typography.Text type="secondary">
          交互式单细胞 RNA-seq 数据分析流程
        </Typography.Text>
      </div>
      <Button type="primary" size="large" @click="showCreateModal">
        <Icon icon="mdi:plus" />
        新建分析
      </Button>
    </div>

    <Spin :spinning="loading">
      <!-- Empty State -->
      <Empty
        v-if="!loading && pipelines.length === 0"
        description="暂无分析记录，点击右上角新建分析"
        class="empty-state"
      >
        <template #image>
          <Icon icon="mdi:flask-empty-outline" class="empty-icon" />
        </template>
        <Button type="primary" @click="showCreateModal">
          <Icon icon="mdi:plus" />
          开始第一个分析
        </Button>
      </Empty>

      <!-- Pipeline Cards -->
      <div v-else class="pipeline-grid">
        <Card
          v-for="pipeline in pipelines"
          :key="pipeline.id"
          class="pipeline-card"
          hoverable
          @click="handleOpen(pipeline.id)"
        >
          <template #title>
            <div class="card-title">
              <Icon icon="mdi:chart-scatter-plot" class="card-icon" />
              <span>{{ pipeline.name }}</span>
            </div>
          </template>
          <template #extra>
            <Tag
              :color="pipeline.currentStep >= pipeline.steps.length ? 'success' : 'processing'"
            >
              {{ getProgress(pipeline) }}
            </Tag>
          </template>

          <div class="card-content">
            <!-- 项目描述 -->
            <div v-if="pipeline.description" class="description-row">
              {{ pipeline.description }}
            </div>

            <div class="info-grid">
              <div class="info-row">
                <span class="label">当前步骤:</span>
                <span class="value">{{ getCurrentStepLabel(pipeline) }}</span>
              </div>
              <div v-if="pipeline.species" class="info-row">
                <span class="label">物种:</span>
                <span class="value">{{ pipeline.species }}</span>
              </div>
              <div class="info-row">
                <span class="label">创建时间:</span>
                <span class="value">{{ formatDate(pipeline.createdAt) }}</span>
              </div>
              <div class="info-row">
                <span class="label">更新时间:</span>
                <span class="value">{{ formatDate(pipeline.updatedAt) }}</span>
              </div>
            </div>

            <!-- 数据路径 -->
            <div v-if="pipeline.dataPath" class="data-path">
              <Icon icon="mdi:folder-outline" />
              <span>{{ pipeline.dataPath }}</span>
            </div>
          </div>

          <template #actions>
            <Space>
              <Button type="link" @click.stop="handleOpen(pipeline.id)">
                <Icon icon="mdi:open-in-new" />
                打开
              </Button>
              <Button type="link" @click.stop="showEditModal(pipeline)">
                <Icon icon="mdi:pencil" />
                编辑
              </Button>
              <Button type="link" danger @click.stop="handleDelete(pipeline)">
                <Icon icon="mdi:delete" />
                删除
              </Button>
            </Space>
          </template>
        </Card>
      </div>
    </Spin>

    <!-- 新建项目对话框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建单细胞分析项目"
      :confirm-loading="createLoading"
      :width="520"
      @ok="handleCreateConfirm"
      @cancel="handleCreateCancel"
    >
      <Form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        layout="vertical"
        class="create-form"
      >
        <Form.Item label="项目名称" name="name">
          <Input
            v-model:value="createForm.name"
            placeholder="例如：PBMC 3K 单细胞分析"
            :maxlength="50"
            show-count
          />
        </Form.Item>

        <Form.Item label="样本数据位置" name="dataPath">
          <TreeSelect
            v-model:value="createForm.dataPath"
            :tree-data="dataTreeData"
            :loading="loadingTree"
            :field-names="{ children: 'children', label: 'title', value: 'path' }"
            placeholder="从“我的数据”选择数据文件夹"
            tree-default-expand-all
            show-search
            allow-clear
            :dropdown-style="{ maxHeight: '300px', overflow: 'auto' }"
          >
            <template #suffixIcon>
              <Icon icon="mdi:folder-outline" style="color: #999" />
            </template>
          </TreeSelect>
        </Form.Item>

        <Form.Item label="样本物种" name="species">
          <Select
            v-model:value="createForm.species"
            :options="speciesOptions"
            placeholder="选择样本物种"
          />
        </Form.Item>

        <Form.Item label="项目描述" name="description">
          <Input.TextArea
            v-model:value="createForm.description"
            placeholder="可选，简要描述项目目的或备注信息"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 编辑项目对话框 -->
    <Modal
      v-model:open="editModalVisible"
      title="编辑项目信息"
      :confirm-loading="editLoading"
      :width="520"
      @ok="handleEditConfirm"
      @cancel="handleEditCancel"
    >
      <Form
        ref="editFormRef"
        :model="editForm"
        :rules="createFormRules"
        layout="vertical"
        class="create-form"
      >
        <Form.Item label="项目名称" name="name">
          <Input
            v-model:value="editForm.name"
            placeholder="例如：PBMC 3K 单细胞分析"
            :maxlength="50"
            show-count
          />
        </Form.Item>

        <Form.Item label="样本数据位置" name="dataPath">
          <Input
            v-model:value="editForm.dataPath"
            placeholder="例如：/data/samples/pbmc_3k 或 s3://bucket/path"
          >
            <template #suffix>
              <Icon icon="mdi:folder-outline" style="color: #999" />
            </template>
          </Input>
        </Form.Item>

        <Form.Item label="样本物种" name="species">
          <Select
            v-model:value="editForm.species"
            :options="speciesOptions"
            placeholder="选择样本物种"
          />
        </Form.Item>

        <Form.Item label="项目描述" name="description">
          <Input.TextArea
            v-model:value="editForm.description"
            placeholder="可选，简要描述项目目的或备注信息"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
.sc-pipeline-list {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f0f5ff 100%);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.title-icon {
  font-size: 28px;
  color: #1890ff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.empty-icon {
  font-size: 80px;
  color: #bfbfbf;
}

.pipeline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.pipeline-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.pipeline-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-icon {
  font-size: 18px;
  color: #1890ff;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.description-row {
  font-size: 13px;
  color: #595959;
  line-height: 1.5;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.info-row .label {
  color: #8c8c8c;
}

.info-row .value {
  color: #262626;
  font-weight: 500;
}

.data-path {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8c8c8c;
  padding-top: 4px;
  border-top: 1px dashed #f0f0f0;
  margin-top: 4px;
}

.data-path span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.ant-card-actions) {
  background: #fafafa;
}

/* 新建表单样式 */
.create-form {
  padding-top: 8px;
}

.create-form :deep(.ant-form-item-label) {
  font-weight: 500;
}
</style>

