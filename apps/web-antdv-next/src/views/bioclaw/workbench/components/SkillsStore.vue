<template>
  <div class="skills-page">
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">Skills 商店</h2>
        <span class="page-desc">一键安装专业生信分析技能</span>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <IconifyIcon icon="ant-design:search-outlined" class="search-icon" />
          <input v-model="searchKeyword" class="search-input" placeholder="搜索 Skills..." />
        </div>
      </div>
    </div>
    <div class="filter-bar">
      <button v-for="cat in categories" :key="cat.id" class="filter-chip" :class="{ active: activeCat === cat.id }" @click="activeCat = cat.id">{{ cat.label }}</button>
    </div>
    <div class="page-content">
      <div class="section-header"><h3 class="section-title">已安装</h3><span class="section-count">{{ installedSkills.length }} 个</span></div>
      <div class="skills-grid">
        <div v-for="skill in installedSkills" :key="skill.id" class="skill-card">
          <div class="skill-icon" :style="{ background: skill.color }"><IconifyIcon :icon="skill.icon" style="font-size: 22px; color: #fff;" /></div>
          <div class="skill-body">
            <div class="skill-title-row"><h4 class="skill-title">{{ skill.name }}</h4><span class="skill-version">v{{ skill.version }}</span></div>
            <p class="skill-desc">{{ skill.desc }}</p>
          </div>
          <div class="installed-badge"><IconifyIcon icon="ant-design:check-circle-filled" /> 已安装</div>
        </div>
      </div>
      <div class="section-header" style="margin-top: 32px;"><h3 class="section-title">推荐安装</h3><span class="section-count">{{ recommendedSkills.length }} 个</span></div>
      <div class="skills-grid">
        <div v-for="skill in recommendedSkills" :key="skill.id" class="skill-card">
          <div class="skill-icon" :style="{ background: skill.color }"><IconifyIcon :icon="skill.icon" style="font-size: 22px; color: #fff;" /></div>
          <div class="skill-body">
            <div class="skill-title-row"><h4 class="skill-title">{{ skill.name }}</h4><span class="skill-version">v{{ skill.version }}</span></div>
            <p class="skill-desc">{{ skill.desc }}</p>
          </div>
          <button class="btn-install"><IconifyIcon icon="ant-design:download-outlined" /> 安装</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IconifyIcon } from '@vben/icons';
const searchKeyword = ref('');
const activeCat = ref('all');
const categories = [
  { id: 'all', label: '全部' }, { id: 'rnaseq', label: 'RNA-seq' }, { id: 'scrna', label: '单细胞' },
  { id: 'genomics', label: '基因组' }, { id: 'proteomics', label: '蛋白组' }, { id: 'viz', label: '可视化' },
];
const installedSkills = ref([
  { id: 1, name: 'RNA-seq 差异表达分析', desc: 'FASTQ → QC → 比对 → 定量 → DESeq2 → 可视化', icon: 'ant-design:experiment-outlined', color: 'linear-gradient(135deg, #e8503a, #d4412d)', version: '2.1' },
  { id: 2, name: '单细胞分析流程', desc: '10X → Seurat 聚类 → UMAP → Marker → 注释', icon: 'ant-design:cluster-outlined', color: 'linear-gradient(135deg, #667eea, #764ba2)', version: '1.3' },
  { id: 3, name: 'GSEA 富集分析', desc: '基因列表 → GO/KEGG 富集 → 气泡图/条形图', icon: 'ant-design:bar-chart-outlined', color: 'linear-gradient(135deg, #43e97b, #38f9d7)', version: '1.0' },
  { id: 4, name: '生存分析', desc: '临床数据 + 表达数据 → KM 曲线 → Cox 回归', icon: 'ant-design:line-chart-outlined', color: 'linear-gradient(135deg, #4facfe, #00f2fe)', version: '1.2' },
  { id: 5, name: '科研绘图工具箱', desc: '火山图/热力图/Venn 图/桑基图/箱线图', icon: 'ant-design:picture-outlined', color: 'linear-gradient(135deg, #ffa726, #fb8c00)', version: '3.0' },
]);
const recommendedSkills = ref([
  { id: 6, name: 'WES 变异检测', desc: 'FASTQ → BWA → GATK → 注释 → 过滤 → 报告', icon: 'ant-design:api-outlined', color: 'linear-gradient(135deg, #f093fb, #f5576c)', version: '1.0' },
  { id: 7, name: '蛋白组学分析', desc: '质谱数据 → 蛋白鉴定 → 差异分析 → 通路注释', icon: 'ant-design:gold-outlined', color: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', version: '0.9' },
  { id: 8, name: '微生物组分析', desc: '16S/宏基因组 → OTU → 多样性 → LEfSe', icon: 'ant-design:bug-outlined', color: 'linear-gradient(135deg, #66bb6a, #43a047)', version: '1.1' },
  { id: 9, name: 'WGCNA 共表达网络', desc: '表达矩阵 → 模块检测 → Hub 基因 → 可视化', icon: 'ant-design:share-alt-outlined', color: 'linear-gradient(135deg, #5c6bc0, #3949ab)', version: '1.0' },
  { id: 10, name: '文献批量分析', desc: 'PDF → 摘要提取 → 关键词 → 知识图谱', icon: 'ant-design:read-outlined', color: 'linear-gradient(135deg, #78909c, #546e7a)', version: '0.8' },
  { id: 11, name: '临床数据挖掘', desc: '多组学整合 → 预后模型 → 列线图 → 校准曲线', icon: 'ant-design:medicine-box-outlined', color: 'linear-gradient(135deg, #ef5350, #c62828)', version: '1.2' },
]);
</script>

<style scoped>
.skills-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; }
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
.section-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
.section-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin: 0; }
.section-count { font-size: 12px; color: #999; }
.skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.skill-card { position: relative; display: flex; gap: 14px; background: #fff; border: 1px solid #e8e4df; border-radius: 14px; padding: 18px; transition: all 0.2s; }
.skill-card:hover { border-color: #d0ccc4; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.skill-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.skill-body { flex: 1; min-width: 0; }
.skill-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.skill-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0; }
.skill-version { font-size: 11px; color: #bbb; background: #f0ece6; padding: 1px 6px; border-radius: 4px; }
.skill-desc { font-size: 12px; color: #999; margin: 0; line-height: 1.5; }
.installed-badge { position: absolute; top: 18px; right: 18px; display: flex; align-items: center; gap: 4px; font-size: 11px; color: #43a047; }
.btn-install { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 4px; padding: 6px 14px; border: 1px solid #e0ddd8; border-radius: 8px; background: #fff; color: #555; font-size: 12px; cursor: pointer; transition: all 0.15s; }
.btn-install:hover { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
</style>
