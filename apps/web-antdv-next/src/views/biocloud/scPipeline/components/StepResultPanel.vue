<script lang="ts" setup>
/**
 * StepResultPanel - 运行结果独立卡片
 * 统计数据 + 图表，白色卡片包裹
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { StepResult } from '../types/pipeline';

import { nextTick, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Icon } from '@iconify/vue';
import { Empty, Table, Tabs } from 'ant-design-vue';

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

const chartKeys = () => Object.keys(props.result?.charts || {});
const tableKeys = () => Object.keys(props.result?.tables || {});
</script>

<template>
  <div class="result-card">
    <!-- 卡片标题 -->
    <div class="card-header">
      <div class="card-title">
        <Icon icon="mdi:chart-box-outline" class="title-icon" />
        <span>运行结果</span>
      </div>
    </div>

    <!-- Empty -->
    <Empty
      v-if="!result"
      description="执行步骤后查看结果"
      class="empty-state"
    >
      <template #image>
        <Icon icon="mdi:chart-timeline-variant" class="empty-icon" />
      </template>
    </Empty>

    <!-- Result Content -->
    <div v-else class="result-body">
      <!-- 统计卡片行 -->
      <div v-if="result.stats" class="stats-row">
        <div
          v-for="(value, key) in result.stats"
          :key="key"
          class="stat-item"
        >
          <div class="stat-label">{{ String(key).replace(/_/g, ' ') }}</div>
          <div class="stat-value">
            {{
              typeof value === 'number'
                ? value.toLocaleString()
                : value
            }}
          </div>
        </div>
      </div>

      <!-- 成功消息 -->
      <div v-if="result.message" class="result-message">
        <Icon icon="mdi:check-circle" class="msg-icon" />
        <span>{{ result.message }}</span>
      </div>

      <!-- 图表与表格 -->
      <Tabs
        v-if="chartKeys().length > 0 || tableKeys().length > 0"
        class="result-tabs"
      >
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
.result-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.title-icon {
  font-size: 20px;
  color: #1677ff;
}

.empty-state {
  padding: 40px 0;
}

.empty-icon {
  font-size: 48px;
  color: #d9d9d9;
}

.result-body {
  padding: 20px 24px;
}

/* 统计行 */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
}

.stat-item:not(:last-child) {
  border-right: 1px solid #f5f5f5;
}

.stat-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #1677ff;
  text-transform: capitalize;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

/* 消息 */
.result-message {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #389e0d;
  background: #f6ffed;
  border-radius: 8px;
}

.msg-icon {
  font-size: 16px;
  color: #52c41a;
}

/* 图表 */
.result-tabs {
  margin-top: 8px;
}

.chart-container {
  width: 100%;
  height: 360px;
}

:deep(.ant-table) {
  font-size: 13px;
}
</style>
