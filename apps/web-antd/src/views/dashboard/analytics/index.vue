<script lang="ts" setup>
import type {
  WorkbenchProjectItem,
  WorkbenchQuickNavItem,
  WorkbenchTrendItem,
} from '@vben/common-ui';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getTaskCenterPath } from '#/utils/route-helpers';

import {
  WorkbenchHeader,
  WorkbenchProject,
  WorkbenchQuickNav,
  WorkbenchTrends,
} from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import {
  getTaskList,
  type TaskStatusResponse,
} from '#/api/analysis-tools';
import { Modal } from 'ant-design-vue';

const userStore = useUserStore();

const projectItems: WorkbenchProjectItem[] = [
  {
    color: '#1677ff',
    content: '虚拟基因敲除与调控网络分析',
    date: '',
    group: 'scRNA',
    icon: 'mdi:dna',
    title: 'scTenifoldKnk',
    url: '/analysis/tools',
  },
  {
    color: '#52c41a',
    content: '差异表达基因统计与可视化',
    date: '',
    group: 'scRNA',
    icon: 'mdi:chart-scatter-plot',
    title: 'Ro/e 分析',
    url: '/analysis/tools',
  },
  {
    color: '#722ed1',
    content: '细胞通讯与信号通路推断',
    date: '',
    group: 'scRNA',
    icon: 'mdi:message-text-outline',
    title: 'CellChat',
    url: '/analysis/tools',
  },
  {
    color: '#eb2f96',
    content: '差异表达基因火山图绘制',
    date: '',
    group: '可视化',
    icon: 'mdi:chart-areaspline-variant',
    title: '火山图',
    url: '/analysis/tools',
  },
  {
    color: '#13c2c2',
    content: '细胞分化潜能预测与排序',
    date: '',
    group: 'scRNA',
    icon: 'mdi:chart-timeline-variant',
    title: 'CytoTRACE 2',
    url: '/analysis/tools',
  },
  {
    color: '#fa8c16',
    content: '拟时序分析与细胞分化轨迹',
    date: '',
    group: 'scRNA',
    icon: 'mdi:transit-connection-variant',
    title: 'Monocle2',
    url: '/analysis/tools',
  },
];

const quickNavItems = computed<WorkbenchQuickNavItem[]>(() => [
  {
    color: '#1677ff',
    icon: 'mdi:toolbox-outline',
    title: '分析工具',
    url: '/analysis/tools',
  },
  {
    color: '#52c41a',
    icon: 'mdi:dna',
    title: '单细胞分析',
    url: '/analysis/sc-pipeline',
  },
  {
    color: '#fa8c16',
    icon: 'mdi:clipboard-list-outline',
    title: '任务中心',
    url: getTaskCenterPath(router),
  },
  {
    color: '#722ed1',
    icon: 'mdi:folder-open-outline',
    title: '我的数据',
    url: '/data',
  },
  {
    color: '#13c2c2',
    icon: 'mdi:chart-bar',
    title: '分析流程',
    url: '/analysis',
  },
  {
    color: '#eb2f96',
    icon: 'mdi:account-circle-outline',
    title: '个人中心',
    url: '/profile',
  },
]);

const trendItems = ref<WorkbenchTrendItem[]>([]);
const taskStats = ref({ total: 0, completed: 0, running: 0, failed: 0 });

const router = useRouter();

function navTo(nav: WorkbenchProjectItem | WorkbenchQuickNavItem) {
  if ('url' in nav && nav.url === '/analysis') {
    Modal.info({
      title: '功能开发中',
      content: '分析流程功能正在开发中，敬请期待！',
      okText: '知道了',
    });
    return;
  }
  if (nav.url?.startsWith('/')) {
    router.push(nav.url).catch((error) => {
      console.error('Navigation failed:', error);
    });
  }
}

function relativeTime(time: string | null): string {
  if (!time) return '';
  const now = Date.now();
  const t = new Date(time).getTime();
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(time).toLocaleDateString('zh-CN');
}

const statusText: Record<string, string> = {
  completed: '完成',
  running: '正在运行',
  failed: '运行失败',
  pending: '等待运行',
};

onMounted(async () => {
  try {
    const res = await getTaskList({ page: 1, size: 8 });
    const tasks = res.items || [];
    taskStats.value = {
      total: res.total || 0,
      completed: tasks.filter((t: TaskStatusResponse) => t.status === 'completed').length,
      running: tasks.filter((t: TaskStatusResponse) => t.status === 'running').length,
      failed: tasks.filter((t: TaskStatusResponse) => t.status === 'failed').length,
    };
    trendItems.value = tasks.map((task: TaskStatusResponse) => ({
      avatar: task.status === 'completed'
        ? 'svg:avatar-1'
        : task.status === 'running'
          ? 'svg:avatar-2'
          : task.status === 'failed'
            ? 'svg:avatar-3'
            : 'svg:avatar-4',
      content: `使用 <a>${task.tool_name}</a> ${statusText[task.status] || task.status}了任务 <a>${task.task_name}</a>`,
      date: relativeTime(task.created_time),
      title: userStore.userInfo?.realName || userStore.userInfo?.nickname || '用户',
    }));
  } catch (e) {
    console.error('Failed to load recent tasks', e);
  }
});
</script>

<template>
  <div class="p-5">
    <WorkbenchHeader
      :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
    >
      <template #title>
        欢迎回来, {{ userStore.userInfo?.realName || userStore.userInfo?.nickname || '用户' }}！开始您的数据分析之旅
      </template>
      <template #description>
        CWMDA 多组学数据分析平台 — 一站式生物信息分析解决方案
      </template>
      <template #extra>
        <div class="flex flex-col justify-center text-right">
          <span class="text-foreground/80">总任务</span>
          <span class="text-2xl">{{ taskStats.total }}</span>
        </div>
        <div class="mx-12 flex flex-col justify-center text-right md:mx-16">
          <span class="text-foreground/80">已完成</span>
          <span class="text-2xl">{{ taskStats.completed }}</span>
        </div>
        <div class="mr-4 flex flex-col justify-center text-right md:mr-10">
          <span class="text-foreground/80">运行中</span>
          <span class="text-2xl">{{ taskStats.running }}</span>
        </div>
      </template>
    </WorkbenchHeader>

    <div class="mt-5 flex flex-col lg:flex-row">
      <div class="mr-4 w-full lg:w-3/5">
        <WorkbenchProject :items="projectItems" title="平台分析工具" @click="navTo" />
        <WorkbenchTrends :items="trendItems" class="mt-5" title="最近分析动态" />
      </div>
      <div class="w-full lg:w-2/5">
        <WorkbenchQuickNav
          :items="quickNavItems"
          class="mt-5 lg:mt-0"
          title="快捷导航"
          @click="navTo"
        />
      </div>
    </div>
  </div>
</template>
