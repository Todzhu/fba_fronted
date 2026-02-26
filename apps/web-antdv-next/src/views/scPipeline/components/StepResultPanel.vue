<script lang="ts" setup>
/**
 * StepResultPanel - 步骤结果展示面板
 * 支持统计卡片、ECharts 图表和数据表格
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { StepResult } from '../types/pipeline';

import { nextTick, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import { Card, Empty, Statistic, Table, Tabs } from 'ant-design-vue';

const props = defineProps<{
  loading?: boolean;
  result?: StepResult;
}>();

// ECharts refs
const chartRefs = ref<Record<string, EchartsUIType>>({});

// 渲染图表
const renderCharts = () => {
  if (!props.result?.charts) return;

  nextTick(() => {
    for (const [key, options] of Object.entries(props.result!.charts!)) {
      const chartRef = chartRefs.value[key];
      if (chartRef) {
        const { renderEcharts } = useEcharts(ref(chartRef));
        renderEcharts(options as any);
      }
    }
  });
};

// 监听结果变化
watch(
  () => props.result,
  () => {
    if (props.result?.charts) {
      renderCharts();
    }
  },
  { immediate: true },
);

// 表格列定义
const getTableColumns = (columns: string[]) => {
  return columns.map((col) => ({
    title: col,
    dataIndex: col,
    key: col,
  }));
};

// Chart 数量
const chartKeys = () => Object.keys(props.result?.charts || {});
const tableKeys = () => Object.keys(props.result?.tables || {});
</script>

<template>
  <div class="step-result-panel">
    <!-- Empty State -->
    <Empty v-if="!result" description="执行步骤后查看结果" class="empty-state">
      <template #image>
        <Icon icon="mdi:chart-timeline-variant" class="empty-icon" />
      </template>
    </Empty>

    <!-- Result Content -->
    <div v-else class="result-content">
      <!-- Message -->
      <div v-if="result.message" class="result-message">
        <Icon icon="mdi:check-circle" class="message-icon" />
        <span>{{ result.message }}</span>
      </div>

      <!-- Stats Cards -->
      <div v-if="result.stats" class="stats-grid">
        <Card
          v-for="(value, key) in result.stats"
          :key="key"
          size="small"
          class="stat-card"
        >
          <Statistic
            :title="String(key).replace(/_/g, ' ')"
            :value="value"
            :precision="typeof value === 'number' && value % 1 !== 0 ? 2 : 0"
          />
        </Card>
      </div>

      <!-- Charts & Tables -->
      <Tabs
        v-if="chartKeys().length > 0 || tableKeys().length > 0"
        class="result-tabs"
      >
        <!-- Charts -->
        <Tabs.TabPane
          v-for="chartKey in chartKeys()"
          :key="chartKey"
          :tab="chartKey.replace(/_/g, ' ')"
        >
          <div class="chart-container">
            <EchartsUI
              :ref="
                (el: any) => {
                  if (el) chartRefs[chartKey] = el;
                }
              "
            />
          </div>
        </Tabs.TabPane>

        <!-- Tables -->
        <Tabs.TabPane
          v-for="tableKey in tableKeys()"
          :key="tableKey"
          :tab="tableKey.replace(/_/g, ' ')"
        >
          <Table
            :columns="getTableColumns(result.tables![tableKey].columns)"
            :data-source="result.tables![tableKey].data"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ y: 300 }"
            size="small"
            bordered
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
.step-result-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-icon {
  font-size: 64px;
  color: #bfbfbf;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-message {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  color: #389e0d;
  background: linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%);
  border-radius: 8px;
}

.message-icon {
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

:deep(.ant-statistic-title) {
  font-size: 12px;
  color: #8c8c8c;
  text-transform: capitalize;
}

:deep(.ant-statistic-content-value) {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.result-tabs {
  flex: 1;
}

.chart-container {
  width: 100%;
  height: 360px;
}

:deep(.ant-table) {
  font-size: 13px;
}
</style>
