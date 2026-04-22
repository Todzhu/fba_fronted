<template>
  <div class="chat-wrap">
    <!-- 项目上下文条 -->
    <div class="project-context-bar">
      <div class="topbar-left">
        <div v-if="messages.length > 0" class="topbar-project-wrapper">
          <div class="topbar-project-selector" @click.stop="toggleProjectDropdown">
            <IconifyIcon icon="ant-design:folder-outlined" class="proj-icon" />
            <span class="proj-name">{{ currentProject ? currentProject.name : '未选择项目' }}</span>
            <IconifyIcon icon="ant-design:down-outlined" class="proj-caret" :class="{ rotated: showProjectDropdown }" />
          </div>
          <div v-if="showProjectDropdown" class="topbar-project-dropdown">
            <div class="dropdown-section-title">最近项目</div>
            <div v-for="p in projects" :key="p.id" class="dropdown-item" :class="{ active: currentProject?.id === p.id }" @click.stop="selectProject(p)">
              <IconifyIcon icon="ant-design:folder-filled" class="item-folder-icon" />
              <span>{{ p.name }}</span>
              <span class="item-threads">{{ p.thread_count || 0 }} 线程</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item new-proj-item" @click.stop="showCreateProject = true; showProjectDropdown = false">
              <IconifyIcon icon="ant-design:plus-outlined" />
              <span>新建项目</span>
            </div>
          </div>
        </div>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn" :disabled="isGenerating" @click="showExportModal = true">
          <IconifyIcon icon="ant-design:export-outlined" /> 导出报告
        </button>
        <button v-if="isGenerating" class="topbar-btn stop-btn" @click="stopGenerating">
          <IconifyIcon icon="ant-design:stop-outlined" /> 停止生成
        </button>
        <button v-else class="topbar-btn" :disabled="messages.length === 0">
          <IconifyIcon icon="ant-design:reload-outlined" /> 重跑
        </button>
        <button class="topbar-btn" :class="{ active: isPanelOpen }" @click="$emit('toggle-panel')">
          <IconifyIcon icon="ant-design:bar-chart-outlined" /> 结果面板
        </button>
      </div>
    </div>

    <!-- 内联选项目提示条（移到顶部并作为居中卡片） -->
    <div v-if="showProjectPrompt" class="project-prompt-bar">
      <IconifyIcon icon="ant-design:info-circle-outlined" class="prompt-icon" />
      <span>分析结果需要归属一个项目才能保存</span>
      <div class="prompt-actions">
        <button class="prompt-btn" @click.stop="showProjectDropdown = true; showProjectPrompt = false">选择</button>
        <button class="prompt-btn primary" @click.stop="showCreateProject = true; showProjectPrompt = false">新建</button>
      </div>
    </div>

    <!-- 欢迎 / 对话区域 -->
    <div class="chat-content" ref="chatContainer">
      <div v-if="messages.length === 0" class="welcome-area">

        <!-- 图标 -->
        <div class="welcome-icon">
          <IconifyIcon icon="ant-design:experiment-outlined" style="font-size: 48px; color: #888;" />
        </div>
        <h1 class="welcome-title">开始分析</h1>

        <!-- 居中项目选择器 -->
        <div class="center-project-wrapper">
          <div class="center-project-selector" @click.stop="toggleProjectDropdown">
            <IconifyIcon icon="ant-design:folder-outlined" class="proj-icon" />
            <span class="proj-name">{{ currentProject ? currentProject.name : '未选择项目' }}</span>
            <IconifyIcon icon="ant-design:down-outlined" class="proj-caret" :class="{ rotated: showProjectDropdown }" />
          </div>
          <div v-if="showProjectDropdown" class="center-project-dropdown">
            <div class="dropdown-section-title">最近项目</div>
            <div
              v-for="p in projects"
              :key="p.id"
              class="dropdown-item"
              :class="{ active: currentProject?.id === p.id }"
              @click.stop="selectProject(p)"
            >
              <IconifyIcon icon="ant-design:folder-filled" class="item-folder-icon" />
              <span>{{ p.name }}</span>
              <span class="item-threads">{{ p.thread_count || 0 }} 线程</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item new-proj-item" @click.stop="showCreateProject = true; showProjectDropdown = false">
              <IconifyIcon icon="ant-design:plus-outlined" />
              <span>新建项目</span>
            </div>
          </div>
        </div>

        <!-- Explore more -->
        <div class="explore-more">
          Explore more
          <IconifyIcon icon="ant-design:right-outlined" style="font-size: 12px;" />
        </div>

        <!-- 快速操作卡片 -->
        <div class="quick-cards">
          <div class="quick-card">
            <div class="card-icon">
              <IconifyIcon icon="ant-design:scissor-outlined" style="font-size: 24px;" />
            </div>
            <p class="card-desc">对 RNA-seq 数据进行差异表达分析，生成火山图与热力图</p>
          </div>
          <div class="quick-card">
            <div class="card-icon">
              <IconifyIcon icon="ant-design:bar-chart-outlined" style="font-size: 24px;" />
            </div>
            <p class="card-desc">进行 GSEA 基因集富集分析，输出通路排序报告</p>
          </div>
          <div class="quick-card">
            <div class="card-icon">
              <IconifyIcon icon="ant-design:dot-chart-outlined" style="font-size: 24px;" />
            </div>
            <p class="card-desc">绘制 PCA 主成分图与样本相关性矩阵</p>
          </div>
        </div>
      </div>
      
      <!-- 气泡消息列表 -->
      <div v-else class="message-list">
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="msg-row"
          :class="msg.role === 'user' ? 'msg-user' : 'msg-assistant'"
        >
          <!-- 助理头像 -->
          <div v-if="msg.role === 'assistant'" class="assistant-avatar">
            <IconifyIcon icon="ant-design:robot-filled" style="font-size: 19px; color: #fff;" />
          </div>

          <!-- 内容气泡 -->
          <div v-if="msg.content" class="msg-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
          <div v-else-if="msg.role === 'assistant'" class="msg-bubble thinking-area">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入栏 -->
    <div class="chat-input-area">
      <div class="chat-input-inner">
        <!-- 文件标签 -->
        <div v-if="attachedFiles.length > 0" class="input-tags">
          <span
            v-for="f in attachedFiles"
            :key="f.name"
            class="input-tag file-tag"
          >
            <IconifyIcon icon="ant-design:file-outlined" style="font-size: 12px;" />
            {{ f.name }}
            <span class="tag-close" @click="removeFile(f.name)">×</span>
          </span>
        </div>

        <!-- 输入框 -->
        <div class="input-bar">
          <label class="input-icon-btn" title="上传文件">
            <input type="file" multiple style="display:none" @change="onFileSelect" />
            <IconifyIcon icon="ant-design:paper-clip-outlined" />
          </label>
          <input
            class="input-field"
            type="text"
            v-model="inputValue"
            @keyup.enter="handleSend"
            :disabled="isGenerating"
            placeholder="输入分析需求，例如：帮我对这批RNA-seq数据做差异表达分析..."
          />
          <button class="send-btn" :disabled="isGenerating || !inputValue.trim()" @click="handleSend">
            <IconifyIcon icon="ant-design:send-outlined" />
          </button>
        </div>

        <!-- 底部工具栏 -->
        <div class="input-footer">
          <button class="footer-action" @click="openCloudPicker" title="从云盘选择文件">
            <IconifyIcon icon="ant-design:cloud-outlined" style="font-size: 13px;" />
            从云盘选择
          </button>
        </div>
      </div>
    </div>

    <!-- 新建项目弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateProject" class="modal-overlay" @click.self="showCreateProject = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>新建分析项目</h3>
            <button class="modal-close" @click="showCreateProject = false"><IconifyIcon icon="ant-design:close-outlined" /></button>
          </div>
          <div class="modal-body">
            <label class="form-label">项目名称 <span style="color:#e8503a">*</span></label>
            <input v-model="newProject.name" class="form-input" placeholder="例如：RNA-seq 肿瘤分析" @keyup.enter="createProjectAndSend" />
            <label class="form-label" style="margin-top: 16px;">项目描述</label>
            <textarea
              v-model="newProject.description"
              class="form-textarea"
              placeholder="简单描述项目目标和内容..."
              rows="3"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showCreateProject = false">取消</button>
            <button class="btn-confirm" :disabled="!newProject.name.trim()" @click="createProjectAndSend">创建并继续</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 云盘文件选择弹窗 -->
    <Teleport to="body">
      <div v-if="showCloudPicker" class="modal-overlay" @click.self="showCloudPicker = false">
        <div class="modal-box cloud-picker-box">
          <div class="modal-header">
            <div class="picker-nav">
              <IconifyIcon icon="ant-design:folder-outlined" style="color:#ffa726; font-size:16px;" />
              <span
                v-for="(seg, i) in cloudPathSegments"
                :key="i"
                class="picker-bread"
                :class="{ active: i === cloudPathSegments.length - 1 }"
                @click="navigateCloudPath(i)"
              >
                <IconifyIcon v-if="i>0" icon="ant-design:right-outlined" style="font-size:10px; color:#ccc; margin:0 4px" />
                {{ seg }}
              </span>
            </div>
            <button class="modal-close" @click="showCloudPicker = false">
              <IconifyIcon icon="ant-design:close-outlined" />
            </button>
          </div>
          <div class="picker-body">
            <div
              v-for="file in cloudFiles"
              :key="file.name"
              class="picker-row"
              :class="{ selected: selectedCloudFiles.includes(file.name), 'is-dir': file.isDir }"
              @click="file.isDir ? enterCloudDir(file) : toggleCloudFile(file.name)"
            >
              <IconifyIcon
                :icon="file.isDir ? 'ant-design:folder-filled' : 'ant-design:file-outlined'"
                :style="{ color: file.isDir ? '#ffa726' : '#aaa', fontSize: '16px' }"
              />
              <span class="picker-filename">{{ file.name }}</span>
              <span v-if="!file.isDir" class="picker-size">{{ file.size }}</span>
              <div class="picker-check" :class="{ checked: selectedCloudFiles.includes(file.name) }" @click.stop="toggleCloudFile(file.name)">
                <IconifyIcon v-if="selectedCloudFiles.includes(file.name)" icon="ant-design:check-outlined" style="font-size:11px;color:#fff" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <span class="picker-selected-count">{{ selectedCloudFiles.length > 0 ? `已选 ${selectedCloudFiles.length} 项` : '' }}</span>
            <button class="btn-cancel" @click="showCloudPicker = false">取消</button>
            <button class="btn-confirm" :disabled="selectedCloudFiles.length === 0" @click="confirmCloudFiles">确认选择 ({{ selectedCloudFiles.length }})</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { IconifyIcon } from '@vben/icons';
import { message } from 'antdv-next';
import MarkdownIt from 'markdown-it';
import {
  getProjects,
  createProject,
  createThread,
  getMessages,
  streamChat,
} from '#/api/bioclaw';

const md = new MarkdownIt({ html: true, linkify: true, breaks: true });

const props = defineProps<{
  isPanelOpen: boolean;
  newThreadTrigger?: number;
}>();
defineEmits(['toggle-panel']);

// 监听触发器，替代跨组件方法调用
watch(
  () => props.newThreadTrigger,
  (val) => {
    if (val === undefined || val === 0) return;
    handleNewThreadInternal();
  }
);

function handleNewThreadInternal() {
  if (messages.value.length === 0 && !threadId.value && inputValue.value === '' && attachedFiles.value.length === 0) {
    message.info('当前已是全新对话，直接输入即可开始');
    return;
  }
  messages.value = [];
  threadId.value = null;
  attachedFiles.value = [];
  inputValue.value = '';
  showProjectPrompt.value = false;
  if (!currentProject.value) {
    setTimeout(() => { showProjectDropdown.value = true; }, 50);
  }
}

// --- 项目状态 ---
interface Project { id: number; name: string; thread_count?: number; }
const projects = ref<Project[]>([]);
const currentProject = ref<Project | null>(null);
const showProjectDropdown = ref(false);
const showProjectPrompt = ref(false);
const showCreateProject = ref(false);
const newProject = ref({ name: '', description: '' });

// --- 对话状态 ---
const inputValue = ref('');
const isGenerating = ref(false);
const threadId = ref<number | null>(null);
const messages = ref<{ id: number; role: 'user' | 'assistant'; content: string; metadata_json?: string }[]>([]);
const chatContainer = ref<HTMLElement | null>(null);

// --- 文件附件 ---
const attachedFiles = ref<File[]>([]);

// --- 导出 ---
const showExportModal = ref(false);

// --- 云盘文件选择器 ---
import { getMyDataFiles, type FileItem } from '#/api/my-data';

interface CloudFile { id: number; name: string; isDir: boolean; size?: string; parentId?: number | null; }
const showCloudPicker = ref(false);
const selectedCloudFiles = ref<string[]>([]);
const cloudFiles = ref<CloudFile[]>([]);
const cloudLoading = ref(false);

// 文件夹导航栈: [{id, name}]
const cloudNavStack = ref<{ id: number | null; name: string }[]>([]);
const cloudCurrentParentId = computed(() => {
  if (cloudNavStack.value.length === 0) return undefined;
  return cloudNavStack.value[cloudNavStack.value.length - 1]!.id ?? undefined;
});

const cloudPathSegments = computed(() => {
  return ['根目录', ...cloudNavStack.value.map(s => s.name)];
});

function formatCloudSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

async function loadCloudFiles() {
  cloudLoading.value = true;
  try {
    const res = await getMyDataFiles({
      parent_id: cloudCurrentParentId.value as number | undefined,
    });
    cloudFiles.value = res.items.map((item: FileItem) => ({
      id: item.id,
      name: item.name,
      isDir: item.type === 'folder',
      size: item.type === 'folder' ? undefined : formatCloudSize(item.size),
      parentId: item.parent_id,
    }));
  } catch (error) {
    console.error('加载云盘文件失败', error);
    cloudFiles.value = [];
  } finally {
    cloudLoading.value = false;
  }
}

function openCloudPicker() {
  selectedCloudFiles.value = [];
  cloudNavStack.value = [];
  showCloudPicker.value = true;
  loadCloudFiles();
}

function navigateCloudPath(index: number) {
  if (index === 0) {
    cloudNavStack.value = [];
  } else {
    cloudNavStack.value = cloudNavStack.value.slice(0, index);
  }
  loadCloudFiles();
}

function enterCloudDir(file: CloudFile) {
  cloudNavStack.value.push({ id: file.id, name: file.name });
  loadCloudFiles();
}

function toggleCloudFile(name: string) {
  const idx = selectedCloudFiles.value.indexOf(name);
  if (idx === -1) selectedCloudFiles.value.push(name);
  else selectedCloudFiles.value.splice(idx, 1);
}

function confirmCloudFiles() {
  // 将选中的云盘文件路径作为「云盘标签」加入 attachedFiles（用特殊标记区分）
  for (const name of selectedCloudFiles.value) {
    // 构建完整路径
    const pathParts = cloudNavStack.value.map(s => s.name);
    const fullPath = '/' + [...pathParts, name].join('/');
    // 用 File 对象模拟（path 存于 name 字段，size=0）
    const fake = new File([], fullPath, { type: 'cloud' });
    if (!attachedFiles.value.find(f => f.name === fullPath)) {
      attachedFiles.value.push(fake);
    }
  }
  showCloudPicker.value = false;
  selectedCloudFiles.value = [];
}

// --- 停止生成（AbortController）---
let abortController: AbortController | null = null;

function stopGenerating() {
  abortController?.abort();
  isGenerating.value = false;
}

// --- 关闭下拉（点击外部）---
function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.topbar-project-selector') && !target.closest('.center-project-selector') && !target.closest('.project-dropdown')) {
    showProjectDropdown.value = false;
  }
}
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  fetchProjects();
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// --- 获取项目列表 ---
async function fetchProjects() {
  try {
    const data = await getProjects();
    if (Array.isArray(data)) {
      projects.value = data as any;
      if (!currentProject.value && data.length > 0) {
        currentProject.value = data[0] as any;
      }
    }
  } catch (e) {
    console.error('获取项目列表失败', e);
  }
}

function toggleProjectDropdown() {
  showProjectDropdown.value = !showProjectDropdown.value;
}

function selectProject(p: Project) {
  currentProject.value = p;
  showProjectDropdown.value = false;
  threadId.value = null; // 切换项目 → 重置线程
  messages.value = [];
}

// 文件附件
function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    attachedFiles.value.push(...Array.from(input.files));
  }
}
function removeFile(name: string) {
  attachedFiles.value = attachedFiles.value.filter(f => f.name !== name);
}

// 新建项目并继续发送
async function createProjectAndSend() {
  if (!newProject.value.name.trim()) return;
  try {
    const data = await createProject({
      name: newProject.value.name,
      description: newProject.value.description
    });
    if (data) {
      projects.value.unshift(data as any);
      currentProject.value = data as any;
      showCreateProject.value = false;
      newProject.value = { name: '', description: '' };
      message.success('创建成功');
      await sendMessage();
    }
  } catch (e: any) {
    console.error('创建项目失败', e);
  }
}

// handleSend：入口，检查项目
async function handleSend() {
  const text = inputValue.value.trim();
  if (!text || isGenerating.value) return;
  if (!currentProject.value) {
    showProjectPrompt.value = true;
    return;
  }
  await sendMessage();
}

// --- 核心方法 ---
async function sendMessage() {
  const text = inputValue.value.trim();
  if (!text || isGenerating.value) return;

  const pid = currentProject.value?.id;

  // 第一步：自动创建 Thread
  if (!threadId.value) {
    if (!pid) {
      messages.value.push({ id: Date.now(), role: 'assistant', content: '[系统错误] 请先选择一个项目' });
      return;
    }
    try {
      const data = await createThread(pid, text.substring(0, 20) || '新对话');
      if (data) {
        threadId.value = (data as any).id;
      } else {
        messages.value.push({ id: Date.now(), role: 'assistant', content: '[系统错误] 新建线程失败' });
        return;
      }
    } catch (e) {
      messages.value.push({ id: Date.now(), role: 'assistant', content: '[网络错误] 访问接口失败' });
      return;
    }
  }

  // 渲染用户发言
  const currentMsgId = Date.now();
  const filePaths = attachedFiles.value.map(f => f.name);
  messages.value.push({
    id: currentMsgId,
    role: 'user',
    content: text,
    metadata_json: filePaths.length > 0 ? JSON.stringify({ files: filePaths }) : undefined
  });
  inputValue.value = '';
  // 发送后不清空附件（用户要求保持显示）
  isGenerating.value = true;
  await scrollToBottom();

  // 占位一个空的 Assistant 响应气泡
  const assistantMsgId = Date.now() + 1;
  messages.value.push({
    id: assistantMsgId,
    role: 'assistant',
    content: ''
  });
  const assistantMsgIndex = messages.value.length - 1;

  try {
    // 创建 AbortController 并绑定到请求
    abortController = new AbortController();

    const response = await streamChat(threadId.value!, text, {
      files: filePaths.length > 0 ? filePaths : undefined,
      signal: abortController.signal,
    });

    if (!response.body) {
      throw new Error('ReadableStream API not supported.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (chunk.startsWith('data: ')) {
            const dataStr = chunk.slice(6);
            if (dataStr === '[DONE]') {
              done = true;
              break;
            }
            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.type === 'text' && dataObj.content) {
                const msg = messages.value[assistantMsgIndex];
                if (msg) msg.content += dataObj.content;
                scrollToBottom();
              } else if (dataObj.type === 'error') {
                const msg = messages.value[assistantMsgIndex];
                if (msg) msg.content += `\n\n**[Error]** ${dataObj.content}`;
              }
            } catch (e) {
              console.warn('解析 SSE Chunk 异常:', dataStr);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // 用户主动停止，不显示错误
      const msg = messages.value[assistantMsgIndex];
      if (msg && !msg.content) msg.content = '*(已停止生成)*';
    } else {
      console.error('流式调用失败', error);
      const msg = messages.value[assistantMsgIndex];
      if (msg) msg.content += `\n\n*(调用失败: ${String(error)})*`;
    }
  } finally {
    isGenerating.value = false;
    abortController = null;
    await scrollToBottom();
  }
}

// 辅助：生成并保护 Markdown HTML
function renderMarkdown(content: string) {
  if (!content) return '';
  return md.render(content);
}

async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

// =============================================
// 对外暴露：供 index.vue 通过 ref 直接调用
// =============================================

/** 新建对话：清空消息，重置 thread，保留或切换项目 */
function newThread(project?: Project) {
  messages.value = [];
  threadId.value = null;
  attachedFiles.value = [];
  inputValue.value = '';
  showProjectPrompt.value = false;

  if (project) {
    currentProject.value = project;
  } else if (!currentProject.value) {
    // 没有任何项目时，等事件冒泡结束后再打开下拉，避免被 handleOutsideClick 立即关闭
    nextTick(() => {
      showProjectDropdown.value = true;
    });
  }
}

/** 加载已有线程：设置项目 + 从接口拉取历史消息 */
async function loadThread(tid: number, project: Project) {
  currentProject.value = project;
  threadId.value = tid;
  messages.value = [];

  try {
    const data = await getMessages(tid);
    if (Array.isArray(data)) {
      messages.value = (data as any[]).map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content ?? '',
        metadata_json: m.metadata_json,
      }));
      await scrollToBottom();
    }
  } catch (e) {
    console.error('加载线程消息失败', e);
  }
}

defineExpose({ newThread, loadThread, currentProject });
</script>

<style scoped>
.chat-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* === 项目上下文条 === */
.project-context-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px 8px 20px;
  border-bottom: 1px solid #e8e4df;
  background: #faf8f5;
  gap: 8px;
  position: relative;
}
.center-project-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 16px;
}
.center-project-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: #fff;
  border: 1px solid #e8e4df;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.center-project-selector:hover {
  background: #faf8f5;
  border-color: #d0ccc4;
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
}
.proj-icon { color: #888; font-size: 16px; }
.proj-name { font-size: 14px; font-weight: 600; color: #333; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.proj-caret { color: #888; font-size: 11px; transition: transform 0.2s; }
.proj-caret.rotated { transform: rotate(180deg); }

.center-project-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid #e0ddd8;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  min-width: 240px;
  z-index: 100;
  overflow: hidden;
}

.topbar-project-wrapper { position: relative; }
.topbar-project-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.topbar-project-selector:hover { background: #ebe7e0; }
.topbar-project-selector .proj-icon { color: #aaa; font-size: 15px; }
.topbar-project-selector .proj-name { font-size: 13px; font-weight: 600; color: #333; max-width: 180px; }
.topbar-project-selector .proj-caret { color: #aaa; font-size: 10px; }

.topbar-project-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: #fff;
  border: 1px solid #e0ddd8;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  min-width: 240px;
  z-index: 100;
  overflow: hidden;
}
.dropdown-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  padding: 10px 14px 4px;
  letter-spacing: 0.3px;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.1s;
}
.dropdown-item:hover { background: #f5f2ed; }
.dropdown-item.active { background: #ebe7e0; font-weight: 600; }
.item-folder-icon { color: #ffa726; font-size: 15px; }
.item-threads { margin-left: auto; font-size: 11px; color: #bbb; }
.dropdown-divider { height: 1px; background: #f0ece6; margin: 4px 0; }
.new-proj-item { color: #555; }
.new-proj-item:hover { color: #e8503a; }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.topbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.topbar-btn:hover:not(:disabled) { background: #ebe7e0; color: #333; }
.topbar-btn.active { background: #ebe7e0; color: #333; font-weight: 600; }
.topbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stop-btn { color: #e8503a !important; }
.stop-btn:hover { background: #fef0ed !important; }

/* === Welcome / Chat Content === */
.chat-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.welcome-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 680px;
  width: 100%;
  margin-top: -60px; /* 微调视觉中心偏移 */
}

.welcome-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #f0ece6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.welcome-project {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #888;
  cursor: pointer;
  margin-bottom: 32px;
}

.explore-more {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  margin-bottom: 16px;
  align-self: flex-end;
}
.explore-more:hover {
  color: #666;
}

/* === Quick Cards === */
.quick-cards {
  display: flex;
  gap: 12px;
  width: 100%;
}
.quick-card {
  flex: 1;
  padding: 20px 16px;
  border: 1px solid #e8e4df;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.quick-card:hover {
  border-color: #ccc;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.card-icon {
  color: #888;
  margin-bottom: 12px;
}
.card-desc {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin: 0;
}

/* === Message List === */
.message-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1000px;
  gap: 32px;
  padding-bottom: 40px;
  margin: 0 auto;
}
.msg-row {
  display: flex;
  width: 100%;
}
.msg-user {
  justify-content: flex-end;
}
.msg-assistant {
  justify-content: flex-start;
  align-items: flex-start;
}
.assistant-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8503a 0%, #d4412d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  margin-top: 2px;
  box-shadow: 0 2px 8px rgba(228, 80, 58, 0.3);
}
.avatar-logo {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  font-family: 'Georgia', serif;
  letter-spacing: -0.5px;
  line-height: 1;
}

.msg-bubble {
  font-size: 15px;
  line-height: 1.7;
  word-wrap: break-word;
}

/* 思考动画：三个弹跳小圆点 */
.thinking-area {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 0;
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
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 用户气泡：现代风胶囊 */
.msg-user .msg-bubble {
  background: #f4f4f4;
  color: #1a1a1a;
  padding: 12px 20px;
  border-radius: 20px;
  max-width: 85%;
}
.msg-user .msg-bubble :deep(p) {
  margin: 0;
  color: #1a1a1a;
}

/* 助手气泡：裸文本排版形式（仿 ChatGPT/Claude） */
.msg-assistant .msg-bubble {
  background: transparent;
  color: #1a1a1a;
  max-width: calc(100% - 52px); /* 减去头像空间 */
  padding: 0;
}
.msg-assistant .msg-bubble :deep(p:last-child) {
  margin-bottom: 0;
}
.msg-assistant .msg-bubble :deep(pre),
.msg-assistant .msg-bubble :deep(code) {
  background: #f9f9f9;
  border-radius: 6px;
}
.msg-assistant .msg-bubble :deep(pre) {
  padding: 16px;
  overflow-x: auto;
  border: 1px solid #eee;
}

/* === Input Area === */
.history-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.history-file-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-bg-container-disabled);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--ant-color-text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.chat-input-area {
  padding: 12px 24px 16px;
  background: #faf8f5;
  border-top: 1px solid transparent;
}
.chat-input-inner {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.input-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 4px;
}
.input-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.skill-tag {
  background: #e8f0fe;
  color: #1a73e8;
}
.file-tag {
  background: #f0ece6;
  color: #666;
}
.tag-close {
  margin-left: 4px;
  cursor: pointer;
  opacity: 0.6;
}
.tag-close:hover {
  opacity: 1;
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e0ddd8;
  border-radius: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-bar:focus-within {
  border-color: #bbb;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
}

.input-icon-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  display: flex;
}
.input-icon-btn:hover {
  color: #555;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
  line-height: 1.6;
}
.input-field::placeholder {
  color: #bbb;
}

.send-btn {
  background: #1a1a1a;
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}
.send-btn:hover {
  background: #333;
}

.input-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 4px 0;
}
.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.footer-item:hover {
  background: #f0ece6;
  color: #666;
}
/* === 内联项目提示条 === */
.project-prompt-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #fffcf2;
  border: 1px solid #f0e8cc;
  border-radius: 12px;
  font-size: 13px;
  color: #666;
  margin: 16px auto 0; /* 居中并在上方留距 */
  max-width: fit-content;
  box-shadow: 0 4px 12px rgba(200, 160, 50, 0.05); /* 微微的暖色阴影 */
  z-index: 10;
}
.prompt-icon { color: #e8503a; font-size: 15px; flex-shrink: 0; }
.prompt-actions { display: flex; gap: 8px; margin-left: auto; }
.prompt-btn {
  padding: 5px 14px;
  border: 1px solid #e0ddd8;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.prompt-btn:hover { border-color: #bbb; }
.prompt-btn.primary { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.prompt-btn.primary:hover { background: #333; }

/* === 输入框底部工具栏 === */
.input-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 0 0;
}
.footer-action {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: 12px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.15s;
}
.footer-action:hover { background: #f0ece6; color: #666; }

/* === 弹窗 === */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: #fff; border-radius: 16px; width: 440px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0ece6; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.modal-close { background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: #f0ece6; color: #333; }
.modal-body { padding: 24px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.form-input { width: 100%; padding: 10px 14px; border: 1px solid #e0ddd8; border-radius: 10px; font-size: 14px; color: #333; outline: none; background: #faf8f5; box-sizing: border-box; }
.form-textarea { width: 100%; padding: 10px 14px; border: 1px solid #e0ddd8; border-radius: 10px; font-size: 14px; color: #333; outline: none; background: #faf8f5; box-sizing: border-box; resize: vertical; font-family: inherit; line-height: 1.5; }
.form-input:focus, .form-textarea:focus { border-color: #bbb; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f0ece6; }
.btn-cancel { padding: 8px 20px; border: 1px solid #e0ddd8; border-radius: 10px; background: #fff; color: #666; font-size: 13px; cursor: pointer; }
.btn-cancel:hover { background: #f0ece6; }
.btn-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-confirm:hover:not(:disabled) { background: #333; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

/* === 云盘选择器 === */
.cloud-picker-box { width: 560px !important; }
.picker-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  flex-wrap: wrap;
}
.picker-bread {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.15s;
}
.picker-bread:hover { color: #555; }
.picker-bread.active { color: #1a1a1a; font-weight: 600; cursor: default; }
.picker-body {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px 0;
}
.picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}
.picker-row:hover { background: #f5f2ed; }
.picker-row.selected { background: #fef8f5; }
.picker-row.is-dir:hover { background: #fff8f0; }
.picker-filename { flex: 1; font-size: 13px; color: #333; }
.picker-size { font-size: 12px; color: #bbb; }
.picker-check {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.picker-check.checked {
  background: #1a1a1a;
  border-color: #1a1a1a;
}
.picker-selected-count {
  font-size: 12px;
  color: #e8503a;
  margin-right: auto;
}
</style>
