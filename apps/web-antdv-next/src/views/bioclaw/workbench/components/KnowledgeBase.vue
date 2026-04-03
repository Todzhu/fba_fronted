<template>
  <div class="kb-page">
    <!-- 顶部工具栏 -->
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">知识库</h2>
        <span class="page-desc">为 AI Agent 提供专业上下文支撑</span>
      </div>
      <div class="topbar-right">
        <button class="btn-primary" @click="showUploadModal = true">
          <IconifyIcon icon="ant-design:upload-outlined" />
          上传文档
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <IconifyIcon :icon="tab.icon" />
        {{ tab.label }}
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="page-content">
      <!-- 公司知识库 -->
      <div v-if="activeTab === 'company'" class="kb-grid">
        <div v-for="item in companyDocs" :key="item.id" class="kb-card">
          <div class="kb-card-icon" :style="{ background: item.color }">
            <IconifyIcon :icon="item.icon" style="font-size: 22px; color: #fff;" />
          </div>
          <div class="kb-card-body">
            <h4 class="kb-card-title">{{ item.title }}</h4>
            <p class="kb-card-desc">{{ item.desc }}</p>
            <div class="kb-card-meta">
              <span>{{ item.fileCount }} 个文档</span>
              <span class="dot">·</span>
              <span>{{ item.updateTime }}</span>
            </div>
          </div>
          <div class="kb-card-badge">只读</div>
        </div>
      </div>

      <!-- 个人知识库 -->
      <div v-else class="kb-grid">
        <div v-for="item in personalDocs" :key="item.id" class="kb-card">
          <div class="kb-card-icon" :style="{ background: item.color }">
            <IconifyIcon :icon="item.icon" style="font-size: 22px; color: #fff;" />
          </div>
          <div class="kb-card-body">
            <h4 class="kb-card-title">{{ item.title }}</h4>
            <p class="kb-card-desc">{{ item.desc }}</p>
            <div class="kb-card-meta">
              <span>{{ item.fileCount }} 个文档</span>
              <span class="dot">·</span>
              <span>{{ item.updateTime }}</span>
            </div>
          </div>
          <button class="kb-card-action" title="删除">
            <IconifyIcon icon="ant-design:delete-outlined" />
          </button>
        </div>

        <!-- 空状态 -->
        <div class="kb-card kb-card-add" @click="showUploadModal = true">
          <IconifyIcon icon="ant-design:plus-outlined" style="font-size: 32px; color: #bbb;" />
          <span class="add-text">上传文档</span>
        </div>
      </div>
    </div>

    <!-- 上传弹窗 -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>上传知识文档</h3>
            <button class="modal-close" @click="showUploadModal = false">
              <IconifyIcon icon="ant-design:close-outlined" />
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-zone" @dragover.prevent @drop.prevent>
              <IconifyIcon icon="ant-design:cloud-upload-outlined" style="font-size: 40px; color: #bbb;" />
              <p class="upload-hint">拖拽文件到此处，或点击选择</p>
              <p class="upload-formats">支持 PDF、TXT、Markdown、DOCX 格式</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showUploadModal = false">取消</button>
            <button class="btn-confirm">开始上传</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconifyIcon } from '@vben/icons';

const activeTab = ref('company');
const showUploadModal = ref(false);

const tabs = [
  { id: 'company', icon: 'ant-design:bank-outlined', label: '公司知识库', count: 4 },
  { id: 'personal', icon: 'ant-design:user-outlined', label: '个人知识库', count: 3 },
];

const companyDocs = [
  { id: 1, title: '标准生信分析协议 (SOP)', desc: '涵盖 RNA-seq、scRNA-seq、WES 等标准分析流程规范', icon: 'ant-design:file-protect-outlined', color: 'linear-gradient(135deg, #667eea, #764ba2)', fileCount: 12, updateTime: '3 天前' },
  { id: 2, title: '公共数据库说明文档', desc: 'GEO、TCGA、UniProt、KEGG 等数据库的查询与下载指南', icon: 'ant-design:database-outlined', color: 'linear-gradient(135deg, #f093fb, #f5576c)', fileCount: 8, updateTime: '1 周前' },
  { id: 3, title: 'Skills 使用教程', desc: '所有已发布 Skills 的参数说明与输入输出规范', icon: 'ant-design:read-outlined', color: 'linear-gradient(135deg, #4facfe, #00f2fe)', fileCount: 15, updateTime: '2 天前' },
  { id: 4, title: '常见问题与最佳实践', desc: '分析过程中的常见报错处理与优化建议汇总', icon: 'ant-design:question-circle-outlined', color: 'linear-gradient(135deg, #43e97b, #38f9d7)', fileCount: 6, updateTime: '5 天前' },
];

const personalDocs = [
  { id: 1, title: '参考文献合集', desc: '近期阅读的肿瘤免疫微环境相关文献', icon: 'ant-design:file-pdf-outlined', color: 'linear-gradient(135deg, #e8503a, #d4412d)', fileCount: 23, updateTime: '1 小时前' },
  { id: 2, title: '分析笔记', desc: '个人分析经验记录与调参心得', icon: 'ant-design:edit-outlined', color: 'linear-gradient(135deg, #ffa726, #fb8c00)', fileCount: 5, updateTime: '昨天' },
  { id: 3, title: '历史报告归档', desc: '自动归档的分析报告与关键结论', icon: 'ant-design:folder-outlined', color: 'linear-gradient(135deg, #66bb6a, #43a047)', fileCount: 11, updateTime: '3 天前' },
];
</script>

<style scoped>
.kb-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; }

.page-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid #e8e4df; }
.topbar-left { display: flex; align-items: baseline; gap: 12px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-desc { font-size: 13px; color: #999; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.btn-primary:hover { background: #333; }

.tab-bar { display: flex; gap: 4px; padding: 12px 28px 0; border-bottom: 1px solid #e8e4df; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; color: #888; cursor: pointer; transition: all 0.2s; }
.tab-item:hover { color: #555; }
.tab-item.active { color: #1a1a1a; font-weight: 600; border-bottom-color: #e8503a; }
.tab-count { font-size: 11px; background: #e8e4df; color: #666; padding: 1px 6px; border-radius: 8px; }

.page-content { flex: 1; overflow-y: auto; padding: 24px 28px; }

.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }

.kb-card { position: relative; display: flex; gap: 16px; background: #fff; border: 1px solid #e8e4df; border-radius: 14px; padding: 20px; cursor: pointer; transition: all 0.2s; }
.kb-card:hover { border-color: #d0ccc4; box-shadow: 0 4px 16px rgba(0,0,0,0.05); transform: translateY(-1px); }
.kb-card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kb-card-body { flex: 1; min-width: 0; }
.kb-card-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 6px; }
.kb-card-desc { font-size: 12px; color: #999; margin: 0 0 10px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.kb-card-meta { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #bbb; }
.dot { font-size: 8px; }
.kb-card-badge { position: absolute; top: 12px; right: 12px; font-size: 10px; background: #f0ece6; color: #999; padding: 2px 8px; border-radius: 6px; }
.kb-card-action { position: absolute; top: 12px; right: 12px; background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; border-radius: 6px; opacity: 0; transition: all 0.15s; }
.kb-card:hover .kb-card-action { opacity: 1; }
.kb-card-action:hover { color: #e8503a; background: #fef0ed; }

.kb-card-add { flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-style: dashed; min-height: 120px; }
.kb-card-add:hover { border-color: #bbb; }
.add-text { font-size: 13px; color: #bbb; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: #fff; border-radius: 16px; width: 480px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0ece6; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.modal-close { background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: #f0ece6; color: #333; }
.modal-body { padding: 24px; }
.upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px; border: 2px dashed #e0ddd8; border-radius: 12px; background: #faf8f5; cursor: pointer; transition: border-color 0.2s; }
.upload-zone:hover { border-color: #bbb; }
.upload-hint { font-size: 14px; color: #666; margin: 0; }
.upload-formats { font-size: 12px; color: #bbb; margin: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f0ece6; }
.btn-cancel { padding: 8px 20px; border: 1px solid #e0ddd8; border-radius: 10px; background: #fff; color: #666; font-size: 13px; cursor: pointer; }
.btn-cancel:hover { background: #f0ece6; }
.btn-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-confirm:hover { background: #333; }
</style>
