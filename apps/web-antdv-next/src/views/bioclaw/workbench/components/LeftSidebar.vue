<template>
  <div class="sidebar-wrap">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-box">
        <IconifyIcon icon="ant-design:code-sandbox-outlined" class="logo-icon-svg" />
      </div>
      <span class="logo-text">PedalUp</span>
      <span class="logo-badge">Pro</span>
    </div>

    <!-- 新建对话按钮 -->
    <div class="sidebar-action">
      <button class="new-thread-btn" @click="$emit('new-thread')">
        <IconifyIcon icon="ant-design:plus-outlined" class="btn-icon" />
        <span class="btn-text">新建对话</span>
        <div class="btn-shortcut">⌘K</div>
      </button>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <div
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeSection === item.id }"
        @click="$emit('navigate', item.id)"
      >
        <IconifyIcon :icon="item.icon" />
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </div>
    </nav>

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- 当前项目线程（仅对话模式下显示） -->
    <div v-if="activeSection === 'chat'" class="sidebar-threads">
      <template v-if="threads.length > 0">
        <div class="thread-section-title">
          <IconifyIcon icon="ant-design:folder-outlined" style="font-size:12px;color:#ffa726;" />
          {{ currentProjectName || '当前项目' }}
        </div>
        <div
          v-for="t in threads"
          :key="t.id"
          class="thread-item"
          :class="{ active: t.id === activeThreadId }"
          @click="$emit('select-thread', t)"
        >
          <IconifyIcon icon="ant-design:message-outlined" class="thread-icon" />
          <div class="thread-info">
            <span class="thread-name">{{ t.title || '新对话' }}</span>
            <span class="thread-time">{{ t.status === 'active' ? '进行中' : '' }}</span>
          </div>
          <div class="thread-action-btn" title="删除对话" @click.stop="$emit('delete-thread', t)">
            <IconifyIcon icon="ant-design:delete-outlined" class="thread-delete-icon" />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="thread-empty">暂无对话，点击「新建对话」开始</div>
      </template>
    </div>

    <!-- 弹性占位，确保设置始终在底部 -->
    <div v-if="activeSection !== 'chat'" class="sidebar-spacer"></div>

    <!-- 底部设置 -->
    <div class="sidebar-footer">
      <div class="nav-item" @click="$emit('navigate', 'settings')">
        <IconifyIcon icon="ant-design:setting-outlined" />
        <span>设置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

interface Thread { id: number; title: string; status: string; }

const props = withDefaults(defineProps<{
  activeSection: string;
  threads?: Thread[];
  activeThreadId?: number | null;
  currentProjectName?: string;
}>(), {
  threads: () => [],
  activeThreadId: null,
  currentProjectName: '',
});

defineEmits(['navigate', 'new-thread', 'select-thread', 'delete-thread']);

const navItems: Array<{ id: string; icon: string; label: string; badge?: string }> = [
  { id: 'chat', icon: 'ant-design:message-outlined', label: '对话' },
  { id: 'projects', icon: 'ant-design:project-outlined', label: '项目' },
  { id: 'knowledge', icon: 'ant-design:book-outlined', label: '知识库' },
  { id: 'cloud', icon: 'ant-design:cloud-outlined', label: '云盘' },
  { id: 'skills', icon: 'ant-design:appstore-outlined', label: 'Skills 商店' },
  { id: 'automation', icon: 'ant-design:thunderbolt-outlined', label: '自动化' },
  { id: 'history', icon: 'ant-design:history-outlined', label: '历史记录' },
];
</script>

<style scoped>
.sidebar-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
}
.logo-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e8503a 0%, #d4412d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(232, 80, 58, 0.3);
}
.logo-icon-svg {
  color: #fff;
  font-size: 20px;
}
.logo-text {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}
.logo-badge {
  font-size: 10px;
  font-weight: 700;
  color: #e8503a;
  background: #fef0ed;
  padding: 2px 6px;
  border-radius: 6px;
  margin-top: 2px;
  border: 1px solid rgba(232, 80, 58, 0.2);
}

.sidebar-action {
  padding: 0 16px 16px;
}
.new-thread-btn {
  display: flex;
  align-items: center;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  background: #1a1a1a;
  border: none;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}
.new-thread-btn::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(rgba(255,255,255,0.1), transparent);
  pointer-events: none;
}
.new-thread-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  background: #2a2a2a;
}
.new-thread-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.btn-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #e8503a;
}
.btn-text {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.btn-shortcut {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  background: rgba(255, 255, 255, 0.12);
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-nav {
  padding: 0 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.nav-item:hover {
  background: #f0ece6;
  color: #333;
}
.nav-item.active {
  background: #ebe7e0;
  color: #1a1a1a;
  font-weight: 600;
}
.nav-badge {
  margin-left: auto;
  background: #e8e4df;
  color: #666;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
}

.sidebar-divider {
  height: 1px;
  background: #e8e4df;
  margin: 8px 16px;
}

.sidebar-threads {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}
.thread-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  padding: 8px 12px 4px;
  letter-spacing: 0.3px;
}
.thread-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.thread-item:hover {
  background: #f0ece6;
}
.thread-item.active {
  background: #ebe7e0;
}
.thread-icon {
  color: #999;
  font-size: 16px;
  flex-shrink: 0;
}
.thread-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.thread-name {
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thread-item.active .thread-name {
  font-weight: 600;
}
.thread-time {
  font-size: 11px;
  color: #aaa;
}

.thread-action-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #999;
}
.thread-item:hover .thread-action-btn {
  opacity: 1;
}
.thread-action-btn:hover {
  background: #fceceb;
  color: #ff4d4f;
  transform: scale(1.05);
}
.thread-delete-icon {
  font-size: 16px;
}


.sidebar-spacer {
  flex: 1;
}
.sidebar-footer {
  padding: 8px;
  border-top: 1px solid #e8e4df;
}
.thread-empty {
  font-size: 12px;
  color: #bbb;
  padding: 16px 16px;
  text-align: center;
  line-height: 1.6;
}
</style>
