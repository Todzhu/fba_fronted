<script lang="ts" setup>
/**
 * SampleTableEditor - 样本信息可编辑表格
 * 支持编辑样本名称、分组、启用状态，以及分组模板管理
 */
import type { SampleInfo, GroupTemplate } from '../mock/myDataMock';

import { computed, ref, watch } from 'vue';

import { Icon } from '@iconify/vue';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteGroupTemplate,
  getGroupTemplates,
  saveGroupTemplate,
} from '../mock/myDataMock';

const props = defineProps<{
  modelValue: SampleInfo[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: SampleInfo[]): void;
}>();

// 本地数据副本
const samples = ref<SampleInfo[]>([]);

// 分组模板
const templates = ref<GroupTemplate[]>([]);
const loadingTemplates = ref(false);

// 保存模板对话框
const saveTemplateVisible = ref(false);
const newTemplateName = ref('');

// 同步外部数据
watch(
  () => props.modelValue,
  (newVal) => {
    samples.value = newVal.map((s) => ({ ...s }));
  },
  { immediate: true, deep: true },
);

// 获取当前所有分组（去重）
const currentGroups = computed(() => {
  const groups = new Set<string>();
  samples.value.forEach((s) => {
    if (s.group) groups.add(s.group);
  });
  return Array.from(groups);
});

// 分组选项
const groupOptions = computed(() => {
  return currentGroups.value.map((g) => ({ value: g, label: g }));
});

// 加载分组模板
const loadTemplates = async () => {
  loadingTemplates.value = true;
  try {
    templates.value = await getGroupTemplates();
  } finally {
    loadingTemplates.value = false;
  }
};

// 初始化
loadTemplates();

// 更新单个样本
const updateSample = (index: number, field: keyof SampleInfo, value: any) => {
  samples.value[index][field] = value;
  emitChange();
};

// 发送变更
const emitChange = () => {
  emit('update:modelValue', [...samples.value]);
};

// 全选/取消全选
const allEnabled = computed({
  get: () => samples.value.every((s) => s.enabled),
  set: (val: boolean) => {
    samples.value.forEach((s) => (s.enabled = val));
    emitChange();
  },
});

// 应用分组模板
const applyTemplate = (template: GroupTemplate) => {
  if (template.groups.length === 0) return;

  // 按顺序循环分配分组
  samples.value.forEach((sample, index) => {
    sample.group = template.groups[index % template.groups.length];
  });
  emitChange();
  message.success(`已应用模板「${template.name}」`);
};

// 保存当前分组为模板
const showSaveTemplateDialog = () => {
  if (currentGroups.value.length === 0) {
    message.warning('请先设置分组信息');
    return;
  }
  newTemplateName.value = '';
  saveTemplateVisible.value = true;
};

const handleSaveTemplate = async () => {
  if (!newTemplateName.value.trim()) {
    message.warning('请输入模板名称');
    return;
  }

  await saveGroupTemplate(newTemplateName.value, currentGroups.value);
  message.success('模板保存成功');
  saveTemplateVisible.value = false;
  loadTemplates();
};

// 删除模板
const handleDeleteTemplate = async (template: GroupTemplate) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除模板「${template.name}」吗？`,
    async onOk() {
      await deleteGroupTemplate(template.id);
      message.success('已删除');
      loadTemplates();
    },
  });
};

// 快速填充：按前缀分组
const autoGroupByPrefix = () => {
  samples.value.forEach((sample) => {
    // 提取下划线或连字符前的部分作为分组
    const match = sample.folderName.match(/^([a-zA-Z]+)/);
    if (match) {
      sample.group = match[1];
    }
  });
  emitChange();
  message.success('已按前缀自动分组');
};

// 表格列定义
const columns = [
  {
    title: '启用',
    dataIndex: 'enabled',
    key: 'enabled',
    width: 70,
    align: 'center' as const,
  },
  {
    title: '文件夹名称',
    dataIndex: 'folderName',
    key: 'folderName',
    width: 180,
  },
  {
    title: '样本名称',
    dataIndex: 'sampleName',
    key: 'sampleName',
    width: 200,
  },
  {
    title: '分组',
    dataIndex: 'group',
    key: 'group',
    width: 180,
  },
];
</script>

<template>
  <div class="sample-table-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <Space>
        <Dropdown :trigger="['click']">
          <Button>
            <Icon icon="mdi:bookmark-outline" />
            应用模板
            <Icon icon="mdi:chevron-down" />
          </Button>
          <template #overlay>
            <Menu>
              <Menu.Item
                v-for="tpl in templates"
                :key="tpl.id"
                @click="applyTemplate(tpl)"
              >
                <div class="template-item">
                  <span>{{ tpl.name }}</span>
                  <div class="template-tags">
                    <Tag v-for="g in tpl.groups" :key="g" size="small">{{ g }}</Tag>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    danger
                    @click.stop="handleDeleteTemplate(tpl)"
                  >
                    <Icon icon="mdi:delete" />
                  </Button>
                </div>
              </Menu.Item>
              <Menu.Divider v-if="templates.length > 0" />
              <Menu.Item key="save" @click="showSaveTemplateDialog">
                <Icon icon="mdi:content-save" />
                保存当前分组为模板
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>

        <Tooltip title="根据文件夹名称前缀自动分组">
          <Button @click="autoGroupByPrefix">
            <Icon icon="mdi:auto-fix" />
            按前缀分组
          </Button>
        </Tooltip>
      </Space>

      <div class="sample-count">
        共 {{ samples.length }} 个样本，
        已启用 {{ samples.filter((s) => s.enabled).length }} 个
      </div>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="samples"
      :pagination="false"
      :scroll="{ y: 300 }"
      row-key="folderName"
      size="small"
      bordered
    >
      <!-- 启用列 -->
      <template #headerCell="{ column }">
        <template v-if="column.key === 'enabled'">
          <Checkbox v-model:checked="allEnabled" />
        </template>
        <template v-else>{{ column.title }}</template>
      </template>

      <template #bodyCell="{ column, record, index }">
        <!-- 启用 -->
        <template v-if="column.key === 'enabled'">
          <Checkbox
            :checked="record.enabled"
            @change="(e: any) => updateSample(index, 'enabled', e.target.checked)"
          />
        </template>

        <!-- 文件夹名称（只读） -->
        <template v-else-if="column.key === 'folderName'">
          <span class="folder-name">
            <Icon icon="mdi:folder" class="folder-icon" />
            {{ record.folderName }}
          </span>
        </template>

        <!-- 样本名称（可编辑） -->
        <template v-else-if="column.key === 'sampleName'">
          <Input
            :value="record.sampleName"
            size="small"
            @change="(e: any) => updateSample(index, 'sampleName', e.target.value)"
          />
        </template>

        <!-- 分组（可编辑/选择） -->
        <template v-else-if="column.key === 'group'">
          <Select
            :value="record.group"
            mode="tags"
            :max-tag-count="1"
            size="small"
            style="width: 100%"
            placeholder="输入或选择分组"
            :options="groupOptions"
            @change="(val: any) => updateSample(index, 'group', Array.isArray(val) ? val[0] || '' : val)"
          />
        </template>
      </template>
    </Table>

    <!-- 保存模板对话框 -->
    <Modal
      v-model:open="saveTemplateVisible"
      title="保存分组模板"
      :width="400"
      @ok="handleSaveTemplate"
    >
      <div class="save-template-form">
        <p>当前分组：</p>
        <div class="current-groups">
          <Tag v-for="g in currentGroups" :key="g" color="blue">{{ g }}</Tag>
        </div>
        <Input
          v-model:value="newTemplateName"
          placeholder="输入模板名称"
          style="margin-top: 12px"
        />
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.sample-table-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sample-count {
  font-size: 13px;
  color: #8c8c8c;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.template-tags {
  display: flex;
  flex: 1;
  gap: 4px;
}

.folder-name {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #595959;
}

.folder-icon {
  color: #faad14;
}

.save-template-form p {
  margin-bottom: 8px;
  font-weight: 500;
}

.current-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.ant-table-cell) {
  padding: 8px !important;
}
</style>
