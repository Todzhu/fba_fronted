<script lang="ts" setup>
import type { AnalysisTool, TaskStatusResponse } from '#/api/analysis-tools';
import type { PlatformStatusSummary } from '#/api/platform';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { IconifyIcon } from '@vben/icons';

import {
  Avatar,
  Button,
  Empty,
  Progress,
  Skeleton,
  Tag,
  Tooltip,
} from 'antdv-next';

import { getAnalysisToolList, getTaskList } from '#/api/analysis-tools';
import { getStorageUsage, type StorageUsage } from '#/api/my-data';
import { getPlatformStatusSummary } from '#/api/platform';
import { getAnalysisToolsPath, getTaskCenterPath } from '#/utils/route-helpers';

interface QuickNavItem {
  title: string;
  icon: string;
  color: string;
  path: string;
}

interface StatItem {
  title: string;
  value: number;
  icon: string;
  color: string;
}

const userStore = useUserStore();
const router = useRouter();

const recentTasks = ref<TaskStatusResponse[]>([]);
const recommendedTools = ref<AnalysisTool[]>([]);
const platformStatus = ref<PlatformStatusSummary | null>(null);
const storageUsage = ref<StorageUsage | null>(null);
const taskStats = ref({
  completed: 0,
  failed: 0,
  pending: 0,
  running: 0,
  total: 0,
});

const loadingTasks = ref(false);
const loadingTools = ref(false);
const loadingPlatform = ref(false);
const loadingStorage = ref(false);

const displayName = computed(
  () =>
    userStore.userInfo?.realName ||
    userStore.userInfo?.nickname ||
    userStore.userInfo?.username ||
    '用户',
);

const taskCenterPath = computed(() => getTaskCenterPath(router));
const analysisToolsPath = computed(() => getAnalysisToolsPath(router));

const quickNavItems = computed<QuickNavItem[]>(() => [
  {
    color: '#1677ff',
    icon: 'ant-design:tool-outlined',
    path: analysisToolsPath.value,
    title: '分析工具',
  },
  {
    color: '#52c41a',
    icon: 'ant-design:cloud-upload-outlined',
    path: '/my-data',
    title: '我的数据',
  },
  {
    color: '#fa8c16',
    icon: 'ant-design:profile-outlined',
    path: taskCenterPath.value,
    title: '任务中心',
  },
  {
    color: '#722ed1',
    icon: 'mdi:file-plus-outline',
    path: '/mock-report/create',
    title: '创建报告',
  },
  {
    color: '#13c2c2',
    icon: 'mdi:file-clock-outline',
    path: '/mock-report',
    title: '报告列表',
  },
  {
    color: '#eb2f96',
    icon: 'ant-design:user-outlined',
    path: '/profile',
    title: '个人中心',
  },
]);

const statItems = computed<StatItem[]>(() => [
  {
    color: '#1677ff',
    icon: 'ant-design:database-outlined',
    title: '总任务',
    value: taskStats.value.total,
  },
  {
    color: '#fa8c16',
    icon: 'ant-design:loading-3-quarters-outlined',
    title: '运行中',
    value: taskStats.value.running,
  },
  {
    color: '#52c41a',
    icon: 'ant-design:check-circle-outlined',
    title: '已完成',
    value: taskStats.value.completed,
  },
  {
    color: '#ff4d4f',
    icon: 'ant-design:warning-outlined',
    title: '失败',
    value: taskStats.value.failed,
  },
]);

const platformLevelMeta = computed(() => {
  const level = platformStatus.value?.level || 'normal';
  const meta = {
    busy: { color: '#fa8c16', label: '繁忙', status: 'normal' },
    high: { color: '#ff4d4f', label: '高负载', status: 'exception' },
    normal: { color: '#52c41a', label: '正常', status: 'success' },
  } as const;
  return meta[level];
});

const statusMeta: Record<
  TaskStatusResponse['status'],
  { color: string; icon: string; label: string; progressStatus?: string }
> = {
  completed: {
    color: 'success',
    icon: 'ant-design:check-circle-outlined',
    label: '已完成',
    progressStatus: 'success',
  },
  failed: {
    color: 'error',
    icon: 'ant-design:close-circle-outlined',
    label: '失败',
    progressStatus: 'exception',
  },
  pending: {
    color: 'default',
    icon: 'ant-design:clock-circle-outlined',
    label: '等待中',
  },
  running: {
    color: 'processing',
    icon: 'ant-design:loading-3-quarters-outlined',
    label: '运行中',
    progressStatus: 'active',
  },
};

function formatLastLoginTime(time?: null | string): string {
  if (!time) return '暂无记录';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function relativeTime(time?: null | string): string {
  if (!time) return '暂无时间';
  const target = new Date(time).getTime();
  if (Number.isNaN(target)) return time;
  const diff = Date.now() - target;
  if (diff < 60_000) return '刚刚';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(time).toLocaleDateString('zh-CN');
}

function formatFileSize(size?: number): string {
  if (!size || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getTaskProgress(task: TaskStatusResponse): number {
  if (task.status === 'completed') return 100;
  if (task.status === 'failed') return task.progress || 0;
  return Math.min(Math.max(task.progress || 0, 0), 99);
}

function getTaskTitle(task: TaskStatusResponse): string {
  return task.task_name || `${task.tool_name || '分析任务'} #${task.id}`;
}

function getToolIcon(tool: AnalysisTool): string {
  return tool.icon?.trim() || 'mdi:chart-box-outline';
}

function isImageIcon(icon?: null | string): boolean {
  if (!icon) return false;
  return icon.startsWith('http') || icon.includes('/');
}

function getFullImageUrl(url?: null | string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_GLOB_API_URL || ''}${url}`;
}

function navigateTo(path: string) {
  router.push(path).catch((error) => {
    console.error('Navigation failed:', error);
  });
}

function goToTool(tool: AnalysisTool) {
  navigateTo(`/analysis/tool/${tool.id}`);
}

function goToTask(task: TaskStatusResponse) {
  if (task.status === 'completed') {
    router
      .push({
        path: `/analysis/tool/${task.tool_id}`,
        query: { task_id: String(task.id) },
      })
      .catch((error) => {
        console.error('Navigation failed:', error);
      });
    return;
  }
  navigateTo(`/analysis/tasks/${task.id}`);
}

async function loadTasks() {
  loadingTasks.value = true;
  try {
    const [all, running, completed, failed, pending] = await Promise.all([
      getTaskList({ page: 1, page_size: 5 }),
      getTaskList({ page: 1, page_size: 1, status: 'running' }),
      getTaskList({ page: 1, page_size: 1, status: 'completed' }),
      getTaskList({ page: 1, page_size: 1, status: 'failed' }),
      getTaskList({ page: 1, page_size: 1, status: 'pending' }),
    ]);

    recentTasks.value = all.items || [];
    taskStats.value = {
      completed: completed.total || 0,
      failed: failed.total || 0,
      pending: pending.total || 0,
      running: running.total || 0,
      total: all.total || 0,
    };
  } catch (error) {
    console.error('Failed to load tasks:', error);
  } finally {
    loadingTasks.value = false;
  }
}

async function loadTools() {
  loadingTools.value = true;
  try {
    const res = await getAnalysisToolList({ page: 1, size: 6 });
    recommendedTools.value = res.items || [];
  } catch (error) {
    console.error('Failed to load tools:', error);
  } finally {
    loadingTools.value = false;
  }
}

async function loadPlatformStatus() {
  loadingPlatform.value = true;
  try {
    platformStatus.value = await getPlatformStatusSummary();
  } catch (error) {
    console.error('Failed to load platform status:', error);
  } finally {
    loadingPlatform.value = false;
  }
}

async function loadStorageUsage() {
  loadingStorage.value = true;
  try {
    storageUsage.value = await getStorageUsage();
  } catch (error) {
    console.error('Failed to load storage usage:', error);
  } finally {
    loadingStorage.value = false;
  }
}

function refreshDashboard() {
  void loadTasks();
  void loadTools();
  void loadPlatformStatus();
  void loadStorageUsage();
}

onMounted(() => {
  refreshDashboard();
});
</script>

<template>
  <div class="dashboard-page">
    <section class="welcome-panel">
      <div class="welcome-user">
        <Avatar
          :size="64"
          :src="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
        />
        <div class="welcome-copy">
          <h1>欢迎回来，{{ displayName }}</h1>
          <p>
            上次登录时间：{{
              formatLastLoginTime(userStore.userInfo?.last_login_time)
            }}
          </p>
        </div>
      </div>

      <div class="welcome-actions">
        <Button type="primary" @click="navigateTo('/my-data')">
          <template #icon>
            <IconifyIcon icon="ant-design:cloud-upload-outlined" />
          </template>
          上传数据
        </Button>
        <Button @click="navigateTo(analysisToolsPath)">
          <template #icon>
            <IconifyIcon icon="ant-design:tool-outlined" />
          </template>
          开始分析
        </Button>
        <Button @click="navigateTo(taskCenterPath)">
          <template #icon>
            <IconifyIcon icon="ant-design:profile-outlined" />
          </template>
          任务中心
        </Button>
      </div>

      <div class="stats-grid">
        <div v-for="item in statItems" :key="item.title" class="stat-item">
          <span
            class="stat-icon"
            :style="{ backgroundColor: `${item.color}14`, color: item.color }"
          >
            <IconifyIcon :icon="item.icon" />
          </span>
          <span class="stat-meta">
            <span class="stat-title">{{ item.title }}</span>
            <span class="stat-value">{{ item.value }}</span>
          </span>
        </div>
      </div>
    </section>

    <div class="dashboard-layout">
      <main class="main-column">
        <section class="dashboard-panel">
          <div class="panel-header">
            <div>
              <h2>最近任务</h2>
              <span>最新提交的分析任务</span>
            </div>
            <Button type="link" @click="navigateTo(taskCenterPath)">
              全部任务
              <IconifyIcon icon="ant-design:right-outlined" />
            </Button>
          </div>

          <Skeleton v-if="loadingTasks" active />
          <Empty v-else-if="recentTasks.length === 0" description="暂无任务" />
          <div v-else class="task-list">
            <button
              v-for="task in recentTasks"
              :key="task.id"
              class="task-row"
              type="button"
              @click="goToTask(task)"
            >
              <span class="task-main">
                <span class="task-title-line">
                  <span class="task-name">{{ getTaskTitle(task) }}</span>
                  <Tag :color="statusMeta[task.status].color">
                    <IconifyIcon :icon="statusMeta[task.status].icon" />
                    {{ statusMeta[task.status].label }}
                  </Tag>
                </span>
                <span class="task-sub">
                  <span>{{ task.tool_name || '未命名工具' }}</span>
                  <span>{{ relativeTime(task.created_at) }}</span>
                </span>
              </span>
              <span class="task-progress">
                <Progress
                  :percent="getTaskProgress(task)"
                  :show-info="false"
                  :status="statusMeta[task.status].progressStatus as any"
                  size="small"
                />
              </span>
              <span class="task-action">
                {{ task.status === 'completed' ? '查看结果' : '查看详情' }}
              </span>
            </button>
          </div>
        </section>

        <section class="dashboard-panel">
          <div class="panel-header">
            <div>
              <h2>推荐工具</h2>
              <span>常用分析工具入口</span>
            </div>
            <Button type="link" @click="navigateTo(analysisToolsPath)">
              工具库
              <IconifyIcon icon="ant-design:right-outlined" />
            </Button>
          </div>

          <Skeleton v-if="loadingTools" active />
          <Empty
            v-else-if="recommendedTools.length === 0"
            description="暂无工具"
          />
          <div v-else class="tool-grid">
            <button
              v-for="tool in recommendedTools"
              :key="tool.id"
              class="tool-item"
              type="button"
              @click="goToTool(tool)"
            >
              <span
                class="tool-icon"
                :style="{
                  backgroundColor: `${tool.color || '#1677ff'}14`,
                  color: tool.color || '#1677ff',
                }"
              >
                <img
                  v-if="isImageIcon(tool.icon)"
                  :alt="tool.title"
                  :src="getFullImageUrl(tool.icon)"
                />
                <IconifyIcon v-else :icon="getToolIcon(tool)" />
              </span>
              <span class="tool-content">
                <span class="tool-title">{{ tool.title }}</span>
                <span class="tool-desc">{{
                  tool.description || tool.func_category || tool.omics_category
                }}</span>
              </span>
            </button>
          </div>
        </section>
      </main>

      <aside class="side-column">
        <section class="dashboard-panel">
          <div class="panel-header compact">
            <div>
              <h2>快捷入口</h2>
            </div>
          </div>
          <div class="quick-grid">
            <button
              v-for="item in quickNavItems"
              :key="item.title"
              class="quick-item"
              type="button"
              @click="navigateTo(item.path)"
            >
              <span
                :style="{
                  backgroundColor: `${item.color}14`,
                  color: item.color,
                }"
              >
                <IconifyIcon :icon="item.icon" />
              </span>
              <em>{{ item.title }}</em>
            </button>
          </div>
        </section>

        <section class="dashboard-panel">
          <div class="panel-header compact">
            <div>
              <h2>平台运行状态</h2>
            </div>
            <Tag :color="platformLevelMeta.color">{{
              platformLevelMeta.label
            }}</Tag>
          </div>

          <Skeleton v-if="loadingPlatform" active :paragraph="{ rows: 2 }" />
          <div v-else class="platform-status">
            <p>{{ platformStatus?.message || '平台状态暂不可用' }}</p>
            <div class="load-row">
              <span>CPU</span>
              <Progress
                :percent="platformStatus?.cpu_percent || 0"
                :status="platformLevelMeta.status as any"
                size="small"
              />
            </div>
            <div class="load-row">
              <span>内存</span>
              <Progress
                :percent="platformStatus?.memory_percent || 0"
                :status="platformLevelMeta.status as any"
                size="small"
              />
            </div>
            <div class="platform-counts">
              <span>运行中 {{ platformStatus?.running_tasks || 0 }}</span>
              <span>等待中 {{ platformStatus?.pending_tasks || 0 }}</span>
            </div>
          </div>
        </section>

        <section class="dashboard-panel">
          <div class="panel-header compact">
            <div>
              <h2>我的数据</h2>
            </div>
            <Button type="link" @click="navigateTo('/my-data')">管理</Button>
          </div>

          <Skeleton v-if="loadingStorage" active :paragraph="{ rows: 2 }" />
          <div v-else class="storage-status">
            <div class="storage-top">
              <span>{{ formatFileSize(storageUsage?.used) }}</span>
              <em>/ {{ formatFileSize(storageUsage?.quota) }}</em>
            </div>
            <Progress :percent="storageUsage?.percent || 0" size="small" />
            <div class="storage-foot">
              <span>已用 {{ storageUsage?.percent || 0 }}%</span>
              <Tooltip title="进入我的数据查看或上传文件">
                <IconifyIcon icon="ant-design:info-circle-outlined" />
              </Tooltip>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
  padding: 20px;
  background: #f5f7fb;
}

.welcome-panel,
.dashboard-panel {
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
}

.welcome-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 18px;
  padding: 20px;
}

.welcome-user {
  display: flex;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

.welcome-copy {
  min-width: 0;
}

.welcome-copy h1 {
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
  color: #1f2937;
  white-space: nowrap;
}

.welcome-copy p {
  margin: 0;
  font-size: 13px;
  color: #667085;
}

.welcome-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.welcome-actions :deep(.ant-btn) {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 12px;
}

.stat-item {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 14px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.stat-icon,
.tool-icon,
.quick-item span {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.stat-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-title {
  font-size: 13px;
  color: #667085;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: #101828;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 16px;
  margin-top: 16px;
}

.main-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.dashboard-panel {
  padding: 18px;
}

.panel-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header.compact {
  margin-bottom: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
}

.panel-header span {
  font-size: 12px;
  color: #98a2b3;
}

.panel-header :deep(.ant-btn-link) {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding-right: 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px 72px;
  gap: 16px;
  align-items: center;
  width: 100%;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.task-row:hover {
  border-color: #91caff;
  box-shadow: 0 6px 18px rgb(16 24 40 / 8%);
}

.task-main {
  min-width: 0;
}

.task-title-line {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.task-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
}

.task-sub {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #98a2b3;
}

.task-sub span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  min-width: 0;
}

.task-action {
  font-size: 13px;
  color: #1677ff;
  text-align: right;
  white-space: nowrap;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tool-item {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.tool-item:hover {
  border-color: #91caff;
  box-shadow: 0 6px 18px rgb(16 24 40 / 8%);
}

.tool-icon {
  width: 42px;
  height: 42px;
  overflow: hidden;
  font-size: 22px;
}

.tool-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.tool-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.tool-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
}

.tool-desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.45;
  color: #98a2b3;
  -webkit-box-orient: vertical;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-item {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 12px;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.quick-item:hover {
  border-color: #91caff;
}

.quick-item span {
  width: 34px;
  height: 34px;
  font-size: 18px;
}

.quick-item em {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-style: normal;
  white-space: nowrap;
}

.platform-status,
.storage-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-status p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #667085;
}

.load-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #667085;
}

.platform-counts {
  display: flex;
  gap: 8px;
}

.platform-counts span {
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  color: #475467;
  text-align: center;
  background: #f8fafc;
  border-radius: 6px;
}

.storage-top {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.storage-top span {
  font-size: 22px;
  font-weight: 600;
  color: #101828;
}

.storage-top em {
  font-size: 12px;
  font-style: normal;
  color: #98a2b3;
}

.storage-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #98a2b3;
}

@media (max-width: 1180px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .side-column {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .welcome-panel {
    grid-template-columns: 1fr;
  }

  .welcome-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .stats-grid,
  .tool-grid,
  .side-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .task-action {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .dashboard-page {
    padding: 12px;
  }

  .welcome-user {
    align-items: flex-start;
  }

  .welcome-copy h1 {
    white-space: normal;
  }

  .stats-grid,
  .tool-grid,
  .side-column,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
