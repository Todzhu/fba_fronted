<template>
  <div class="panel-wrap">
    <!-- 面板头部 -->
    <div class="panel-header">
      <span class="panel-title">结果看板</span>
      <button class="panel-close" @click="$emit('close')">
        <IconifyIcon icon="ant-design:close-outlined" />
      </button>
    </div>

    <!-- Tabs -->
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <IconifyIcon :icon="tab.icon" style="font-size: 14px;" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="panel-content">
      <!-- 可视化 Tab -->
      <div v-if="activeTab === 'viz'" class="tab-pane">
        <!-- 火山图 -->
        <div class="viz-card">
          <div class="viz-card-header">
            <span class="viz-card-title">
              <IconifyIcon icon="ant-design:fund-outlined" /> 火山图 (Volcano Plot)
            </span>
            <div class="viz-card-actions">
              <IconifyIcon icon="ant-design:fullscreen-outlined" class="action-icon" />
              <IconifyIcon icon="ant-design:download-outlined" class="action-icon" />
            </div>
          </div>
          <div class="viz-placeholder volcano">
            <!-- 模拟火山图散点 -->
            <svg viewBox="0 0 300 200" class="mock-chart">
              <line x1="150" y1="0" x2="150" y2="200" stroke="#eee" stroke-dasharray="4"/>
              <line x1="0" y1="100" x2="300" y2="100" stroke="#eee" stroke-dasharray="4"/>
              <text x="270" y="195" font-size="9" fill="#aaa">log₂(Fold Change)</text>
              <text x="5" y="12" font-size="9" fill="#aaa">-log₁₀(p-value)</text>
              <!-- 显著上调 (红) -->
              <circle cx="220" cy="30" r="4" fill="#e74c3c" opacity="0.7"/>
              <circle cx="235" cy="45" r="3" fill="#e74c3c" opacity="0.7"/>
              <circle cx="210" cy="50" r="5" fill="#e74c3c" opacity="0.7"/>
              <circle cx="245" cy="55" r="3" fill="#e74c3c" opacity="0.6"/>
              <circle cx="200" cy="60" r="4" fill="#e74c3c" opacity="0.7"/>
              <circle cx="225" cy="65" r="3" fill="#e74c3c" opacity="0.5"/>
              <circle cx="195" cy="70" r="3" fill="#e74c3c" opacity="0.6"/>
              <!-- 显著下调 (蓝) -->
              <circle cx="60" cy="35" r="4" fill="#3498db" opacity="0.7"/>
              <circle cx="80" cy="40" r="3" fill="#3498db" opacity="0.7"/>
              <circle cx="50" cy="55" r="5" fill="#3498db" opacity="0.7"/>
              <circle cx="70" cy="50" r="3" fill="#3498db" opacity="0.6"/>
              <circle cx="90" cy="65" r="4" fill="#3498db" opacity="0.5"/>
              <circle cx="45" cy="70" r="3" fill="#3498db" opacity="0.6"/>
              <!-- 不显著 (灰) -->
              <circle cx="140" cy="120" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="155" cy="115" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="160" cy="130" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="130" cy="125" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="145" cy="135" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="165" cy="140" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="135" cy="140" r="2" fill="#ccc" opacity="0.5"/>
              <circle cx="150" cy="145" r="2" fill="#ccc" opacity="0.5"/>
              <!-- 标注文字 -->
              <text x="200" y="56" font-size="8" fill="#c0392b" font-weight="bold">MMP9</text>
              <text x="230" y="40" font-size="8" fill="#c0392b" font-weight="bold">VEGFA</text>
              <text x="240" y="60" font-size="7" fill="#c0392b">IL6</text>
              <text x="212" y="26" font-size="7" fill="#c0392b">BRCA1</text>
              <text x="37" y="32" font-size="8" fill="#2980b9" font-weight="bold">CDH1</text>
            </svg>
          </div>
        </div>

        <!-- 热力图 -->
        <div class="viz-card">
          <div class="viz-card-header">
            <span class="viz-card-title">
              <IconifyIcon icon="ant-design:heat-map-outlined" /> 差异基因热力图
            </span>
            <div class="viz-card-actions">
              <IconifyIcon icon="ant-design:fullscreen-outlined" class="action-icon" />
            </div>
          </div>
          <div class="viz-placeholder heatmap">
            <table class="mock-heatmap">
              <thead>
                <tr>
                  <th></th>
                  <th v-for="s in ['T1','T2','T3','N1','N2','N3']" :key="s">{{ s }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="gene in heatmapGenes" :key="gene.name">
                  <td class="gene-label">{{ gene.name }}</td>
                  <td v-for="(val, i) in gene.values" :key="i"
                    :style="{ background: getHeatColor(val) }"
                    class="heat-cell"
                  ></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 差异基因统计 -->
        <div class="viz-card">
          <div class="viz-card-header">
            <span class="viz-card-title">
              <IconifyIcon icon="ant-design:pie-chart-outlined" /> 差异基因统计
            </span>
          </div>
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-value" style="color: #e74c3c;">18,603</span>
              <span class="stat-label">总 DEGs</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: #e74c3c;">1,247</span>
              <span class="stat-label">上调基因</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: #3498db;">892</span>
              <span class="stat-label">下调基因</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 参数 Tab -->
      <div v-if="activeTab === 'params'" class="tab-pane">
        <div class="param-list">
          <div class="param-row" v-for="p in params" :key="p.label">
            <span class="param-label">{{ p.label }}</span>
            <span class="param-value">{{ p.value }}</span>
          </div>
        </div>
      </div>

      <!-- 文件 Tab -->
      <div v-if="activeTab === 'files'" class="tab-pane">
        <div class="file-item" v-for="f in files" :key="f.name">
          <IconifyIcon :icon="f.icon" :style="{ color: f.color, fontSize: '20px' }" />
          <div class="file-info">
            <span class="file-name">{{ f.name }}</span>
            <span class="file-meta">{{ f.size }} · {{ f.time }}</span>
          </div>
          <IconifyIcon icon="ant-design:download-outlined" class="file-download" />
        </div>
      </div>

      <!-- 摘要 Tab -->
      <div v-if="activeTab === 'summary'" class="tab-pane">
        <div class="summary-box">
          <p>本次 RNA-seq 差异表达分析共检测到 <strong>18,603</strong> 个差异表达基因（DEGs），其中 <strong style="color:#e74c3c">1,247</strong> 个上调，<strong style="color:#3498db">892</strong> 个下调。</p>
          <p>关键上调基因包括 <strong>MMP9、VEGFA、IL6</strong>，这些基因与肿瘤微环境重塑和血管新生密切相关。</p>
          <p>建议后续可进行 GSEA 通路富集分析和生存分析以验证临床意义。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconifyIcon } from '@vben/icons';

defineEmits(['close']);

const activeTab = ref('viz');

const tabs = [
  { key: 'viz', label: '可视化', icon: 'ant-design:fund-outlined' },
  { key: 'params', label: '参数', icon: 'ant-design:setting-outlined' },
  { key: 'files', label: '文件', icon: 'ant-design:file-outlined' },
  { key: 'summary', label: '摘要', icon: 'ant-design:file-text-outlined' },
];

const heatmapGenes = [
  { name: 'MMP9',  values: [0.9, 0.8, 0.85, -0.3, -0.5, -0.4] },
  { name: 'VEGFA', values: [0.7, 0.6, 0.75, -0.2, -0.4, -0.3] },
  { name: 'IL6',   values: [0.8, 0.9, 0.7,  -0.5, -0.6, -0.7] },
  { name: 'TNF',   values: [0.6, 0.5, 0.65, -0.1, -0.3, -0.2] },
  { name: 'CXCL8', values: [0.85, 0.7, 0.9, -0.4, -0.5, -0.6] },
  { name: 'CDH1',  values: [-0.7, -0.6, -0.8, 0.5, 0.6, 0.7] },
  { name: 'BRCA1', values: [-0.3, -0.4, -0.5, 0.4, 0.3, 0.5] },
  { name: 'TP53',  values: [-0.5, -0.6, -0.4, 0.6, 0.7, 0.5] },
  { name: 'RB1',   values: [-0.4, -0.5, -0.3, 0.5, 0.4, 0.6] },
  { name: 'APC',   values: [-0.6, -0.7, -0.5, 0.3, 0.5, 0.4] },
];

function getHeatColor(val: number) {
  if (val > 0) return `rgba(231, 76, 60, ${Math.abs(val)})`;
  return `rgba(52, 152, 219, ${Math.abs(val)})`;
}

const params = [
  { label: '使用的 Skill', value: 'RNA-seq_DEG v2.1' },
  { label: '大模型引擎', value: 'GPT-5.4 (高强度)' },
  { label: '参考基因组', value: 'hg38 (GRCh38)' },
  { label: '差异倍数 (FC)', value: '≥ 2.0' },
  { label: 'P-value 阈值', value: '< 0.05' },
  { label: '比对工具', value: 'STAR v2.7.11a' },
  { label: '定量工具', value: 'featureCounts' },
  { label: '差异分析', value: 'DESeq2 v1.42.0' },
];

const files = [
  { name: 'deg_results_all.csv', size: '1.2 MB', time: '3分钟前', icon: 'ant-design:file-excel-outlined', color: '#27ae60' },
  { name: 'volcano_plot.html', size: '856 KB', time: '3分钟前', icon: 'ant-design:html5-outlined', color: '#e67e22' },
  { name: 'heatmap_top50.png', size: '2.1 MB', time: '3分钟前', icon: 'ant-design:file-image-outlined', color: '#9b59b6' },
  { name: 'analysis_report.pdf', size: '4.5 MB', time: '3分钟前', icon: 'ant-design:file-pdf-outlined', color: '#e74c3c' },
];
</script>

<style scoped>
.panel-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}
.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.panel-close {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.panel-close:hover {
  background: #f5f5f5;
  color: #333;
}

/* === Tabs === */
.panel-tabs {
  display: flex;
  gap: 0;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: #555;
}
.tab-btn.active {
  color: #1a73e8;
  border-bottom-color: #1a73e8;
  font-weight: 600;
}

/* === Content === */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* === Viz Cards === */
.viz-card {
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.viz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.viz-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.viz-card-actions {
  display: flex;
  gap: 8px;
}
.action-icon {
  color: #bbb;
  cursor: pointer;
  font-size: 16px;
}
.action-icon:hover {
  color: #666;
}

.viz-placeholder {
  padding: 12px;
}
.mock-chart {
  width: 100%;
  height: auto;
}

/* === Heatmap === */
.mock-heatmap {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.mock-heatmap th {
  padding: 4px 6px;
  color: #888;
  font-weight: 600;
  text-align: center;
}
.mock-heatmap .gene-label {
  padding: 3px 8px;
  font-size: 11px;
  color: #555;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}
.heat-cell {
  width: 36px;
  height: 22px;
  border: 1px solid #fff;
  border-radius: 2px;
}

/* === Stats === */
.stats-row {
  display: flex;
  gap: 12px;
  padding: 16px;
}
.stat-item {
  flex: 1;
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
}
.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* === Params === */
.param-list {
  display: flex;
  flex-direction: column;
}
.param-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}
.param-label {
  color: #888;
}
.param-value {
  color: #333;
  font-weight: 500;
}

/* === Files === */
.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.file-item:hover {
  background: #f9f9f9;
}
.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.file-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-meta {
  font-size: 11px;
  color: #aaa;
}
.file-download {
  color: #ccc;
  font-size: 16px;
  cursor: pointer;
}
.file-download:hover {
  color: #1a73e8;
}

/* === Summary === */
.summary-box {
  background: #f8f9ff;
  border: 1px solid #e8ecf8;
  border-radius: 10px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.8;
  color: #444;
}
.summary-box p {
  margin: 0 0 8px;
}
.summary-box p:last-child {
  margin: 0;
}
</style>
