<script lang="ts" setup>
/**
 * SampleTableEditor - 样本列表独立卡片
 * 独立白色卡片，展示样本信息表格
 */
import type { GroupTemplate, SampleInfo } from '../mock/myDataMock';

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
  Pagination,
  Select,
  Space,
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

// 分页
const currentPage = ref(1);
const pageSize = ref(4);

const pagedSamples = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return samples.value.slice(start, start + pageSize.value);
});

// 分组模板
const templates = ref<GroupTemplate[]>([]);
const loadingTemplates = ref(false);
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
  return [...groups];
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

loadTemplates();

const updateSample = (index: number, field: keyof SampleInfo, value: any) => {
  // 计算实际 index（考虑分页）
  const realIndex = (currentPage.value - 1) * pageSize.value + index;
  samples.value[realIndex][field] = value;
  emitChange();
};

const emitChange = () => {
  emit('update:modelValue', [...samples.value]);
};

// 分组颜色映射
const groupColorMap: Record<string, string> = {};
const groupColors = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'gold', 'lime'];
const getGroupColor = (group: string) => {
  if (!group) return 'default';
  if (!groupColorMap[group]) {
    groupColorMap[group] = groupColors[Object.keys(groupColorMap).length % groupColors.length] || 'blue';
  }
  return groupColorMap[group];
};

// 应用分组模板
const applyTemplate = (template: GroupTemplate) => {
  if (template.groups.length === 0) return;
  samples.value.forEach((sample, index) => {
    sample.group = template.groups[index % template.groups.length];
  });
  emitChange();
  message.success(`已应用模板「${template.name}」`);
};

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

const autoGroupByPrefix = () => {
  samples.value.forEach((sample) => {
    const match = sample.folderName.match(/^([a-z]+)/i);
    if (match) {
      sample.group = match[1];
    }
  });
  emitChange();
  message.success('已按前缀自动分组');
};
</script>

<template>
  <div class="sample-card">
    <!-- 卡片标题栏 -->
    <div class="card-header">
      <div class="card-title">
        <Icon icon="mdi:table" class="title-icon" />
        <span>样本列表</span>
        <span class="sample-count">共 {{ samples.length }} 个样本</span>
      </div>
      <div class="card-actions">
        <Dropdown :trigger="['click']">
          <Button size="small">
            <Icon icon="mdi:bookmark-outline" />
            批量标记分组
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
                    <Tag v-for="g in tpl.groups" :key="g" size="small">
                      {{ g }}
                    </Tag>
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
              <Menu.Item key="auto" @click="autoGroupByPrefix">
                <Icon icon="mdi:auto-fix" />
                按前缀自动分组
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>

        <Tooltip title="导入样本 Meta 信息">
          <Button size="small">
            <Icon icon="mdi:file-import-outline" />
            导入Meta信息
          </Button>
        </Tooltip>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-area">
      <!-- 表头 -->
      <div class="table-header">
        <div class="th-cell th-id">样本 ID</div>
        <div class="th-cell th-name">显示名称</div>
        <div class="th-cell th-group">分组标签</div>
        <div class="th-cell th-status">状态</div>
        <div class="th-cell th-action">操作</div>
      </div>

      <!-- 表体 -->
      <div
        v-for="(sample, index) in pagedSamples"
        :key="sample.folderName"
        class="table-row"
      >
        <div class="td-cell th-id">
          <span class="sample-id">{{ sample.folderName }}</span>
        </div>
        <div class="td-cell th-name">
          <Input
            :value="sample.sampleName"
            size="small"
            class="inline-input"
            @change="(e: any) => updateSample(index, 'sampleName', e.target.value)"
          />
        </div>
        <div class="td-cell th-group">
          <Tag
            v-if="sample.group"
            :color="getGroupColor(sample.group)"
          >
            {{ sample.group }}
          </Tag>
          <Select
            v-else
            :value="sample.group"
            mode="tags"
            :max-tag-count="1"
            size="small"
            style="width: 120px"
            placeholder="选择分组"
            :options="groupOptions"
            @change="(val: any) => updateSample(index, 'group', Array.isArray(val) ? val[0] || '' : val)"
          />
        </div>
        <div class="td-cell th-status">
          <span class="status-dot" :class="sample.enabled ? 'dot-ready' : 'dot-loading'"></span>
          <span :class="sample.enabled ? 'status-ready' : 'status-loading'">
            {{ sample.enabled ? '就绪' : '加载中...' }}
          </span>
        </div>
        <div class="td-cell th-action">
          <Button
            type="text"
            size="small"
            @click="() => {}"
          >
            <Icon icon="mdi:pencil-outline" />
          </Button>
        </div>
      </div>
    </div>

    <!-- 底部分页 -->
    <div v-if="samples.length > pageSize" class="table-footer">
      <span class="page-info">
        显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, samples.length) }} / 共 {{ samples.length }} 个样本
      </span>
      <Pagination
        v-model:current="currentPage"
        :total="samples.length"
        :page-size="pageSize"
        size="small"
        simple
      />
    </div>

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
.sample-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.title-icon {
  font-size: 20px;
  color: #1677ff;
}

.sample-count {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* 表格 */
.table-area {
  padding: 0 24px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.th-cell {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.th-id { width: 160px; }
.th-name { flex: 1; }
.th-group { width: 140px; }
.th-status { width: 100px; }
.th-action { width: 60px; text-align: center; }

.table-row {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #fafafa;
  transition: background 0.15s;
}

.table-row:hover {
  background: #fafbff;
}

.td-cell {
  font-size: 14px;
  color: #262626;
}

.sample-id {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 13px;
  color: #595959;
}

.inline-input {
  max-width: 200px;
  font-weight: 500;
}

/* 状态 */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
}

.dot-ready {
  background: #52c41a;
}

.dot-loading {
  background: #faad14;
}

.status-ready {
  font-size: 13px;
  color: #52c41a;
}

.status-loading {
  font-size: 13px;
  color: #faad14;
}

/* 底部 */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid #f5f5f5;
}

.page-info {
  font-size: 12px;
  color: #8c8c8c;
}

/* 模板 */
.template-item {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 200px;
}

.template-tags {
  display: flex;
  flex: 1;
  gap: 4px;
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
</style>
