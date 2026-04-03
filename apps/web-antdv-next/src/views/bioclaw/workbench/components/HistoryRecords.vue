<template>
  <div class="history-page">
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">历史记录</h2>
        <span class="page-desc">每一次分析都被完整记录</span>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <IconifyIcon icon="ant-design:search-outlined" class="search-icon" />
          <input v-model="searchKeyword" class="search-input" placeholder="搜索历史..." />
        </div>
      </div>
    </div>
    <div class="filter-bar">
      <button v-for="f in filters" :key="f.id" class="filter-chip" :class="{ active: activeFilter === f.id }" @click="activeFilter = f.id">{{ f.label }}</button>
    </div>
    <div class="page-content">
      <div class="history-list">
        <div v-for="item in records" :key="item.id" class="history-card">
          <div class="history-left">
            <div class="history-icon" :style="{ background: item.color }">
              <IconifyIcon :icon="item.icon" style="font-size: 18px; color: #fff;" />
            </div>
          </div>
          <div class="history-body">
            <div class="history-header">
              <h4 class="history-title">{{ item.title }}</h4>
              <span class="status-badge" :class="'status-' + item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <p class="history-desc">{{ item.desc }}</p>
            <div class="history-meta">
              <span><IconifyIcon icon="ant-design:clock-circle-outlined" style="font-size: 12px;" /> {{ item.time }}</span>
              <span class="dot">·</span>
              <span>{{ item.project }}</span>
              <span class="dot">·</span>
              <span>耗时 {{ item.duration }}</span>
            </div>
          </div>
          <div class="history-actions">
            <button class="action-btn" title="导出报告"><IconifyIcon icon="ant-design:export-outlined" /></button>
            <button class="action-btn" title="重跑"><IconifyIcon icon="ant-design:redo-outlined" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconifyIcon } from '@vben/icons';
const searchKeyword = ref('');
const activeFilter = ref('all');
const filters = [
  { id: 'all', label: '全部' }, { id: 'success', label: '✅ 成功' }, { id: 'running', label: '⏳ 运行中' }, { id: 'failed', label: '❌ 失败' },
];
function statusLabel(s: string) { return { success: '完成', running: '运行中', failed: '失败' }[s] || s; }
const records = ref([
  { id: 1, title: 'RNA-seq 差异表达分析', desc: '使用 DESeq2 对 6 个样本进行差异分析，检测到 18,603 个 DEGs', icon: 'ant-design:experiment-outlined', color: 'linear-gradient(135deg, #e8503a, #d4412d)', status: 'success', time: '10 分钟前', project: 'RNA-SEQ 肿瘤分析', duration: '3m 42s' },
  { id: 2, title: 'GSEA KEGG 富集分析', desc: '对上调基因集进行 KEGG 通路富集，发现 23 条显著通路', icon: 'ant-design:bar-chart-outlined', color: 'linear-gradient(135deg, #43e97b, #38f9d7)', status: 'success', time: '1 小时前', project: 'RNA-SEQ 肿瘤分析', duration: '1m 15s' },
  { id: 3, title: 'Seurat 单细胞聚类', desc: '对 10X 数据进行质控、聚类和 UMAP 降维，共 12,450 个细胞', icon: 'ant-design:cluster-outlined', color: 'linear-gradient(135deg, #667eea, #764ba2)', status: 'running', time: '进行中...', project: '单细胞测序项目', duration: '5m+' },
  { id: 4, title: 'KM 生存分析', desc: '基于 TCGA 临床数据生成 Kaplan-Meier 曲线', icon: 'ant-design:line-chart-outlined', color: 'linear-gradient(135deg, #4facfe, #00f2fe)', status: 'success', time: '昨天', project: 'RNA-SEQ 肿瘤分析', duration: '45s' },
  { id: 5, title: 'WES 变异检测', desc: '变异检测流程因参考基因组版本不匹配中断', icon: 'ant-design:api-outlined', color: 'linear-gradient(135deg, #f093fb, #f5576c)', status: 'failed', time: '2 天前', project: 'WES 临床样本', duration: '2m 10s' },
  { id: 6, title: '火山图 & 热力图生成', desc: '生成 Top50 差异基因热力图和火山图（交互式 HTML）', icon: 'ant-design:picture-outlined', color: 'linear-gradient(135deg, #ffa726, #fb8c00)', status: 'success', time: '2 天前', project: 'RNA-SEQ 肿瘤分析', duration: '28s' },
]);
</script>

<style scoped>
.history-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; }
.page-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid #e8e4df; }
.topbar-left { display: flex; align-items: baseline; gap: 12px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-desc { font-size: 13px; color: #999; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 7px 14px; background: #fff; border: 1px solid #e0ddd8; border-radius: 10px; }
.search-box:focus-within { border-color: #bbb; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.search-icon { color: #aaa; font-size: 15px; }
.search-input { border: none; outline: none; font-size: 13px; background: transparent; color: #333; width: 180px; }
.filter-bar { display: flex; gap: 8px; padding: 14px 28px; border-bottom: 1px solid #e8e4df; }
.filter-chip { padding: 6px 16px; border: 1px solid #e0ddd8; border-radius: 20px; background: #fff; font-size: 12px; color: #666; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { border-color: #bbb; }
.filter-chip.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.page-content { flex: 1; overflow-y: auto; padding: 24px 28px; }
.history-list { display: flex; flex-direction: column; gap: 14px; }
.history-card { display: flex; gap: 16px; background: #fff; border: 1px solid #e8e4df; border-radius: 14px; padding: 20px; transition: all 0.2s; }
.history-card:hover { border-color: #d0ccc4; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.history-icon { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.history-body { flex: 1; min-width: 0; }
.history-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.history-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0; }
.status-badge { font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 500; }
.status-success { background: #e8f5e9; color: #2e7d32; }
.status-running { background: #e3f2fd; color: #1565c0; }
.status-failed { background: #ffebee; color: #c62828; }
.history-desc { font-size: 13px; color: #888; margin: 0 0 8px; }
.history-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #bbb; }
.dot { font-size: 8px; }
.history-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: flex-start; }
.action-btn { background: none; border: 1px solid #e8e4df; color: #999; padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.action-btn:hover { color: #555; border-color: #bbb; background: #f0ece6; }
</style>
