<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Button, Card } from 'ant-design-vue';
import { Download, Sparkles } from 'lucide-vue-next';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// Mock ECharts Option for Violin Plot (Simplified representation)
onMounted(() => {
  renderEcharts({
    grid: {
      left: '5%',
      right: '5%',
      top: '15%',
      bottom: '10%',
      containLabel: true,
    },
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['AML', 'BLDG', 'BIC'],
      right: 10,
      top: 10,
    },
    xAxis: {
      type: 'category',
      data: ['AML', 'BLDG', 'BIC', 'AML', 'BLDG', 'BIC', 'AML', 'BLDG', 'BIC'],
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        interval: 0,
        formatter: (value: string) => value,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Value',
      min: 10.2,
      max: 13.1,
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee',
        },
      },
    },
    series: [
      {
        name: 'Violin Plot',
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const categoryIndex = api.value(0);
          const val = api.value(1);

          const x = api.coord([categoryIndex, val])[0];
          const y = api.coord([categoryIndex, val])[1];
          const width = 30;

          const colors = ['#ff7875', '#95de64', '#69b1ff'];
          const color = colors[categoryIndex % 3];

          return {
            type: 'group',
            children: [
              {
                type: 'path',
                shape: {
                  d: 'M0,-20 Q20,-10 0,20 Q-20,-10 0,-20 Z',
                  x,
                  y,
                  width,
                  height: 60,
                  layout: 'cover',
                },
                style: {
                  fill: color,
                  stroke: color,
                  lineWidth: 2,
                  fillOpacity: 0.2,
                },
              },
              {
                type: 'line',
                shape: {
                  x1: x - 15,
                  y1: y,
                  x2: x + 15,
                  y2: y,
                },
                style: {
                  stroke: color,
                  lineWidth: 2,
                },
              },
            ],
          };
        },
        data: [
          [0, 12.8],
          [1, 12.1],
          [2, 11.5],
          [3, 12.6],
          [4, 12],
          [5, 11.4],
          [6, 12.5],
          [7, 11.8],
          [8, 10.5],
        ],
      },
    ],
  });
});
</script>

<template>
  <Card
    class="flex h-full flex-col rounded-xl border-none shadow-sm"
    :body-style="{ height: '100%', display: 'flex', flexDirection: 'column' }"
  >
    <div class="mb-4 flex items-center justify-between">
      <div class="text-primary flex items-center gap-2 font-medium">
        <Sparkles class="size-4" />
        <span>图表预览</span>
      </div>
      <Button size="small" class="flex items-center gap-1">
        <template #icon><Download class="size-3" /></template>
        下载图表
      </Button>
    </div>

    <!-- Chart Container -->
    <div class="relative min-h-[400px] w-full flex-grow bg-white">
      <div class="absolute inset-0 flex flex-col">
        <!-- Labels -->
        <div
          class="flex justify-around px-12 pt-2 text-sm font-medium text-gray-700"
        >
          <span>High</span>
          <span>Mid</span>
          <span>Low</span>
        </div>
        <EchartsUI ref="chartRef" class="h-full w-full" />
      </div>
    </div>
  </Card>
</template>
