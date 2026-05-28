<script lang="ts" setup>
/**
 * 单细胞分析流程列表页
 * 新建分析 / 历史分析列表
 */
import type { PipelineState } from './types/pipeline';

import { computed, onActivated, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Icon } from '@iconify/vue';
import {
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Progress,
  Select,
  Spin,
  Table,
  Tag,
  TextArea,
  Typography,
} from 'antdv-next';

import {
  createPipelineApi,
  deletePipelineApi,
  listPipelinesApi,
  listSourceProjectsApi,
  updatePipelineApi,
} from './api';
import type { SourceProject } from './api';
import { STEP_DEFINITIONS } from './mock/stepSchemas';
import { STEP_LABELS, STEP_ORDER } from './types/pipeline';

const router = useRouter();

// 状态
const loading = ref(false);
const pipelines = ref<PipelineState[]>([]);

const workflowSteps = computed(() => {
  return STEP_ORDER.map((stepType, index) => ({
    index: index + 1,
    label: STEP_LABELS[stepType],
    icon: STEP_DEFINITIONS[stepType]?.icon || 'mdi:cog-outline',
    description: STEP_DEFINITIONS[stepType]?.description || '',
  }));
});

const pipelineStats = computed(() => {
  const completed = pipelines.value.filter((pipeline) => {
    return pipeline.steps.length > 0 && pipeline.steps.every((step) => step.status === 'completed');
  }).length;
  const running = pipelines.value.filter((pipeline) => pipeline.status === 'running').length;
  return {
    total: pipelines.value.length,
    running,
    completed,
  };
});

type PipelineStatusView = { color: string; icon: string; text: string };

const statusMap: Record<string, PipelineStatusView> = {
  created: { color: 'default', icon: 'mdi:clock-outline', text: '待开始' },
  running: { color: 'processing', icon: 'mdi:progress-clock', text: '进行中' },
  completed: { color: 'success', icon: 'mdi:check-circle-outline', text: '已完成' },
  paused: { color: 'warning', icon: 'mdi:pause-circle-outline', text: '已暂停' },
  error: { color: 'error', icon: 'mdi:alert-circle-outline', text: '失败' },
  failed: { color: 'error', icon: 'mdi:alert-circle-outline', text: '失败' },
};
const defaultPipelineStatus = statusMap.created as PipelineStatusView;

const getPipelineStatusKey = (pipeline: any) => {
  if (pipeline.steps.some((step: any) => step.status === 'error')) {
    return 'error';
  }
  if (pipeline.steps.length > 0 && pipeline.steps.every((step: any) => step.status === 'completed')) {
    return 'completed';
  }
  return pipeline.status || 'created';
};

const getPipelineStatus = (pipeline: any) => {
  return statusMap[getPipelineStatusKey(pipeline)] || defaultPipelineStatus;
};

const getCompletedCount = (pipeline: any) => {
  return pipeline.steps.filter((step: any) => step.status === 'completed' || step.status === 'skipped').length;
};

const getProgressPercent = (pipeline: any) => {
  if (pipeline.steps.length === 0) return 0;
  return Math.round((getCompletedCount(pipeline) / pipeline.steps.length) * 100);
};

const getReportFile = (pipeline: any, type: 'html' | 'zip') => {
  const reportStep = pipeline.steps.find((step: any) => step.stepType === 'report');
  return reportStep?.result?.files?.find((file: any) => file.type === type);
};

const hasReport = (pipeline: any) => {
  return Boolean(getReportFile(pipeline, 'html') || getReportFile(pipeline, 'zip'));
};

const filterForm = reactive({
  keyword: '',
  status: undefined as string | undefined,
  stepType: undefined as string | undefined,
  species: undefined as string | undefined,
  report: undefined as string | undefined,
});

const statusFilterOptions = [
  { value: 'created', label: '待开始' },
  { value: 'running', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'paused', label: '已暂停' },
  { value: 'error', label: '失败' },
];

const reportFilterOptions = [
  { value: 'ready', label: '可下载' },
  { value: 'missing', label: '未生成' },
];

const stepFilterOptions = computed(() => {
  const stepTypes = new Set<string>();
  pipelines.value.forEach((pipeline: any) => {
    pipeline.steps.forEach((step: any) => stepTypes.add(step.stepType));
  });
  return Array.from(stepTypes)
    .filter(Boolean)
    .map((stepType) => ({
      value: stepType,
      label: STEP_LABELS[stepType as keyof typeof STEP_LABELS] || stepType,
    }));
});

const speciesFilterOptions = computed(() => {
  const species = new Set<string>();
  pipelines.value.forEach((pipeline: any) => {
    if (pipeline.species) species.add(String(pipeline.species));
  });
  return Array.from(species).map((item) => ({ value: item, label: item }));
});

const getPipelineCurrentStepType = (pipeline: any) => {
  const idx = Math.min(pipeline.currentStep, pipeline.steps.length - 1);
  return pipeline.steps[idx]?.stepType || '';
};

const filteredPipelines = computed(() => {
  const keyword = filterForm.keyword.trim().toLowerCase();
  return pipelines.value.filter((pipeline: any) => {
    if (keyword) {
      const searchable = [
        pipeline.name,
        pipeline.description,
        pipeline.id,
        pipeline.dataPath,
        pipeline.metadata?.project_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(keyword)) return false;
    }

    if (filterForm.status && getPipelineStatusKey(pipeline) !== filterForm.status) {
      return false;
    }

    if (filterForm.stepType && getPipelineCurrentStepType(pipeline) !== filterForm.stepType) {
      return false;
    }

    if (filterForm.species && pipeline.species !== filterForm.species) {
      return false;
    }

    if (filterForm.report) {
      const reportReady = hasReport(pipeline);
      if (filterForm.report === 'ready' && !reportReady) return false;
      if (filterForm.report === 'missing' && reportReady) return false;
    }

    return true;
  });
});

const hasActiveFilters = computed(() => {
  return Boolean(
    filterForm.keyword.trim() ||
      filterForm.status ||
      filterForm.stepType ||
      filterForm.species ||
      filterForm.report,
  );
});

const resetFilters = () => {
  Object.assign(filterForm, {
    keyword: '',
    status: undefined,
    stepType: undefined,
    species: undefined,
    report: undefined,
  });
};

const pipelineTableColumns = [
  { title: '项目名称', dataIndex: 'name', key: 'name', width: 240, fixed: 'left' },
  { title: '状态', key: 'status', width: 120 },
  { title: '当前步骤', key: 'currentStep', width: 140 },
  { title: '分析进度', key: 'progress', width: 180 },
  { title: '样本物种', dataIndex: 'species', key: 'species', width: 120 },
  { title: '最近更新时间', key: 'updatedAt', width: 180 },
  { title: '报告状态', key: 'report', width: 120 },
  { title: '操作', key: 'action', width: 230, fixed: 'right' },
] as any[];

const tablePagination = {
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 个项目`,
};

const tableScroll = { x: 1330 };
const getPipelineRowKey = (record: any) => String(record.id);

const detailModalVisible = ref(false);
const detailPipeline = ref<PipelineState | null>(null);

const showDetailModal = (pipeline: any) => {
  detailPipeline.value = pipeline;
  detailModalVisible.value = true;
};

const closeDetailModal = () => {
  detailModalVisible.value = false;
  detailPipeline.value = null;
};

const openPipelineWorkspace = (id: number | string) => {
  const pipelineId = String(id);
  router.push({
    name: 'ScPipelineDetail',
    params: { id: pipelineId },
    query: { pageKey: `sc-pipeline-${pipelineId}` },
  });
};

// ========== 新建项目对话框 ==========
const createModalVisible = ref(false);
const createFormRef = ref();
const createLoading = ref(false);

// 表单数据
const createForm = reactive({
  name: '',
  projectId: undefined as string | undefined,
  species: 'human',
  tissue: '10x',
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

const platformOptions = [
  { value: '10x', label: '10x' },
  { value: 'C4', label: 'C4' },
  { value: 'SeekSoul', label: 'SeekSoul' },
];

// 表单校验规则
const createFormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度为 2-50 个字符', trigger: 'blur' },
  ],
  projectId: [
    { required: true, message: '请选择项目编号', trigger: 'change' },
  ],
  species: [
    { required: true, message: '请选择样本物种', trigger: 'change' },
  ],
  tissue: [
    { required: true, message: '请选择平台类型', trigger: 'change' },
  ],
};

const sourceProjects = ref<SourceProject[]>([]);
const loadingSourceProjects = ref(false);
const sourceProjectOptions = computed(() => {
  return sourceProjects.value.map((project) => ({
    value: project.project_id,
    label: `${project.project_id} (${project.valid_sample_count}/${project.sample_count} 样本)`,
    disabled: !project.valid,
  }));
});
const selectedSourceProject = computed(() => {
  if (!createForm.projectId) return null;
  return sourceProjects.value.find((project) => project.project_id === createForm.projectId) || null;
});

const loadSourceProjects = async () => {
  loadingSourceProjects.value = true;
  try {
    sourceProjects.value = await listSourceProjectsApi();
  } finally {
    loadingSourceProjects.value = false;
  }
};

const handleProjectChange = (projectId?: string) => {
  const previousProjectId = createForm.projectId;
  if (projectId && (!createForm.name || createForm.name === previousProjectId)) {
    createForm.name = projectId;
  }
  createForm.projectId = projectId;
};

// 打开新建对话框
const showCreateModal = async () => {
  // 重置表单
  Object.assign(createForm, {
    name: '',
    projectId: undefined,
    species: 'human',
    tissue: '10x',
    description: '',
  });
  await loadSourceProjects();
  createModalVisible.value = true;
};

// 确认新建
const handleCreateConfirm = async () => {
  try {
    await createFormRef.value?.validate();
    createLoading.value = true;

    const res = await createPipelineApi({
      name: createForm.name,
      project_id: createForm.projectId,
      species: createForm.species,
      tissue: createForm.tissue,
      description: createForm.description,
    });

    message.success('项目创建成功');
    createModalVisible.value = false;
    await fetchPipelines();
    openPipelineWorkspace(res.id);
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

    await updatePipelineApi(editingPipeline.value.id, {
      name: editForm.name,
      data_path: editForm.dataPath,
      species: editForm.species,
      description: editForm.description,
    });

    message.success('项目信息已更新');
    editModalVisible.value = false;
    await fetchPipelines(); // 刷新列表
    if (detailPipeline.value?.id === editingPipeline.value.id) {
      detailPipeline.value = pipelines.value.find((pipeline) => pipeline.id === editingPipeline.value?.id) || null;
    }
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
    const list = await listPipelinesApi();
    // 转换后端数据格式
    pipelines.value = list.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      description: p.description,
      dataPath: p.data_path,
      species: p.species,
      metadata: p.metadata_json || {},
      currentStep: p.current_step,
      status: p.status,
      isMultiSample: p.is_multi_sample,
      steps: (p.steps || []).map((s: any) => ({
        stepType: s.step_type,
        status: s.status,
        params: s.params || {},
        result: s.result_data,
        history: [],
      })),
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));
  } catch (error) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 打开分析
const handleOpen = (id: string) => {
  openPipelineWorkspace(id);
};

// 删除分析
const handleDelete = (pipeline: PipelineState) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除「${pipeline.name}」吗？此操作不可恢复。`,
    okType: 'danger',
    async onOk() {
      await deletePipelineApi(pipeline.id);
      message.success('已删除');
      if (detailPipeline.value?.id === pipeline.id) {
        closeDetailModal();
      }
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
const getProgress = (pipeline: any) => {
  if (pipeline.steps.length === 0) return '0/0';
  return `${getCompletedCount(pipeline)}/${pipeline.steps.length}`;
};

// 获取当前步骤名称
const getCurrentStepLabel = (pipeline: any) => {
  const idx = Math.min(pipeline.currentStep, pipeline.steps.length - 1);
  const step = pipeline.steps[idx];
  return step ? STEP_LABELS[step.stepType as keyof typeof STEP_LABELS] || step.stepType : '未知';
};

onMounted(fetchPipelines);
onActivated(fetchPipelines);
</script>

<template>
  <Page auto-content-height class="sc-pipeline-list" content-class="sc-pipeline-page-content">
    <div class="page-shell">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <Icon icon="mdi:dna" class="title-icon" />
            单细胞分析
          </h1>
          <Typography.Text type="secondary">
            基于 10x CellRanger 数据的交互式 scRNA-seq 分析流程
          </Typography.Text>
        </div>
        <div class="summary-strip">
          <div class="summary-item">
            <span class="summary-value">{{ pipelineStats.total }}</span>
            <span class="summary-label">分析项目</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ pipelineStats.running }}</span>
            <span class="summary-label">进行中</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ pipelineStats.completed }}</span>
            <span class="summary-label">已完成</span>
          </div>
        </div>
        <Button type="primary" size="large" @click="showCreateModal">
          <Icon icon="mdi:plus" />
          新建分析
        </Button>
      </div>

      <div class="workbench-frame">
        <Spin :spinning="loading" wrapper-class-name="workbench-spin">
          <div v-if="!loading && pipelines.length === 0" class="first-run-panel">
            <div class="first-run-main">
              <div class="onboarding-icon">
                <Icon icon="mdi:dna" />
              </div>
              <div>
                <div class="first-run-title">创建第一个单细胞分析项目</div>
                <div class="first-run-desc">
                  点击右上角“新建分析”，从服务器项目编号选择 CellRanger 输出目录，补充物种和平台类型后进入交互式分析流程。
                </div>
              </div>
            </div>

            <div class="starter-grid">
              <div class="starter-card">
                <Icon icon="mdi:folder-table-outline" />
                <span>数据来源</span>
                <strong>10x CellRanger 项目目录</strong>
              </div>
              <div class="starter-card">
                <Icon icon="mdi:tune-variant" />
                <span>交互流程</span>
                <strong>逐步配置参数并运行</strong>
              </div>
              <div class="starter-card">
                <Icon icon="mdi:file-chart-outline" />
                <span>结果输出</span>
                <strong>进度、日志和报告下载</strong>
              </div>
            </div>

            <div class="empty-workflow">
              <div v-for="step in workflowSteps" :key="step.label" class="empty-workflow-step">
                <span>{{ step.index }}</span>
                {{ step.label }}
              </div>
            </div>
          </div>

          <section v-else class="project-table-panel">
            <div class="panel-header table-panel-header">
              <div>
                <div class="panel-title">分析项目</div>
                <div class="panel-subtitle">以表格查看所有项目，详情在弹窗中打开，流程在独立页签中继续</div>
              </div>
              <div class="project-filters">
                <Input
                  v-model:value="filterForm.keyword"
                  allow-clear
                  class="filter-keyword"
                  placeholder="搜索项目名称/编号"
                >
                  <template #prefix>
                    <Icon icon="mdi:magnify" />
                  </template>
                </Input>
                <Select
                  v-model:value="filterForm.status"
                  :options="statusFilterOptions"
                  allow-clear
                  class="filter-select"
                  popup-class-name="pipeline-filter-dropdown"
                  placeholder="状态"
                />
                <Select
                  v-model:value="filterForm.stepType"
                  :options="stepFilterOptions"
                  allow-clear
                  class="filter-select"
                  popup-class-name="pipeline-filter-dropdown"
                  placeholder="当前步骤"
                />
                <Select
                  v-model:value="filterForm.species"
                  :options="speciesFilterOptions"
                  allow-clear
                  class="filter-select"
                  popup-class-name="pipeline-filter-dropdown"
                  placeholder="物种"
                />
                <Select
                  v-model:value="filterForm.report"
                  :options="reportFilterOptions"
                  allow-clear
                  class="filter-select"
                  popup-class-name="pipeline-filter-dropdown"
                  placeholder="报告"
                />
                <Button :disabled="!hasActiveFilters" @click="resetFilters">
                  <Icon icon="mdi:filter-remove-outline" />
                  重置
                </Button>
              </div>
              <Button @click="fetchPipelines">
                <Icon icon="mdi:refresh" />
                刷新
              </Button>
            </div>

            <Table
              class="project-table"
              :columns="pipelineTableColumns"
              :data-source="filteredPipelines"
              :pagination="tablePagination"
              :row-key="getPipelineRowKey"
              :scroll="tableScroll"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  <button class="project-name-button" type="button" @click="showDetailModal(record)">
                    <span>{{ record.name }}</span>
                    <small>{{ record.description || '暂无项目描述' }}</small>
                  </button>
                </template>

                <template v-else-if="column.key === 'status'">
                  <Tag :color="getPipelineStatus(record).color">
                    <Icon :icon="getPipelineStatus(record).icon" />
                    {{ getPipelineStatus(record).text }}
                  </Tag>
                </template>

                <template v-else-if="column.key === 'currentStep'">
                  <span class="table-strong">{{ getCurrentStepLabel(record) }}</span>
                </template>

                <template v-else-if="column.key === 'progress'">
                  <div class="table-progress">
                    <Progress :percent="getProgressPercent(record)" :show-info="false" :stroke-width="6" />
                    <span>{{ getProgress(record) }}</span>
                  </div>
                </template>

                <template v-else-if="column.key === 'species'">
                  <span>{{ record.species || '-' }}</span>
                </template>

                <template v-else-if="column.key === 'updatedAt'">
                  <span class="table-muted">{{ formatDate(record.updatedAt) }}</span>
                </template>

                <template v-else-if="column.key === 'report'">
                  <Tag :color="hasReport(record) ? 'success' : 'default'">
                    {{ hasReport(record) ? '可下载' : '未生成' }}
                  </Tag>
                </template>

                <template v-else-if="column.key === 'action'">
                  <div class="table-actions">
                    <Button size="small" type="link" @click="showDetailModal(record)">详情</Button>
                    <Button size="small" type="link" @click="handleOpen(record.id)">
                      <Icon icon="mdi:open-in-new" />
                      <span>进入流程</span>
                    </Button>
                    <Button size="small" type="link" danger @click="handleDelete(record)">
                      <Icon icon="mdi:delete-outline" />
                      <span>删除</span>
                    </Button>
                  </div>
                </template>
              </template>
            </Table>
          </section>
        </Spin>
      </div>
    </div>

    <!-- 项目详情弹窗 -->
    <Modal
      v-model:open="detailModalVisible"
      :title="detailPipeline?.name || '项目详情'"
      :footer="null"
      :width="920"
      @cancel="closeDetailModal"
    >
      <div v-if="detailPipeline" class="project-detail-modal">
        <div class="detail-header">
          <div>
            <div class="detail-title">{{ detailPipeline.name }}</div>
            <div class="detail-subtitle">{{ detailPipeline.description || '暂无项目描述' }}</div>
          </div>
          <Tag :color="getPipelineStatus(detailPipeline).color">
            <Icon :icon="getPipelineStatus(detailPipeline).icon" />
            {{ getPipelineStatus(detailPipeline).text }}
          </Tag>
        </div>

        <div class="detail-progress">
          <div class="progress-top">
            <span>分析进度</span>
            <span>{{ getProgress(detailPipeline) }}</span>
          </div>
          <Progress :percent="getProgressPercent(detailPipeline)" :stroke-width="8" />
        </div>

        <div class="detail-grid">
          <div class="detail-cell">
            <span>当前步骤</span>
            <strong>{{ getCurrentStepLabel(detailPipeline) }}</strong>
          </div>
          <div class="detail-cell">
            <span>样本物种</span>
            <strong>{{ detailPipeline.species || '-' }}</strong>
          </div>
          <div class="detail-cell">
            <span>最近更新时间</span>
            <strong>{{ formatDate(detailPipeline.updatedAt) }}</strong>
          </div>
          <div class="detail-cell">
            <span>报告状态</span>
            <strong>{{ hasReport(detailPipeline) ? '可下载' : '未生成' }}</strong>
          </div>
        </div>

        <div v-if="detailPipeline.dataPath" class="detail-data-path">
          <Icon icon="mdi:folder-outline" />
          <span>{{ detailPipeline.dataPath }}</span>
        </div>

        <div class="detail-actions">
          <Button type="primary" @click="handleOpen(detailPipeline.id)">
            <Icon icon="mdi:play-circle-outline" />
            继续分析
          </Button>
          <Button
            :disabled="!getReportFile(detailPipeline, 'html')"
            :href="getReportFile(detailPipeline, 'html')?.path"
            target="_blank"
          >
            <Icon icon="mdi:file-eye-outline" />
            查看报告
          </Button>
          <Button
            :disabled="!getReportFile(detailPipeline, 'zip')"
            :href="getReportFile(detailPipeline, 'zip')?.path"
            target="_blank"
          >
            <Icon icon="mdi:download" />
            下载报告
          </Button>
          <Button @click="showEditModal(detailPipeline)">
            <Icon icon="mdi:pencil-outline" />
            编辑
          </Button>
        </div>
      </div>
    </Modal>

    <!-- 新建项目对话框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建单细胞分析项目"
      :confirm-loading="createLoading"
      :width="920"
      @ok="handleCreateConfirm"
      @cancel="handleCreateCancel"
    >
      <div class="create-modal-content">
        <Form
          ref="createFormRef"
          :model="createForm"
          :rules="createFormRules"
          layout="vertical"
          class="create-form"
        >
          <FormItem label="项目名称" name="name">
            <Input
              v-model:value="createForm.name"
              placeholder="例如：PBMC 3K 单细胞分析"
              :maxlength="50"
              show-count
            />
          </FormItem>

          <FormItem label="项目编号" name="projectId">
            <Select
              v-model:value="createForm.projectId"
              :options="sourceProjectOptions"
              :loading="loadingSourceProjects"
              show-search
              allow-clear
              option-filter-prop="label"
              placeholder="选择服务器上的项目编号"
              :not-found-content="loadingSourceProjects ? '正在加载项目编号...' : '未发现可用项目编号'"
              @change="handleProjectChange"
            />
          </FormItem>

          <FormItem label="样本物种" name="species">
            <Select
              v-model:value="createForm.species"
              :options="speciesOptions"
              placeholder="选择样本物种"
            />
          </FormItem>

          <FormItem label="平台类型" name="tissue">
            <Select
              v-model:value="createForm.tissue"
              :options="platformOptions"
              placeholder="选择平台类型"
            />
          </FormItem>

          <FormItem label="项目描述" name="description">
            <TextArea
              v-model:value="createForm.description"
              placeholder="可选，简要描述项目目的或备注信息"
              :rows="3"
              :maxlength="200"
              show-count
            />
          </FormItem>
        </Form>

        <aside class="prepare-panel">
          <div v-if="selectedSourceProject" class="source-project-card">
            <div class="source-project-title">{{ selectedSourceProject.project_id }}</div>
            <div class="source-project-meta">
              {{ selectedSourceProject.valid_sample_count }}/{{ selectedSourceProject.sample_count }} 个样本可用
            </div>
            <div class="source-samples">
              <Tag
                v-for="sample in selectedSourceProject.samples"
                :key="sample.sample"
                :color="sample.valid ? 'blue' : 'error'"
              >
                {{ sample.sample }}
              </Tag>
            </div>
          </div>

          <div class="prepare-title">
            <Icon icon="mdi:clipboard-check-outline" />
            创建前准备
          </div>
          <div class="prepare-list">
            <div class="prepare-item">
              <Icon icon="mdi:folder-table-outline" />
              <span>每个样本目录包含 barcodes.tsv.gz、features.tsv.gz、matrix.mtx.gz。</span>
            </div>
            <div class="prepare-item">
              <Icon icon="mdi:file-chart-outline" />
              <span>可选上传 metrics_summary.csv 和 web_summary.html，用于展示测序统计。</span>
            </div>
            <div class="prepare-item">
              <Icon icon="mdi:table-edit" />
              <span>创建后在数据导入步骤维护 sample 和 group 分组信息。</span>
            </div>
          </div>
          <div class="modal-workflow">
            <div class="modal-workflow-title">分析流程</div>
            <div class="modal-workflow-steps">
              <div v-for="step in workflowSteps" :key="step.label" class="modal-workflow-step">
                <span>{{ step.index }}</span>
                {{ step.label }}
              </div>
            </div>
          </div>
        </aside>
      </div>
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
        <FormItem label="项目名称" name="name">
          <Input
            v-model:value="editForm.name"
            placeholder="例如：PBMC 3K 单细胞分析"
            :maxlength="50"
            show-count
          />
        </FormItem>

        <FormItem label="样本数据位置" name="dataPath">
          <Input
            v-model:value="editForm.dataPath"
            placeholder="例如：/data/samples/pbmc_3k 或 s3://bucket/path"
          >
            <template #suffix>
              <Icon icon="mdi:folder-outline" style="color: #999" />
            </template>
          </Input>
        </FormItem>

        <FormItem label="样本物种" name="species">
          <Select
            v-model:value="editForm.species"
            :options="speciesOptions"
            placeholder="选择样本物种"
          />
        </FormItem>

        <FormItem label="项目描述" name="description">
          <TextArea
            v-model:value="editForm.description"
            placeholder="可选，简要描述项目目的或备注信息"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
.sc-pipeline-list {
  min-height: 100%;
  background: #f5f7fb;
}

:deep(.sc-pipeline-page-content) {
  display: flex;
  flex-direction: column;
  padding: 10px 12px 12px;
  overflow: hidden;
}

.page-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  margin: 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 18px;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
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
  font-size: 22px;
  font-weight: 600;
  color: #262626;
}

.title-icon {
  font-size: 28px;
  color: #1890ff;
}

.summary-strip {
  display: flex;
  flex: 1;
  gap: 10px;
  justify-content: flex-end;
  margin-left: 24px;
}

.summary-item {
  min-width: 104px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.summary-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  color: #1677ff;
}

.summary-label {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #697386;
}

.workbench-frame {
  flex: 1;
  min-height: 0;
}

:deep(.workbench-spin),
:deep(.workbench-spin .ant-spin-container) {
  height: 100%;
  min-height: 0;
}

.first-run-panel {
  padding: 24px;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
}

.first-run-main {
  display: grid;
  grid-template-columns: 48px minmax(0, 760px);
  gap: 16px;
  align-items: center;
}

.first-run-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.first-run-desc {
  max-width: 760px;
  margin-top: 7px;
  font-size: 13px;
  line-height: 1.7;
  color: #5f6f84;
}

.workbench {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.project-table-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.table-panel-header {
  flex: none;
  gap: 14px;
}

.project-filters {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 360px;
}

.filter-keyword {
  width: 220px;
}

.filter-keyword :deep(.ant-input-prefix) {
  color: #8a94a6;
}

.filter-select {
  width: 136px;
}

.filter-select :deep(.ant-select-selection-item),
.filter-select :deep(.ant-select-selection-placeholder) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-table {
  flex: 1;
  min-height: 0;
}

.project-table :deep(.ant-table-wrapper),
.project-table :deep(.ant-spin-nested-loading),
.project-table :deep(.ant-spin-container) {
  height: 100%;
}

.project-table :deep(.ant-table) {
  color: #1f2937;
}

.project-table :deep(.ant-table-thead > tr > th) {
  font-size: 12px;
  font-weight: 600;
  color: #5f6f84;
  background: #f8fafc;
}

.project-table :deep(.ant-table-tbody > tr > td) {
  vertical-align: middle;
}

.project-name-button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.project-name-button span {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-name-button small {
  overflow: hidden;
  font-size: 12px;
  color: #697386;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-name-button:hover span {
  color: #1677ff;
}

.table-progress {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.table-progress span,
.table-muted {
  font-size: 12px;
  color: #697386;
}

.table-strong {
  font-weight: 600;
  color: #1f2937;
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.table-actions :deep(.ant-btn) {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 24px;
  padding: 0;
  line-height: 24px;
}

.table-actions :deep(.ant-btn > span) {
  display: inline-flex;
  align-items: center;
}

.table-actions :deep(svg) {
  flex: none;
  margin: 0;
  font-size: 13px;
}

.project-detail-modal {
  padding-top: 2px;
}

.project-list-panel,
.project-detail-panel {
  min-width: 0;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.project-list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #edf1f7;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.panel-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: #8a94a6;
}

.empty-list,
.detail-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}

.empty-list {
  justify-content: flex-start;
  padding-top: 96px;
}

.empty-list :deep(svg),
.detail-empty :deep(svg) {
  margin-bottom: 14px;
  font-size: 48px;
  color: #a9b4c4;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.empty-desc {
  max-width: 360px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #697386;
}

.detail-empty-onboarding {
  align-items: stretch;
  justify-content: flex-start;
  padding: 28px;
  text-align: left;
}

.onboarding-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 720px;
}

.onboarding-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #1677ff;
  background: #eaf3ff;
  border: 1px solid #d6e8ff;
  border-radius: 8px;
}

.onboarding-icon :deep(svg) {
  margin: 0;
  font-size: 28px;
  color: currentcolor;
}

.starter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.starter-card {
  min-width: 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.starter-card :deep(svg) {
  margin: 0 0 10px;
  font-size: 22px;
  color: #1677ff;
}

.starter-card span,
.starter-card strong {
  display: block;
}

.starter-card span {
  font-size: 12px;
  color: #8a94a6;
}

.starter-card strong {
  margin-top: 6px;
  overflow: hidden;
  font-size: 14px;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-workflow {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  padding-top: 20px;
  margin-top: 24px;
  border-top: 1px solid #edf1f7;
}

.empty-workflow-step {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  padding: 8px 9px;
  overflow: hidden;
  font-size: 12px;
  color: #4f5f73;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #fbfcff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.empty-workflow-step span {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 700;
  color: #1677ff;
  background: #eaf3ff;
  border-radius: 50%;
}

.project-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}

.project-item {
  width: 100%;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.project-item:hover,
.project-item:focus-visible,
.project-item.active {
  background: #f7fbff;
  border-color: #91caff;
}

.project-item:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.14);
}

.project-item.active {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.08);
}

.project-item-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.project-name {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  flex: none;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #8a94a6;
}

.project-step {
  margin-top: 8px;
  font-size: 13px;
  color: #4f5f73;
}

.project-time {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #8a94a6;
}

.project-item-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.project-item-actions :deep(.ant-btn) {
  height: 24px;
  padding: 0;
}

.project-detail-panel {
  overflow-y: auto;
  padding: 20px;
}

.detail-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf1f7;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.detail-subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #697386;
}

.detail-progress {
  padding: 18px 0 8px;
}

.progress-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #4f5f73;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.detail-cell {
  min-width: 0;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.detail-cell span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #8a94a6;
}

.detail-cell strong {
  display: block;
  overflow: hidden;
  font-size: 14px;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-data-path {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  margin-top: 14px;
  font-size: 13px;
  color: #4f5f73;
  background: #fbfcff;
  border: 1px dashed #d9e3f2;
  border-radius: 8px;
}

.detail-data-path span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 18px;
  margin-top: 18px;
  border-top: 1px solid #edf1f7;
}

/* 新建表单样式 */
.create-modal-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
}

.create-form {
  padding-top: 8px;
}

.create-form :deep(.ant-form-item-label) {
  font-weight: 500;
}

.prepare-panel {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
  border-radius: 8px;
}

.source-project-card {
  padding: 12px;
  margin-bottom: 14px;
  background: #fff;
  border: 1px solid #e3eaf5;
  border-radius: 8px;
}

.source-project-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.source-project-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #697386;
}

.source-samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.prepare-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.prepare-title :deep(svg) {
  color: #1677ff;
}

.prepare-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prepare-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.6;
  color: #4f5f73;
}

.prepare-item :deep(svg) {
  flex: none;
  margin-top: 3px;
  color: #1677ff;
}

.modal-workflow {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #e3eaf5;
}

.modal-workflow-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.modal-workflow-steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.modal-workflow-step {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  color: #4f5f73;
}

.modal-workflow-step span {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 700;
  color: #1677ff;
  background: #eaf3ff;
  border-radius: 50%;
}

@media (max-width: 1280px) {
  .workbench {
    grid-template-columns: 320px minmax(0, 1fr);
  }

  .table-panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-filters {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .empty-workflow {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-header,
  .summary-strip {
    align-items: flex-start;
    flex-direction: column;
  }

  .workbench,
  .create-modal-content {
    grid-template-columns: 1fr;
  }

  .filter-keyword,
  .filter-select {
    width: 100%;
  }

  .first-run-main,
  .starter-grid,
  .empty-workflow {
    grid-template-columns: 1fr;
  }

  .summary-strip {
    width: 100%;
    margin-left: 0;
  }
}
</style>

<style>
.pipeline-filter-dropdown {
  min-width: 136px !important;
}

.pipeline-filter-dropdown .ant-select-item-option-content {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}
</style>
