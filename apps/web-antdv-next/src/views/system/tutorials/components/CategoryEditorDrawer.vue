<script setup lang="ts">
import type { TutorialCategory } from '#/api';

import { computed, reactive, ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Switch,
} from 'ant-design-vue';

import {
  createAdminTutorialCategory,
  updateAdminTutorialCategory,
} from '#/api';

const props = defineProps<{
  category: null | TutorialCategory;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'saved'): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const saving = ref(false);
const formModel = reactive({
  description: '',
  is_active: true,
  name: '',
  slug: '',
  sort: 0,
});

const title = computed(() => (props.category ? '编辑分类' : '新增分类'));

function resetForm() {
  Object.assign(formModel, {
    description: '',
    is_active: true,
    name: '',
    slug: '',
    sort: 0,
  });
}

watch(
  () => [props.open, props.category] as const,
  ([open]) => {
    if (!open) return;
    resetForm();
    if (props.category) {
      Object.assign(formModel, {
        description: props.category.description || '',
        is_active: props.category.is_active,
        name: props.category.name,
        slug: props.category.slug,
        sort: props.category.sort || 0,
      });
    }
  },
  { immediate: true },
);

async function handleSave() {
  if (!formModel.name.trim() || !formModel.slug.trim()) {
    message.warning('请填写分类名称和标识');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      description: formModel.description || null,
      is_active: formModel.is_active,
      name: formModel.name.trim(),
      slug: formModel.slug.trim(),
      sort: formModel.sort || 0,
    };
    if (props.category) {
      await updateAdminTutorialCategory(props.category.id, payload);
    } else {
      await createAdminTutorialCategory(payload);
    }
    message.success('分类已保存');
    emit('saved');
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer v-model:open="visible" :title="title" width="520">
    <Form :model="formModel" layout="vertical">
      <Form.Item label="分类名称" required>
        <Input v-model:value="formModel.name" placeholder="例如：入门教程" />
      </Form.Item>
      <Form.Item label="分类标识" required>
        <Input v-model:value="formModel.slug" placeholder="例如：getting-started" />
      </Form.Item>
      <Form.Item label="描述">
        <Input.TextArea
          v-model:value="formModel.description"
          :rows="4"
          placeholder="分类说明"
        />
      </Form.Item>
      <Form.Item label="排序">
        <InputNumber v-model:value="formModel.sort" class="w-full" />
      </Form.Item>
      <Form.Item label="启用">
        <Switch v-model:checked="formModel.is_active" />
      </Form.Item>
    </Form>

    <template #footer>
      <Space>
        <Button @click="visible = false">取消</Button>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
