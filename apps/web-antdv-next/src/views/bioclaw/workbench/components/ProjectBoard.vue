<template>
  <div class="project-board">
    <!-- 顶部工具栏 -->
    <div class="board-topbar">
      <div class="topbar-left">
        <h2 class="board-title">项目管理</h2>
        <span class="board-count">{{ filteredProjects.length }} 个项目</span>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <IconifyIcon icon="ant-design:search-outlined" class="search-icon" />
          <input
            v-model="searchKeyword"
            class="search-input"
            type="text"
            placeholder="搜索项目..."
          />
        </div>
        <button class="btn-new-project" @click="showCreateModal = true">
          <IconifyIcon icon="ant-design:plus-outlined" />
          新建项目
        </button>
      </div>
    </div>

    <!-- 项目卡片网格 -->
    <div class="board-content">
      <!-- 空状态 -->
      <div v-if="filteredProjects.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">
          <IconifyIcon icon="ant-design:folder-open-outlined" style="font-size: 48px; color: #ccc;" />
        </div>
        <p class="empty-text" v-if="searchKeyword">没有找到匹配的项目</p>
        <p class="empty-text" v-else>还没有创建任何项目</p>
        <button v-if="!searchKeyword" class="btn-new-project" @click="showCreateModal = true">
          <IconifyIcon icon="ant-design:plus-outlined" />
          创建第一个项目
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
      </div>

      <!-- 卡片列表 -->
      <div v-else class="project-grid">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="project-card"
          @click="enterProject(project)"
        >
          <!-- 卡片头部：图标 + 名称 -->
          <div class="card-header">
            <div class="card-icon-box">
              <IconifyIcon icon="ant-design:experiment-outlined" style="font-size: 20px;" />
            </div>
            <div class="card-title-area">
              <h3 class="card-title">{{ project.name }}</h3>
              <p class="card-path">
                <IconifyIcon icon="ant-design:folder-outlined" style="font-size: 12px;" />
                {{ project.workspace_subpath || '/projects/' + project.name }}
              </p>
            </div>
          </div>

          <!-- 卡片描述 -->
          <p class="card-desc">{{ project.description || '暂无描述' }}</p>

          <!-- 卡片底部统计 -->
          <div class="card-footer">
            <div class="card-stats">
              <span class="stat-item">
                <IconifyIcon icon="ant-design:message-outlined" style="font-size: 13px;" />
                {{ project.thread_count || 0 }} 个线程
              </span>
              <span class="stat-item">
                <IconifyIcon icon="ant-design:file-outlined" style="font-size: 13px;" />
                {{ project.file_count || 0 }} 个文件
              </span>
            </div>
            <span class="card-time">{{ formatTime(project.updated_time || project.created_time) }}</span>
          </div>

          <!-- 右上角操作按钮 -->
          <button class="card-delete-btn workspace-btn" @click.stop="router.push(`/agent/projects/${project.id}`)" title="管理工作区文件" style="right: 48px; border: 1px solid #e0ddd8; background: #faf8f5;">
            <IconifyIcon icon="ant-design:folder-open-outlined" />
          </button>
          <button class="card-delete-btn" @click.stop="confirmDelete(project)" title="删除项目">
            <IconifyIcon icon="ant-design:delete-outlined" />
          </button>
        </div>
      </div>
    </div>

    <!-- 新建项目弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>新建分析项目</h3>
            <button class="modal-close" @click="showCreateModal = false">
              <IconifyIcon icon="ant-design:close-outlined" />
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label">项目名称 <span class="required">*</span></label>
            <input
              v-model="newProject.name"
              class="form-input"
              type="text"
              placeholder="例如：RNA-seq 肿瘤分析"
              @keyup.enter="createProject"
            />
            <label class="form-label" style="margin-top: 16px;">项目描述</label>
            <textarea
              v-model="newProject.description"
              class="form-textarea"
              placeholder="简单描述项目目标和内容..."
              rows="3"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button class="btn-confirm" :disabled="!newProject.name.trim() || creating" @click="createProject">
              {{ creating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'antdv-next';
import { IconifyIcon } from '@vben/icons';
import {
  getProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
} from '#/api/bioclaw';

const emit = defineEmits(['enter-project']);

interface Project {
  id: number;
  name: string;
  description?: string;
  workspace_subpath?: string;
  thread_count?: number;
  file_count?: number;
  created_time?: string;
  updated_time?: string;
}

const router = useRouter();

const projects = ref<Project[]>([]);
const searchKeyword = ref('');
const loading = ref(false);
const showCreateModal = ref(false);
const creating = ref(false);
const newProject = ref({ name: '', description: '' });

const filteredProjects = computed(() => {
  if (!searchKeyword.value.trim()) return projects.value;
  const kw = searchKeyword.value.toLowerCase();
  return projects.value.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    (p.description || '').toLowerCase().includes(kw)
  );
});

// 获取项目列表
async function fetchProjects() {
  loading.value = true;
  try {
    const data = await getProjects();
    if (Array.isArray(data)) {
      projects.value = data as any;
    }
  } catch (e) {
    console.error('获取项目列表失败', e);
  } finally {
    loading.value = false;
  }
}

// 创建新项目
async function createProject() {
  if (!newProject.value.name.trim() || creating.value) return;
  creating.value = true;
  try {
    const data = await apiCreateProject({
      name: newProject.value.name,
      description: newProject.value.description
    });
    if (data) {
      projects.value.unshift(data as any);
      showCreateModal.value = false;
      newProject.value = { name: '', description: '' };
      message.success('创建成功');
    }
  } catch (e: any) {
    console.error('创建项目失败', e);
  } finally {
    creating.value = false;
  }
}

// 删除项目
async function confirmDelete(project: Project) {
  if (!confirm(`确定要删除项目「${project.name}」吗？此操作不可撤销。`)) return;
  try {
    await apiDeleteProject(project.id);
    projects.value = projects.value.filter(p => p.id !== project.id);
  } catch (e) {
    console.error('删除项目失败', e);
  }
}

// 进入项目 → 切换到对话页面
function enterProject(project: Project) {
  emit('enter-project', project);
}

// 格式化时间
function formatTime(timeStr?: string) {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

onMounted(fetchProjects);
</script>

<style scoped>
.project-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #faf8f5;
}

/* === 顶部工具栏 === */
.board-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 28px;
  border-bottom: 1px solid #e8e4df;
  background: #faf8f5;
}
.topbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.board-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.board-count {
  font-size: 13px;
  color: #999;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #e0ddd8;
  border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-box:focus-within {
  border-color: #bbb;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
}
.search-icon {
  color: #aaa;
  font-size: 15px;
}
.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: #333;
  width: 180px;
}
.search-input::placeholder {
  color: #bbb;
}

/* 新建按钮 */
.btn-new-project {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-new-project:hover {
  background: #333;
}

/* === 内容区 === */
.board-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
}
.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #f0ece6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-text {
  font-size: 15px;
  color: #999;
  margin: 0;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 80px 0;
}
.thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  animation: bounce 1.4s ease-in-out infinite both;
}
.thinking-dot:nth-child(1) { animation-delay: 0s; }
.thinking-dot:nth-child(2) { animation-delay: 0.16s; }
.thinking-dot:nth-child(3) { animation-delay: 0.32s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* === 项目卡片网格 === */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  position: relative;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 14px;
  padding: 22px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.project-card:hover {
  border-color: #d0ccc4;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}
.card-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, #fef0ed 0%, #fde8e3 100%);
  color: #e8503a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-title-area {
  flex: 1;
  min-width: 0;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 24px;
}
.card-path {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
  margin: 0;
}

.card-desc {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-stats {
  display: flex;
  gap: 14px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
}
.card-time {
  font-size: 12px;
  color: #bbb;
}

.card-delete-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: #ccc;
  font-size: 15px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
  opacity: 0;
}
.project-card:hover .card-delete-btn {
  opacity: 1;
}
.card-delete-btn:hover {
  color: #e8503a;
  background: #fef0ed;
}

/* === 弹窗 === */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #fff;
  border-radius: 16px;
  width: 460px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0ece6;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.modal-close {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.modal-close:hover {
  background: #f0ece6;
  color: #333;
}
.modal-body {
  padding: 24px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}
.required {
  color: #e8503a;
}
.form-input, .form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e0ddd8;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  outline: none;
  background: #faf8f5;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.form-input:focus, .form-textarea:focus {
  border-color: #bbb;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
}
.form-textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #f0ece6;
}
.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #e0ddd8;
  border-radius: 10px;
  background: #fff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover {
  background: #f0ece6;
}
.btn-confirm {
  padding: 8px 24px;
  border: none;
  border-radius: 10px;
  background: #1a1a1a;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-confirm:hover:not(:disabled) {
  background: #333;
}
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
