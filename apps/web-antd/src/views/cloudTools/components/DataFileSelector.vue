<script lang="ts" setup>
/**
 * DataFileSelector - 数据文件选择器
 *
 * 根据 input_schema 动态渲染文件选择控件
 * 支持从"我的数据"选择或直接上传
 */
import { ref } from 'vue';

import { Icon } from '@iconify/vue';
import { Button, message, Space, Tabs, TreeSelect, Upload } from 'ant-design-vue';

import { getUserFolderTree } from '#/api/my-data';

interface FileConfig {
  key: string;
  label?: string;
  required?: boolean;
  extensions?: string[];
}

interface InputSchema {
  files?: FileConfig[];
}

const props = defineProps<{
  schema: InputSchema | null;
  modelValue: Record<string, number | null>; // key -> UserFile ID
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, number | null>): void;
  (e: 'fileLoaded', key: string, data: unknown): void;
}>();

const activeMode = ref<Record<string, 'myData' | 'upload'>>({});
const folderTree = ref<any[]>([]);
const loadingTree = ref(false);

// 加载文件夹树
const loadFolderTree = async () => {
  if (folderTree.value.length > 0) return;
  loadingTree.value = true;
  try {
    const tree = await getUserFolderTree();
    folderTree.value = transformTree(tree);
  } catch {
    message.error('加载文件目录失败');
  } finally {
    loadingTree.value = false;
  }
};

// 转换树结构为 TreeSelect 格式
const transformTree = (nodes: any[]): any[] => {
  return nodes.map((node) => ({
    value: node.id,
    title: node.name,
    isLeaf: node.type === 'file',
    selectable: node.type === 'file',
    children: node.children ? transformTree(node.children) : undefined,
  }));
};

// 更新选中的文件
const updateFile = (key: string, fileId: number | null) => {
  emit('update:modelValue', { ...props.modelValue, [key]: fileId });
};

// 处理上传
const handleUpload = (key: string, info: any) => {
  if (info.file.status === 'done') {
    message.success(`${info.file.name} 上传成功`);
    // 上传成功后更新文件 ID (需要后端返回)
    if (info.file.response?.id) {
      updateFile(key, info.file.response.id);
    }
  }
};

// 检查文件扩展名是否匹配
const checkExtension = (filename: string, extensions?: string[]): boolean => {
  if (!extensions || extensions.length === 0) return true;
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return extensions.some((e) => e.toLowerCase() === ext);
};
</script>

<template>
  <div class="file-selector-container">
    <div
      v-for="file in schema?.files ?? []"
      :key="file.key"
      class="file-item"
    >
      <div class="file-label">
        <span v-if="file.required" class="required">*</span>
        <span class="label">{{ file.label || file.key }}：</span>
        <span v-if="file.extensions" class="extensions">
          ({{ file.extensions.join(', ') }})
        </span>
      </div>

      <Tabs
        v-model:active-key="activeMode[file.key]"
        size="small"
        type="card"
        @change="() => file.key && loadFolderTree()"
      >
        <!-- 我的数据 -->
        <Tabs.TabPane key="myData" tab="我的数据">
          <TreeSelect
            :value="modelValue[file.key]"
            :tree-data="folderTree"
            :loading="loadingTree"
            placeholder="选择文件..."
            tree-default-expand-all
            show-search
            allow-clear
            class="w-full"
            @change="(val: number) => updateFile(file.key, val)"
            @focus="loadFolderTree"
          />
        </Tabs.TabPane>

        <!-- 本地上传 -->
        <Tabs.TabPane key="upload" tab="本地上传">
          <Upload
            :show-upload-list="true"
            :max-count="1"
            :before-upload="(f: File) => checkExtension(f.name, file.extensions) || (message.warning('文件格式不支持'), false)"
            action="/api/v1/sys/user-files/upload"
            @change="(info: any) => handleUpload(file.key, info)"
          >
            <Button>
              <Icon icon="mdi:upload" />
              选择文件
            </Button>
          </Upload>
        </Tabs.TabPane>
      </Tabs>
    </div>

    <div v-if="!schema?.files?.length" class="empty-state">
      <Space direction="vertical" align="center">
        <Icon icon="mdi:file-question" class="empty-icon" />
        <p>暂无文件配置</p>
      </Space>
    </div>
  </div>
</template>

<style scoped>
.file-selector-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-item {
  padding: 12px;
  background: var(--hover-color, #fafafa);
  border-radius: 6px;
}

.dark .file-item {
  background: #1f1f1f;
}

.file-label {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.required {
  color: #ff4d4f;
}

.label {
  font-weight: 500;
}

.extensions {
  color: var(--text-color-secondary);
  font-size: 12px;
}

.w-full {
  width: 100%;
}

.empty-state {
  padding: 32px;
  color: var(--text-color-secondary);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
}

:deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}
</style>
