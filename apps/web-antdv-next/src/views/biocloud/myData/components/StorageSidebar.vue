<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

interface Props {
  storageUsedStr: string;
  storageLimitStr: string;
  storagePercent: number;
}

defineProps<Props>();
</script>

<template>
  <aside class="sidebar">
    <!-- 存储空间概览 -->
    <div class="sidebar-card">
      <div class="card-header">
        <IconifyIcon icon="ant-design:cloud-outlined" class="text-lg text-blue-500" />
        <span class="card-title">存储空间概览</span>
      </div>

      <div class="storage-info">
        <div class="storage-row">
          <span class="storage-label">总容量</span>
          <span class="storage-value">{{ storageLimitStr }}</span>
        </div>
        <span class="storage-percent" :class="storagePercent > 90 ? 'text-red-500' : storagePercent > 70 ? 'text-amber-500' : 'text-blue-500'">
          {{ Math.round(storagePercent) }}% 已用
        </span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill"
          :class="storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'"
          :style="{ width: `${Math.max(storagePercent, 1)}%` }"
        />
      </div>

      <div class="storage-detail">
        <div class="detail-item">
          <span class="detail-label">已用空间</span>
          <span class="detail-value">{{ storageUsedStr }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">可用空间</span>
          <span class="detail-value text-green-600">
            {{ storageLimitStr }}
          </span>
        </div>
      </div>

      <button class="upgrade-btn">
        <IconifyIcon icon="ant-design:arrow-up-outlined" class="text-sm" />
        升级存储空间
      </button>
    </div>

    <!-- 上传指南 -->
    <div class="sidebar-card">
      <div class="card-header">
        <IconifyIcon icon="ant-design:bulb-outlined" class="text-lg text-blue-500" />
        <span class="card-title">上传指南</span>
      </div>
      <ul class="guide-list">
        <li>
          <IconifyIcon icon="ant-design:check-circle-outlined" class="guide-icon" />
          支持常用的矩阵与原始序列文件
        </li>
        <li>
          <IconifyIcon icon="ant-design:check-circle-outlined" class="guide-icon" />
          元数据需符合 BIDS 扩展标准
        </li>
        <li>
          <IconifyIcon icon="ant-design:check-circle-outlined" class="guide-icon" />
          单文件最大支持 50GB 上传
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.storage-info {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.storage-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.storage-label {
  font-size: 12px;
  color: #94a3b8;
}

.storage-value {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.storage-percent {
  font-size: 13px;
  font-weight: 700;
}

.progress-bar-bg {
  height: 8px;
  border-radius: 4px;
  background: #e2e8f0;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.storage-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 11px;
  color: #94a3b8;
}

.detail-value {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.upgrade-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.upgrade-btn:hover {
  border-color: #93c5fd;
  color: #2563eb;
  background: #eff6ff;
}

.guide-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.guide-icon {
  color: #22c55e;
  font-size: 14px;
  margin-top: 3px;
  flex-shrink: 0;
}
</style>
