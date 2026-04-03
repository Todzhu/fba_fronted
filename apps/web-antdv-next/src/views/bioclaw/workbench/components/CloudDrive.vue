<template>
  <div class="cloud-page">
    <!-- 顶部工具栏 -->
    <div class="page-topbar">
      <div class="topbar-left">
        <h2 class="page-title">云盘</h2>
        <div class="breadcrumb">
          <span
            v-for="(seg, i) in pathSegments"
            :key="i"
            class="bread-item"
            :class="{ active: i === pathSegments.length - 1 }"
            @click="navigateToPath(i)"
          >
            {{ seg }}
            <IconifyIcon v-if="i < pathSegments.length - 1" icon="ant-design:right-outlined" class="bread-sep" />
          </span>
        </div>
      </div>
      <div class="topbar-right">
        <button class="btn-outline" @click="showNewFolderModal = true">
          <IconifyIcon icon="ant-design:folder-add-outlined" />
          新建文件夹
        </button>
        <button class="btn-primary">
          <IconifyIcon icon="ant-design:upload-outlined" />
          上传文件
        </button>
      </div>
    </div>

    <!-- 存储用量 -->
    <div class="storage-bar">
      <div class="storage-info">
        <span class="storage-label">存储用量</span>
        <span class="storage-value">2.4 GB / 10 GB</span>
      </div>
      <div class="storage-track">
        <div class="storage-fill" style="width: 24%;"></div>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-content">
      <table class="file-table">
        <thead>
          <tr>
            <th class="col-name">名称</th>
            <th class="col-size">大小</th>
            <th class="col-type">类型</th>
            <th class="col-time">修改时间</th>
            <th class="col-action"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="file in files"
            :key="file.name"
            class="file-row"
            @dblclick="file.isDir && enterFolder(file.name)"
          >
            <td class="col-name">
              <div class="file-name-cell">
                <IconifyIcon
                  :icon="file.isDir ? 'ant-design:folder-filled' : getFileIcon(file.name)"
                  :style="{ color: file.isDir ? '#ffa726' : '#999', fontSize: '18px' }"
                />
                <span class="file-name">{{ file.name }}</span>
                <span v-if="file.projectBound" class="project-tag">
                  <IconifyIcon icon="ant-design:experiment-outlined" style="font-size: 11px;" />
                  项目
                </span>
              </div>
            </td>
            <td class="col-size">{{ file.isDir ? '-' : file.size }}</td>
            <td class="col-type">{{ file.isDir ? '文件夹' : file.type }}</td>
            <td class="col-time">{{ file.time }}</td>
            <td class="col-action">
              <button class="row-action-btn" title="更多操作">
                <IconifyIcon icon="ant-design:more-outlined" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新建文件夹弹窗 -->
    <Teleport to="body">
      <div v-if="showNewFolderModal" class="modal-overlay" @click.self="showNewFolderModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>新建文件夹</h3>
            <button class="modal-close" @click="showNewFolderModal = false">
              <IconifyIcon icon="ant-design:close-outlined" />
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label">文件夹名称</label>
            <input v-model="newFolderName" class="form-input" placeholder="输入文件夹名称" @keyup.enter="showNewFolderModal = false" />
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showNewFolderModal = false">取消</button>
            <button class="btn-confirm" @click="showNewFolderModal = false">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IconifyIcon } from '@vben/icons';
import { getMyDataFiles } from '#/api/my-data';

const currentPath = ref('/data');
const showNewFolderModal = ref(false);
const newFolderName = ref('');

const pathSegments = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean);
  return ['根目录', ...parts];
});

function navigateToPath(index: number) {
  if (index === 0) { currentPath.value = '/'; return; }
  const parts = currentPath.value.split('/').filter(Boolean);
  currentPath.value = '/' + parts.slice(0, index).join('/');
}

function enterFolder(name: string) {
  currentPath.value = currentPath.value === '/' ? `/${name}` : `${currentPath.value}/${name}`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    csv: 'ant-design:file-excel-outlined',
    xlsx: 'ant-design:file-excel-outlined',
    pdf: 'ant-design:file-pdf-outlined',
    png: 'ant-design:file-image-outlined',
    jpg: 'ant-design:file-image-outlined',
    txt: 'ant-design:file-text-outlined',
    fastq: 'ant-design:file-outlined',
    html: 'ant-design:file-outlined',
    r: 'ant-design:code-outlined',
    py: 'ant-design:code-outlined',
  };
  return map[ext] || 'ant-design:file-outlined';
}

const files = ref<any[]>([]);

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const loadCloudData = async () => {
  try {
    const res = await getMyDataFiles({});
    files.value = res.items.map((item: any) => ({
      name: item.name,
      isDir: item.type === 'folder',
      size: item.type === 'folder' ? '' : formatFileSize(item.size),
      type: item.type === 'folder' ? '' : (item.name.split('.').pop()?.toUpperCase() || 'FILE'),
      time: item.updated_time,
      projectBound: false,
    }));
  } catch (error) {
    console.error('Failed to load cloud drive data', error);
  }
};

onMounted(() => {
  loadCloudData();
});
</script>

<style scoped>
.cloud-page { display: flex; flex-direction: column; height: 100%; background: #faf8f5; }

.page-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-bottom: 1px solid #e8e4df; }
.topbar-left { display: flex; align-items: center; gap: 16px; }
.page-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; }
.breadcrumb { display: flex; align-items: center; gap: 2px; }
.bread-item { font-size: 13px; color: #999; cursor: pointer; transition: color 0.15s; }
.bread-item:hover { color: #555; }
.bread-item.active { color: #1a1a1a; font-weight: 500; cursor: default; }
.bread-sep { font-size: 10px; color: #ccc; margin: 0 4px; }
.topbar-right { display: flex; gap: 10px; }
.btn-outline { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #d4cfc8; border-radius: 10px; background: #fff; color: #555; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.btn-outline:hover { background: #f0ece6; border-color: #bbb; }
.btn-primary { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #333; }

.storage-bar { padding: 12px 28px; border-bottom: 1px solid #e8e4df; background: #faf8f5; }
.storage-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.storage-label { font-size: 12px; color: #999; }
.storage-value { font-size: 12px; color: #666; font-weight: 500; }
.storage-track { height: 4px; background: #e8e4df; border-radius: 2px; overflow: hidden; }
.storage-fill { height: 100%; background: linear-gradient(90deg, #e8503a, #f06c58); border-radius: 2px; transition: width 0.3s; }

.file-content { flex: 1; overflow-y: auto; }
.file-table { width: 100%; border-collapse: collapse; }
.file-table th { padding: 10px 28px; font-size: 12px; font-weight: 600; color: #999; text-align: left; border-bottom: 1px solid #e8e4df; background: #faf8f5; position: sticky; top: 0; z-index: 1; }
.file-row { transition: background 0.1s; }
.file-row:hover { background: #f5f2ed; }
.file-row td { padding: 12px 28px; font-size: 13px; color: #555; border-bottom: 1px solid #f0ece6; }
.col-name { width: 45%; }
.col-size { width: 12%; }
.col-type { width: 15%; }
.col-time { width: 20%; }
.col-action { width: 8%; text-align: right; }

.file-name-cell { display: flex; align-items: center; gap: 10px; }
.file-name { color: #333; font-weight: 500; }
.project-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; color: #e8503a; background: #fef0ed; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
.row-action-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 16px; }
.row-action-btn:hover { color: #555; background: #f0ece6; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: #fff; border-radius: 16px; width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0ece6; }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.modal-close { background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; }
.modal-close:hover { background: #f0ece6; }
.modal-body { padding: 24px; }
.form-label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.form-input { width: 100%; padding: 10px 14px; border: 1px solid #e0ddd8; border-radius: 10px; font-size: 14px; color: #333; outline: none; background: #faf8f5; box-sizing: border-box; }
.form-input:focus { border-color: #bbb; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f0ece6; }
.btn-cancel { padding: 8px 20px; border: 1px solid #e0ddd8; border-radius: 10px; background: #fff; color: #666; font-size: 13px; cursor: pointer; }
.btn-confirm { padding: 8px 24px; border: none; border-radius: 10px; background: #1a1a1a; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
</style>
