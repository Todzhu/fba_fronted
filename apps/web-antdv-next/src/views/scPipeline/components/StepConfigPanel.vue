<script lang="ts" setup>
/**
 * StepConfigPanel - 步骤参数配置面板
 * 封装 DynamicForm，根据当前步骤加载对应 Schema
 * 对于数据读取步骤，显示样本信息表格
 */
import type { ParamSchema, StepResult, StepStatus, StepType } from '../types/pipeline';
import type { SampleInfo } from '../mock/myDataMock';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, Input, message, Spin } from 'antdv-next';

import DynamicForm from '../../cloudTools/components/DynamicForm.vue';
import { getMarkerDictApi, type MarkerDictItem } from '../api';
import { STEP_DEFINITIONS } from '../mock/stepSchemas';
import SampleTableEditor from './SampleTableEditor.vue';

const props = defineProps<{
  stepType: StepType;
  params: Record<string, unknown>;
  status: StepStatus;
  result?: StepResult;
  disabled?: boolean;
  historyCount?: number;
  samples?: SampleInfo[];  // 样本列表（仅数据读取步骤使用）
}>();

const emit = defineEmits<{
  (e: 'update:params', params: Record<string, unknown>): void;
  (e: 'update:samples', samples: SampleInfo[]): void;
  (e: 'run', params?: Record<string, unknown>): void;
  (e: 'show-history'): void;
}>();

// 是否为数据读取步骤
const isDataLoadStep = computed(() => props.stepType === 'data_load');

// 当前步骤定义
const stepDef = computed(() => STEP_DEFINITIONS[props.stepType]);

// 参数 Schema
const paramSchema = computed<ParamSchema | null>(() => {
  return stepDef.value?.paramSchema || null;
});

const paramGroupCount = computed(() => {
  const schema = paramSchema.value;
  if (!schema?.properties) return 0;
  const rawProperties = Array.isArray(schema.properties)
    ? schema.properties
    : Object.values(schema.properties);
  const groups = new Set<string>();
  for (const prop of rawProperties as Array<Record<string, unknown>>) {
    groups.add(String(prop.group || '默认参数'));
  }
  return groups.size;
});

// 本地参数副本
const localParams = ref<Record<string, unknown>>({});

// 本地样本副本
const localSamples = ref<SampleInfo[]>([]);
const annotationRows = ref<Array<{ Cluster: string; annotation: string; cell_type: string }>>([]);
const markerDict = ref<MarkerDictItem[]>([]);
const markerLoading = ref(false);
const markerRows = ref<Array<{ cell_type: string; markers: string }>>([]);

// 同步外部参数
watch(
  () => props.params,
  (newParams) => {
    localParams.value = { ...newParams };
  },
  { immediate: true, deep: true },
);

// 同步外部样本
watch(
  () => props.samples,
  (newSamples) => {
    localSamples.value = newSamples ? [...newSamples] : [];
  },
  { immediate: true, deep: true },
);

watch(
  () => props.result?.tables?.annotation_mapping?.data,
  (rows) => {
    annotationRows.value = Array.isArray(rows)
      ? rows.map((row: any) => ({
          Cluster: String(row.Cluster ?? ''),
          annotation: String(row.annotation ?? ''),
          cell_type: String(row.cell_type ?? row.annotation ?? ''),
        }))
      : [];
  },
  { immediate: true, deep: true },
);

// 参数变更
const handleParamsChange = (params: Record<string, unknown>) => {
  localParams.value = params;
  emit('update:params', params);
};

// 样本变更
const handleSamplesChange = (samples: SampleInfo[]) => {
  localSamples.value = samples;
  emit('update:samples', samples);
};

// 重置参数
const handleReset = () => {
  if (!paramSchema.value?.properties) return;

  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(paramSchema.value.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  localParams.value = defaults;
  emit('update:params', defaults);
  message.success('参数已重置');
};

const handleRunRename = () => {
  const annotations = annotationRows.value.reduce<Record<string, string>>((acc, row) => {
    if (row.Cluster) {
      acc[row.Cluster] = row.cell_type || row.annotation || row.Cluster;
    }
    return acc;
  }, {});
  const nextParams = { ...localParams.value, annotations };
  localParams.value = nextParams;
  emit('update:params', nextParams);
  emit('run', nextParams);
};

const handleRunGeneExpression = () => {
  const editableMarkerRows = markerRows.value
    .map((row) => ({
      cell_type: row.cell_type.trim(),
      markers: row.markers
        .replace(/，/g, ',')
        .split(',')
        .map((gene) => gene.trim())
        .filter(Boolean),
    }))
    .filter((row) => row.cell_type && row.markers.length > 0);
  if (editableMarkerRows.length === 0) {
    message.warning('请至少配置一组细胞类型 Marker');
    return;
  }
  const nextParams = {
    ...localParams.value,
    gene_expression_genes: [],
    marker_cell_types: editableMarkerRows.map((row) => row.cell_type),
    marker_cell_type_genes: editableMarkerRows,
  };
  localParams.value = nextParams;
  emit('update:params', nextParams);
  emit('run', nextParams);
};

const fetchMarkerDict = async () => {
  if (props.stepType !== 'cell_annotation') return;
  const organism = String(localParams.value.organism || 'human');
  markerLoading.value = true;
  try {
    markerDict.value = await getMarkerDictApi(organism);
    fillAllMarkerRows();
  } catch (error) {
    markerDict.value = [];
    message.error('常见细胞类型 Marker 加载失败');
  } finally {
    markerLoading.value = false;
  }
};

const fillAllMarkerRows = () => {
  markerRows.value = markerDict.value.map((item) => ({
    cell_type: item.cell_type,
    markers: item.markers.join(', '),
  }));
};

const handleAddMarkerRow = () => {
  markerRows.value.push({
    cell_type: `Custom ${markerRows.value.length + 1}`,
    markers: '',
  });
};

const handleRemoveMarkerRow = (index: number) => {
  markerRows.value.splice(index, 1);
};

watch(
  () => [props.stepType, props.status, localParams.value.organism],
  () => {
    if (props.stepType === 'cell_annotation' && props.status === 'completed') {
      fetchMarkerDict();
    }
  },
  { immediate: true },
);

</script>

<template>
  <div class="step-config-panel">
    <!-- Loading State -->
    <Spin v-if="status === 'running'" class="running-spin">
      <template #tip>正在执行分析...</template>
    </Spin>

    <!-- Form -->
    <div v-else class="form-container">
      <!-- 数据读取步骤：显示样本表格 -->
      <template v-if="isDataLoadStep">
        <div class="sample-editor-title">
          <Icon icon="mdi:table-edit" />
          样本分组
        </div>
        <SampleTableEditor
          :model-value="localSamples"
          @update:model-value="handleSamplesChange"
        />
      </template>

      <!-- 其他步骤：显示 DynamicForm -->
      <template v-else>
        <section class="config-section">
          <div class="section-header">
            <div>
              <div class="section-title">参数设置</div>
              <div class="section-desc">{{ stepDef?.description }}</div>
            </div>
          </div>
          <DynamicForm
            v-if="paramSchema"
            :model-value="localParams"
            :schema="paramSchema as any"
            :show-actions="false"
            class="step-dynamic-form"
            :class="{ 'single-param-group': paramGroupCount <= 1 }"
            @update:model-value="handleParamsChange"
            @reset="handleReset"
          />
        </section>

        <template v-if="stepType === 'cell_annotation' && status === 'completed'">
          <section v-if="annotationRows.length > 0" class="config-section">
            <div class="section-header">
              <div>
                <div class="section-title">
                  <Icon icon="mdi:table-edit" />
                  人工注释修订
                </div>
                <div class="section-desc">按 cluster 修改细胞类型名称，重新执行后写入结果</div>
              </div>
              <Button type="primary" size="small" @click="handleRunRename">
                <Icon icon="mdi:content-save-outline" />
                更新
              </Button>
            </div>
            <div class="annotation-table">
              <div class="annotation-row annotation-head">
                <span>Cluster</span>
                <span>annotation</span>
                <span>cell_type</span>
              </div>
              <div
                v-for="row in annotationRows"
                :key="row.Cluster"
                class="annotation-row"
              >
                <span class="readonly-cell">{{ row.Cluster }}</span>
                <span class="readonly-cell">{{ row.annotation }}</span>
                <Input v-model:value="row.cell_type" size="small" />
              </div>
            </div>
          </section>

          <section class="config-section">
            <div class="section-header">
              <div>
                <div class="section-title">
                  <Icon icon="mdi:dna" />
                  基因表达展示
                </div>
                <div class="section-desc">编辑常见细胞类型 Marker，生成 UMAP 表达图</div>
              </div>
            </div>
            <div v-if="markerLoading" class="marker-loading">正在加载预定义 Marker...</div>
            <div class="marker-edit-table">
              <div class="marker-edit-row marker-edit-head">
                <span>cell_type</span>
                <span>markers</span>
                <span></span>
              </div>
              <div
                v-for="(row, index) in markerRows"
                :key="`${row.cell_type}-${index}`"
                class="marker-edit-row"
              >
                <Input
                  v-model:value="row.cell_type"
                  size="small"
                  placeholder="细胞类型"
                />
                <Input
                  v-model:value="row.markers"
                  size="small"
                  placeholder="多个基因用逗号分隔"
                />
                <Button size="small" class="marker-row-remove" @click="handleRemoveMarkerRow(index)">
                  <Icon icon="mdi:close" />
                </Button>
              </div>
              <Button size="small" class="marker-add-row" @click="handleAddMarkerRow">
                <Icon icon="mdi:plus" />
                添加 Marker
              </Button>
            </div>
            <Button block class="scvision-action" @click="handleRunGeneExpression">
              <Icon icon="mdi:chart-scatter-plot" />
              Plot
            </Button>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.step-config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.form-container {
  flex: 1;
  min-height: 0;
  padding: 0 4px 14px;
  overflow-y: auto;
}

.sample-editor-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.config-section {
  padding: 14px;
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid #edf1f7;
  border-radius: 10px;
}

.config-section:first-child {
  padding-top: 14px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #262626;
}

.section-title :deep(svg) {
  color: #1677ff;
}

.section-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7894;
}

.step-dynamic-form {
  padding-top: 2px;
}

.step-dynamic-form :deep(.param-groups) {
  gap: 12px;
}

.step-dynamic-form :deep(.param-group) {
  padding-bottom: 0;
  border-bottom: 0;
}

.step-dynamic-form.single-param-group :deep(.param-group-title) {
  display: none;
}

.step-dynamic-form :deep(.param-grid) {
  grid-template-columns: 1fr;
  gap: 12px;
}

.step-dynamic-form :deep(.param-item) {
  gap: 5px;
}

.step-dynamic-form :deep(.param-label) {
  margin-bottom: 0;
}

.step-dynamic-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.step-dynamic-form :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.step-dynamic-form :deep(.ant-form-item-label > label) {
  height: auto;
  font-size: 12px;
  font-weight: 600;
  color: #5f6f8f;
}

.step-dynamic-form :deep(.ant-select-selector),
.step-dynamic-form :deep(.ant-input),
.step-dynamic-form :deep(.ant-input-number) {
  min-height: 34px;
  background: #fff;
  border-radius: 8px;
}

.annotation-table {
  display: flex;
  flex-direction: column;
  max-height: 248px;
  overflow: auto;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.annotation-row {
  display: grid;
  grid-template-columns: 64px minmax(86px, 1fr) minmax(106px, 1.15fr);
  gap: 10px;
  align-items: center;
  min-height: 34px;
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f4f6f9;
}

.annotation-row:last-child {
  border-bottom: 0;
}

.annotation-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 32px;
  font-weight: 600;
  color: #5f6f8f;
  background: #f7f9fc;
  border-bottom: 1px solid #edf0f5;
}

.readonly-cell {
  min-width: 0;
  overflow: hidden;
  color: #595959;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scvision-action {
  margin-top: 10px;
  border-radius: 8px;
}

.marker-loading {
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #6b7894;
  background: #fff;
  border: 1px dashed #d9e2ef;
  border-radius: 8px;
}

.marker-edit-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 260px;
  margin-top: 10px;
  overflow: auto;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.marker-edit-row {
  display: grid;
  grid-template-columns: minmax(96px, 0.75fr) minmax(160px, 1.4fr) 34px;
  gap: 8px;
  align-items: center;
  min-height: 38px;
  padding: 6px 8px;
  border-bottom: 1px solid #f4f6f9;
}

.marker-edit-row:last-of-type {
  border-bottom: 0;
}

.marker-edit-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 32px;
  font-size: 12px;
  font-weight: 600;
  color: #5f6f8f;
  background: #f7f9fc;
  border-bottom: 1px solid #edf0f5;
}

.marker-row-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0;
  color: #8c8c8c;
  border-radius: 6px;
}

.marker-add-row {
  justify-content: center;
  margin: 8px;
  border-style: dashed;
  border-radius: 8px;
}

.running-spin {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
