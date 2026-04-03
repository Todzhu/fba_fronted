<template>
  <div class="auto-page">
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">自动化任务</h2>
        <span class="page-desc">无人值守的智能分析调度</span>
      </div>
      <div class="topbar-right">
        <button class="btn-primary" @click="showCreateModal = true"><IconifyIcon icon="ant-design:plus-outlined" /> 新建任务</button>
      </div>
    </div>
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id" class="tab-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <IconifyIcon :icon="tab.icon" /> {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>
    <div class="page-content">
      <div class="task-list">
        <div v-for="task in filteredTasks" :key="task.id" class="task-card">
          <div class="task-status-dot" :class="task.enabled ? 'dot-active' : 'dot-inactive'"></div>
          <div class="task-body">
            <div class="task-header">
              <h4 class="task-name">{{ task.name }}</h4>
              <span class="task-type-badge" :class="'type-' + task.type">{{ typeLabel(task.type) }}</span>
            </div>
            <p class="task-desc">{{ task.desc }}</p>
            <div class="task-meta">
              <span><IconifyIcon icon="ant-design:clock-circle-outlined" style="font-size: 12px;" /> {{ task.schedule }}</span>
              <span class="dot">·</span>
              <span>上次运行: {{ task.lastRun }}</span>
            </div>
          </div>
          <div class="task-actions">
            <label class="toggle-switch">
              <input type="checkbox" :checked="task.enabled" @change="task.enabled = !task.enabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
    <!-- 新建弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-box">
          <div class="modal-header"><h3>新建自动化任务</h3><button class="modal-close" @click="showCreateModal = false"><IconifyIcon icon="ant-design:close-outlined" /></button></div>
          <div class="modal-body">
            <label class="form-label">任务名称</label>
            <input class="form-input" placeholder="例如：每周 GEO 新数据检查" />
            <label class="form-label" style="margin-top: 16px;">触发方式</label>
            <select class="form-input"><option>Cron（定时触发）</option><option>Hooks（事件触发）</option><option>Heartbeat（持续监控）</option></select>
            <label class="form-label" style="margin-top: 16px;">描述</label>
            <textarea class="form-textarea" rows="3" placeholder="任务描述..."></textarea>
          </div>
          <div class="modal-footer"><button class="btn-cancel" @click="showCreateModal = false">取消</button><button class="btn-confirm" @click="showCreateModal = false">创建</button></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IconifyIcon } from '@vben/icons';
const activeTab = ref('all');
const showCreateModal = ref(false);
const tabs = [
  { id: 'all', icon: 'ant-design:unordered-list-outlined', label: '全部', count: 4 },
  { id: 'cron', icon: 'ant-design:clock-circle-outlined', label: 'Cron', count: 2 },
  { id: 'hooks', icon: 'ant-design:thunderbolt-outlined', label: 'Hooks', count: 1 },
  { id: 'heartbeat', icon: 'ant-design:heart-outlined', label: 'Heartbeat', count: 1 },
];
const tasks = ref([
  { id: 1, name: 'GEO 新数据集检查', type: 'cron', desc: '每周一自动检查 GEO 是否有新数据集', schedule: '每周一 08:00', lastRun: '3 天前', enabled: true },
  { id: 2, name: '自动质控', type: 'hooks', desc: '用户上传新文件到云盘时自动触发 FastQC 质控', schedule: '文件上传触发', lastRun: '2 小时前', enabled: true },
  { id: 3, name: '任务状态监控', type: 'heartbeat', desc: '监控分析任务执行状态，异常时发送通知', schedule: '每 5 分钟', lastRun: '5 分钟前', enabled: true },
  { id: 4, name: '周报自动生成', type: 'cron', desc: '每周五自动汇总本周分析结果生成报告', schedule: '每周五 17:00', lastRun: '5 天前', enabled: false },
]);
const filteredTasks = computed(() => activeTab.value === 'all' ? tasks.value : tasks.value.filter(t => t.type === activeTab.value));
function typeLabel(type: string) { return { cron: '定时', hooks: '事件', heartbeat: '监控' }[type] || type; }
</script>

<style scoped>
.auto-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; }
.page-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid #e8e4df; }
.topbar-left { display: flex; align-items: baseline; gap: 12px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-desc { font-size: 13px; color: #999; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #333; }
.tab-bar { display: flex; gap: 4px; padding: 12px 28px 0; border-bottom: 1px solid #e8e4df; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; color: #888; cursor: pointer; transition: all 0.2s; }
.tab-item.active { color: #1a1a1a; font-weight: 600; border-bottom-color: #e8503a; }
.tab-count { font-size: 11px; background: #e8e4df; color: #666; padding: 1px 6px; border-radius: 8px; }
.page-content { flex: 1; overflow-y: auto; padding: 24px 28px; }
.task-list { display: flex; flex-direction: column; gap: 14px; }
.task-card { display: flex; gap: 16px; background: #fff; border: 1px solid #e8e4df; border-radius: 14px; padding: 20px; transition: all 0.2s; align-items: flex-start; }
.task-card:hover { border-color: #d0ccc4; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.task-status-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.dot-active { background: #43a047; box-shadow: 0 0 6px rgba(67,160,71,0.4); }
.dot-inactive { background: #ccc; }
.task-body { flex: 1; }
.task-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.task-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0; }
.task-type-badge { font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 500; }
.type-cron { background: #e3f2fd; color: #1976d2; }
.type-hooks { background: #fff3e0; color: #e65100; }
.type-heartbeat { background: #fce4ec; color: #c62828; }
.task-desc { font-size: 13px; color: #888; margin: 0 0 8px; }
.task-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #bbb; }
.dot { font-size: 8px; }
.task-actions { flex-shrink: 0; }
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; inset: 0; background: #ccc; border-radius: 22px; cursor: pointer; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s; }
.toggle-switch input:checked + .toggle-slider { background: #43a047; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: #fff; border-radius: 16px; width: 460px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0ece6; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.modal-close { background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-body { padding: 24px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.form-input, .form-textarea { width: 100%; padding: 10px 14px; border: 1px solid #e0ddd8; border-radius: 10px; font-size: 14px; color: #333; outline: none; background: #faf8f5; box-sizing: border-box; }
.form-input:focus, .form-textarea:focus { border-color: #bbb; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.form-textarea { resize: vertical; font-family: inherit; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f0ece6; }
.btn-cancel { padding: 8px 20px; border: 1px solid #e0ddd8; border-radius: 10px; background: #fff; color: #666; font-size: 13px; cursor: pointer; }
.btn-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
</style>
