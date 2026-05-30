<script setup lang="ts">
import type {
  TutorialArticleDetail,
  TutorialArticlePayload,
  TutorialCategory,
} from '#/api';

import { computed, reactive, ref, watch } from 'vue';

import { MarkdownEditor } from '@vben/common-ui';

import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  createAdminTutorialArticle,
  getAdminTutorialArticle,
  updateAdminTutorialArticle,
  uploadTutorialFile,
} from '#/api';

import {
  normalizeArticleStatus,
  toCategoryOptions,
  tutorialStatusOptions,
} from '../data';

interface ArticleFormModel {
  attachment_urls: string[];
  category_id?: number;
  content_markdown: string;
  cover_url?: string;
  published_at?: string;
  slug: string;
  sort: number;
  status: 0 | 1;
  summary: string;
  tags: string[];
  title: string;
}

const props = defineProps<{
  articleId: null | number;
  categories: TutorialCategory[];
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

const categoryOptions = computed(() => toCategoryOptions(props.categories));
const drawerTitle = computed(() => (props.articleId ? '编辑教程' : '新增教程'));
const loading = ref(false);
const saving = ref(false);
const uploadingCover = ref(false);
const uploadingAttachment = ref(false);
const uploadingInlineImage = ref(false);
let articleLoadToken = 0;

const formModel = reactive<ArticleFormModel>({
  attachment_urls: [],
  category_id: undefined,
  content_markdown: '',
  cover_url: undefined,
  published_at: undefined,
  slug: '',
  sort: 0,
  status: 0,
  summary: '',
  tags: [],
  title: '',
});

function resetForm() {
  Object.assign(formModel, {
    attachment_urls: [],
    category_id: undefined,
    content_markdown: '',
    cover_url: undefined,
    published_at: undefined,
    slug: '',
    sort: 0,
    status: 0,
    summary: '',
    tags: [],
    title: '',
  });
}

function applyArticle(article: TutorialArticleDetail) {
  Object.assign(formModel, {
    attachment_urls: article.attachment_urls || [],
    category_id: article.category_id || undefined,
    content_markdown: article.content_markdown || '',
    cover_url: article.cover_url || undefined,
    published_at: article.published_at || undefined,
    slug: article.slug || '',
    sort: article.sort || 0,
    status: normalizeArticleStatus(article.status),
    summary: article.summary || '',
    tags: article.tags || [],
    title: article.title || '',
  });
}

watch(
  () => [props.open, props.articleId] as const,
  async ([open, articleId]) => {
    const requestedArticleId = articleId;
    const requestedToken = ++articleLoadToken;
    if (!open) {
      loading.value = false;
      return;
    }
    resetForm();
    if (!requestedArticleId) return;

    loading.value = true;
    try {
      const article = await getAdminTutorialArticle(requestedArticleId);
      if (
        !props.open ||
        props.articleId !== requestedArticleId ||
        requestedToken !== articleLoadToken
      ) {
        return;
      }
      applyArticle(article);
    } finally {
      if (requestedToken === articleLoadToken) {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

async function uploadFile(file: File) {
  const result = await uploadTutorialFile(file);
  if (!result.url) {
    throw new Error('上传接口未返回文件地址');
  }
  return result.url;
}

async function handleCoverUpload(file: File) {
  uploadingCover.value = true;
  try {
    formModel.cover_url = await uploadFile(file);
    message.success('封面已上传');
  } catch (error) {
    console.error('Cover upload failed:', error);
    message.error('封面上传失败');
  } finally {
    uploadingCover.value = false;
  }
  return false;
}

async function handleAttachmentUpload(file: File) {
  uploadingAttachment.value = true;
  try {
    const url = await uploadFile(file);
    formModel.attachment_urls = [...(formModel.attachment_urls || []), url];
    message.success('附件已上传');
  } catch (error) {
    console.error('Attachment upload failed:', error);
    message.error('附件上传失败');
  } finally {
    uploadingAttachment.value = false;
  }
  return false;
}

async function handleInlineImageUpload(
  files: File[],
  callback: (urls: Array<{ alt: string; title: string; url: string }>) => void,
) {
  if (!files.length) return;
  uploadingInlineImage.value = true;
  try {
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('只能上传图片文件');
        }
        const url = await uploadFile(file);
        return {
          alt: file.name,
          title: file.name,
          url,
        };
      }),
    );
    callback(uploadedImages);
    message.success('图片已插入正文');
  } catch (error) {
    console.error('Inline image upload failed:', error);
    message.error('正文图片上传失败');
  } finally {
    uploadingInlineImage.value = false;
  }
}

function removeAttachment(url: string) {
  formModel.attachment_urls = (formModel.attachment_urls || []).filter(
    (item) => item !== url,
  );
}

async function handleSave() {
  if (!formModel.title.trim() || !formModel.slug.trim()) {
    message.warning('请填写标题和标识');
    return;
  }
  if (!formModel.content_markdown.trim()) {
    message.warning('请填写教程正文');
    return;
  }

  saving.value = true;
  try {
    const payload: TutorialArticlePayload = {
      attachment_urls: formModel.attachment_urls,
      category_id: formModel.category_id || null,
      content_markdown: formModel.content_markdown,
      cover_url: formModel.cover_url || null,
      published_at: formModel.published_at || null,
      slug: formModel.slug.trim(),
      sort: formModel.sort || 0,
      status: normalizeArticleStatus(formModel.status),
      summary: formModel.summary || null,
      tags: formModel.tags,
      title: formModel.title.trim(),
    };
    if (props.articleId) {
      await updateAdminTutorialArticle(props.articleId, payload);
    } else {
      await createAdminTutorialArticle(payload);
    }
    message.success('教程已保存');
    emit('saved');
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="drawerTitle"
    width="860"
    :destroy-on-close="true"
  >
    <Form :model="formModel" layout="vertical" :disabled="loading">
      <Form.Item label="标题" required>
        <Input v-model:value="formModel.title" placeholder="教程标题" />
      </Form.Item>
      <Form.Item label="标识" required>
        <Input v-model:value="formModel.slug" placeholder="url-friendly-slug" />
      </Form.Item>
      <Form.Item label="摘要">
        <Input.TextArea
          v-model:value="formModel.summary"
          :rows="3"
          placeholder="列表和详情页摘要"
        />
      </Form.Item>
      <Form.Item label="分类">
        <Select
          v-model:value="formModel.category_id"
          allow-clear
          :options="categoryOptions"
          placeholder="选择分类"
        />
      </Form.Item>
      <Form.Item label="标签">
        <Select
          v-model:value="formModel.tags"
          mode="tags"
          placeholder="输入后回车添加标签"
        />
      </Form.Item>
      <Form.Item label="封面">
        <Space direction="vertical" class="w-full">
          <Space>
            <Input
              v-model:value="formModel.cover_url"
              allow-clear
              placeholder="封面 URL"
            />
            <Upload :before-upload="handleCoverUpload" :show-upload-list="false">
              <Button :loading="uploadingCover">上传封面</Button>
            </Upload>
          </Space>
          <span v-if="formModel.cover_url" class="url-text">
            {{ formModel.cover_url }}
          </span>
        </Space>
      </Form.Item>
      <Form.Item label="排序">
        <InputNumber v-model:value="formModel.sort" class="w-full" />
      </Form.Item>
      <Form.Item label="状态">
        <Select
          v-model:value="formModel.status"
          :options="tutorialStatusOptions"
        />
      </Form.Item>
      <Form.Item label="发布时间">
        <Input
          v-model:value="formModel.published_at"
          allow-clear
          placeholder="例如：2026-05-24 10:00:00"
        />
      </Form.Item>
      <Form.Item label="附件">
        <Space direction="vertical" class="w-full">
          <Upload
            :before-upload="handleAttachmentUpload"
            :show-upload-list="false"
          >
            <Button :loading="uploadingAttachment">上传附件</Button>
          </Upload>
          <Space v-if="formModel.attachment_urls?.length" wrap>
            <Tag
              v-for="url in formModel.attachment_urls"
              :key="url"
              closable
              @close.prevent="removeAttachment(url)"
            >
              {{ url }}
            </Tag>
          </Space>
        </Space>
      </Form.Item>
      <Form.Item label="正文" required>
        <MarkdownEditor
          v-model:value="formModel.content_markdown"
          :height="360"
          mode="wysiwyg"
          :no-upload-img="false"
          @upload-img="handleInlineImageUpload"
        />
        <div v-if="uploadingInlineImage" class="mt-2 text-xs text-slate-500">
          正在上传正文图片...
        </div>
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

<style scoped>
.url-text {
  display: block;
  max-width: 720px;
  overflow: hidden;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
