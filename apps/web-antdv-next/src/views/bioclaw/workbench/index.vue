<template>
  <div class="bioclaw-app">
    <!-- 左侧导航栏 -->
    <aside class="bioclaw-sidebar">
      <LeftSidebar
        :activeSection="activeSection"
        :threads="threads"
        :activeThreadId="activeThreadId"
        :currentProjectName="currentProjectName"
        @navigate="handleNavigate"
        @new-thread="handleNewThread"
        @select-thread="handleSelectThread"
        @delete-thread="handleDeleteThread"
      />
    </aside>

    <!-- 中间主内容区 -->
    <main class="bioclaw-main">
      <ChatCanvas
        v-show="activeSection === 'chat'"
        ref="chatCanvasRef"
        :newThreadTrigger="newThreadTrigger"
        @toggle-panel="isRightPanelOpen = !isRightPanelOpen"
        :isPanelOpen="isRightPanelOpen"
      />
      <ProjectBoard v-if="activeSection === 'projects'" @enter-project="handleEnterProject" />
      <KnowledgeBase v-if="activeSection === 'knowledge'" />
      <CloudDrive v-if="activeSection === 'cloud'" />
      <SkillsStore v-if="activeSection === 'skills'" />
      <AutomationTasks v-if="activeSection === 'automation'" />
      <HistoryRecords v-if="activeSection === 'history'" />
      <!-- 设置页占位 -->
      <div v-if="activeSection === 'settings'" class="placeholder-page">
        <div class="placeholder-icon">
          <IconifyIcon icon="ant-design:setting-outlined" style="font-size: 48px; color: #ccc;" />
        </div>
        <h2 class="placeholder-title">设置</h2>
        <p class="placeholder-desc">该模块正在开发中，敬请期待...</p>
      </div>
    </main>

    <!-- 右侧结果看板（仅对话页面显示） -->
    <aside v-if="activeSection === 'chat'" class="bioclaw-panel" :class="{ 'panel-closed': !isRightPanelOpen }">
      <RightDashboard v-if="isRightPanelOpen" @close="isRightPanelOpen = false" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { IconifyIcon } from '@vben/icons';
import { getThreads, deleteThread } from '#/api/bioclaw';
import { message, Modal } from 'antdv-next';
import LeftSidebar from './components/LeftSidebar.vue';
import ChatCanvas from './components/ChatCanvas.vue';
import RightDashboard from './components/RightDashboard.vue';
import ProjectBoard from './components/ProjectBoard.vue';
import KnowledgeBase from './components/KnowledgeBase.vue';
import CloudDrive from './components/CloudDrive.vue';
import SkillsStore from './components/SkillsStore.vue';
import AutomationTasks from './components/AutomationTasks.vue';
import HistoryRecords from './components/HistoryRecords.vue';

// --- 布局状态 ---
const isRightPanelOpen = ref(false);  // 默认不展示右侧看板
const activeSection = ref('chat');

// --- ChatCanvas 实例引用 ---
const chatCanvasRef = ref<InstanceType<typeof ChatCanvas>>();

// --- 新建对话触发器（递增）---
const newThreadTrigger = ref(0);

// --- 线程列表状态（给 LeftSidebar 用）---
interface Thread { id: number; title: string; status: string; }
const threads = ref<Thread[]>([]);
const activeThreadId = ref<number | null>(null);
const currentProjectName = ref('');

// --- 监听 ChatCanvas 的当前项目变化，自动加载线程列表 ---
watch(
  () => chatCanvasRef.value?.currentProject,
  async (project) => {
    if (!project) { threads.value = []; currentProjectName.value = ''; return; }
    currentProjectName.value = project.name;
    await fetchThreads(project.id);
  },
  { deep: true }
);

async function fetchThreads(projectId: number) {
  try {
    const data = await getThreads(projectId);
    if (Array.isArray(data)) {
      threads.value = data as any;
    }
  } catch (e) {
    console.error('加载线程列表失败', e);
  }
}

// --- 导航切换 ---
function handleNavigate(sectionId: string) {
  activeSection.value = sectionId;
  if (sectionId !== 'chat') {
    isRightPanelOpen.value = false;
  }
}

// --- 新建对话 ---
function handleNewThread() {
  activeSection.value = 'chat';
  activeThreadId.value = null;
  newThreadTrigger.value++; // ChatCanvas 通过 watch prop 响应
}

// --- 点击左侧线程切换 ---
async function handleSelectThread(thread: Thread) {
  activeSection.value = 'chat';
  isRightPanelOpen.value = true;
  activeThreadId.value = thread.id;
  await nextTick();
  const project = chatCanvasRef.value?.currentProject;
  if (project) {
    await chatCanvasRef.value?.loadThread(thread.id, project);
  }
}

// --- 删除左侧线程 ---
async function handleDeleteThread(thread: Thread) {
  Modal.confirm({
    title: '确认删除对话？',
    content: `您将永久删除历史记录 "${thread.title || '新对话'}"，此操作不可恢复。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    centered: true,
    async onOk() {
      try {
        await deleteThread(thread.id);
        message.success('已删除');
        const project = chatCanvasRef.value?.currentProject;
        if (project) {
          await fetchThreads(project.id);
        }
        if (activeThreadId.value === thread.id) {
          handleNewThread();
        }
      } catch (error) {
        message.error('删除失败');
      }
    }
  });
}

// --- 从项目页"进入项目" ---
async function handleEnterProject(project: any) {
  activeSection.value = 'chat';
  isRightPanelOpen.value = true;
  await nextTick();

  try {
    const data = await getThreads(project.id);
    if (Array.isArray(data) && data.length > 0) {
      const lastThread = data[0] as any;
      activeThreadId.value = lastThread.id;
      await chatCanvasRef.value?.loadThread(lastThread.id, project);
    } else {
      activeThreadId.value = null;
      chatCanvasRef.value?.newThread(project);
    }
  } catch (e) {
    chatCanvasRef.value?.newThread(project);
  }
}
</script>

<style scoped>
.bioclaw-app {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #f5f3ef;
}
.bioclaw-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100%;
  background: #faf8f5;
  border-right: 1px solid #e8e4df;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.bioclaw-main {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #faf8f5;
}
.bioclaw-panel {
  width: 420px;
  min-width: 420px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e8e4df;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}
.bioclaw-panel.panel-closed {
  width: 0;
  min-width: 0;
  border-left: none;
  overflow: hidden;
}
.placeholder-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}
.placeholder-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #f0ece6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
}
.placeholder-desc {
  font-size: 14px;
  color: #999;
  margin: 0;
}
</style>
