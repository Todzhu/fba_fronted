<script setup lang="ts">
import type { TutorialArticleListItem, TutorialCategory } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  deleteAdminTutorialArticle,
  deleteAdminTutorialCategory,
  getAdminTutorialArticles,
  getAdminTutorialCategories,
  publishAdminTutorialArticle,
  updateAdminTutorialCategory,
} from '#/api';

import ArticleEditorDrawer from './components/ArticleEditorDrawer.vue';
import CategoryEditorDrawer from './components/CategoryEditorDrawer.vue';
import {
  getTutorialCategoryName,
  getTutorialStatusColor,
  getTutorialStatusLabel,
  toCategoryOptions,
  tutorialStatusOptions,
} from './data';

const activeTab = ref('articles');
const categories = ref<TutorialCategory[]>([]);
const articles = ref<TutorialArticleListItem[]>([]);
const categoryRows = ref<TutorialCategory[]>([]);

const articleLoading = ref(false);
const categoryLoading = ref(false);
const articleDrawerOpen = ref(false);
const categoryDrawerOpen = ref(false);
const editingArticleId = ref<null | number>(null);
const editingCategory = ref<null | TutorialCategory>(null);

const articleQuery = reactive({
  category_id: undefined as number | undefined,
  page: 1,
  search: '',
  size: 10,
  status: undefined as number | undefined,
});

const articlePagination = reactive({
  total: 0,
});

const categoryQuery = reactive({
  search: '',
});

const categoryOptions = computed(() => toCategoryOptions(categories.value));

const articleColumns = [
  { dataIndex: 'title', key: 'title', title: '标题' },
  { dataIndex: 'category_id', key: 'category', title: '分类' },
  { dataIndex: 'tags', key: 'tags', title: '标签' },
  { dataIndex: 'status', key: 'status', title: '状态' },
  { dataIndex: 'sort', key: 'sort', title: '排序', width: 80 },
  { dataIndex: 'view_count', key: 'view_count', title: '浏览', width: 90 },
  { dataIndex: 'published_at', key: 'published_at', title: '发布时间' },
  { dataIndex: 'updated_time', key: 'updated_time', title: '更新时间' },
  { key: 'operation', title: '操作', width: 210 },
];

const categoryColumns = [
  { dataIndex: 'name', key: 'name', title: '名称' },
  { dataIndex: 'slug', key: 'slug', title: '标识' },
  { dataIndex: 'description', key: 'description', title: '描述' },
  { dataIndex: 'sort', key: 'sort', title: '排序', width: 90 },
  { dataIndex: 'is_active', key: 'is_active', title: '启用', width: 100 },
  { key: 'operation', title: '操作', width: 150 },
];

async function loadCategories() {
  categoryLoading.value = true;
  try {
    categoryRows.value = await getAdminTutorialCategories({
      search: categoryQuery.search || undefined,
    });
    if (!categoryQuery.search) {
      categories.value = categoryRows.value;
    }
  } finally {
    categoryLoading.value = false;
  }
}

async function loadArticles() {
  articleLoading.value = true;
  try {
    const result = await getAdminTutorialArticles({
      category_id: articleQuery.category_id,
      page: articleQuery.page,
      search: articleQuery.search || undefined,
      size: articleQuery.size,
      status: articleQuery.status,
    });
    articles.value = result.items || [];
    articlePagination.total = result.total || 0;
  } finally {
    articleLoading.value = false;
  }
}

async function refreshAll() {
  await loadCategories();
  await loadArticles();
}

function resetArticlePageAndLoad() {
  articleQuery.page = 1;
  loadArticles();
}

function openCreateArticle() {
  editingArticleId.value = null;
  articleDrawerOpen.value = true;
}

function openEditArticle(article: TutorialArticleListItem) {
  editingArticleId.value = article.id;
  articleDrawerOpen.value = true;
}

function asArticle(record: Record<string, any>) {
  return record as TutorialArticleListItem;
}

async function handlePublishArticle(article: TutorialArticleListItem) {
  await publishAdminTutorialArticle(article.id);
  message.success('教程已发布');
  await loadArticles();
}

async function handleDeleteArticle(article: TutorialArticleListItem) {
  await deleteAdminTutorialArticle(article.id);
  message.success('教程已删除');
  await loadArticles();
}

function openCreateCategory() {
  editingCategory.value = null;
  categoryDrawerOpen.value = true;
}

function openEditCategory(category: TutorialCategory) {
  editingCategory.value = category;
  categoryDrawerOpen.value = true;
}

function asCategory(record: Record<string, any>) {
  return record as TutorialCategory;
}

async function handleDeleteCategory(category: TutorialCategory) {
  await deleteAdminTutorialCategory(category.id);
  message.success('分类已删除');
  await refreshAll();
}

async function handleCategoryActiveChange(
  category: TutorialCategory,
  checked: boolean,
) {
  await updateAdminTutorialCategory(category.id, { is_active: checked });
  category.is_active = checked;
  const cached = categories.value.find((item) => item.id === category.id);
  if (cached) cached.is_active = checked;
  message.success('分类状态已更新');
}

function handleCategorySwitchChange(
  record: Record<string, any>,
  checked: unknown,
) {
  handleCategoryActiveChange(asCategory(record), checked === true);
}

function handleArticleSaved() {
  refreshAll();
}

function handleCategorySaved() {
  refreshAll();
}

onMounted(async () => {
  await refreshAll();
});
</script>

<template>
  <Page auto-content-height title="教程管理">
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="articles" tab="教程文章">
        <div class="toolbar">
          <Space wrap>
            <Input.Search
              v-model:value="articleQuery.search"
              allow-clear
              placeholder="搜索标题或内容"
              style="width: 240px"
              @search="resetArticlePageAndLoad"
            />
            <Select
              v-model:value="articleQuery.status"
              allow-clear
              :options="tutorialStatusOptions"
              placeholder="状态"
              style="width: 140px"
              @change="resetArticlePageAndLoad"
            />
            <Select
              v-model:value="articleQuery.category_id"
              allow-clear
              :options="categoryOptions"
              placeholder="分类"
              style="width: 180px"
              @change="resetArticlePageAndLoad"
            />
          </Space>
          <Button type="primary" @click="openCreateArticle">新增教程</Button>
        </div>

        <Table
          row-key="id"
          :columns="articleColumns"
          :data-source="articles"
          :loading="articleLoading"
          :pagination="{
            current: articleQuery.page,
            pageSize: articleQuery.size,
            total: articlePagination.total,
            showSizeChanger: true,
          }"
          @change="
            (pagination) => {
              articleQuery.page = pagination.current || 1;
              articleQuery.size = pagination.pageSize || 10;
              loadArticles();
            }
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'category'">
              {{ getTutorialCategoryName(categories, record.category_id) }}
            </template>
            <template v-else-if="column.key === 'tags'">
              <Space v-if="record.tags?.length" wrap>
                <Tag v-for="tag in record.tags" :key="tag">{{ tag }}</Tag>
              </Space>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="getTutorialStatusColor(record.status)">
                {{ getTutorialStatusLabel(record.status) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'published_at'">
              {{ record.published_at || '-' }}
            </template>
            <template v-else-if="column.key === 'updated_time'">
              {{ record.updated_time || '-' }}
            </template>
            <template v-else-if="column.key === 'operation'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="openEditArticle(asArticle(record))"
                >
                  编辑
                </Button>
                <Button
                  v-if="record.status !== 1"
                  type="link"
                  size="small"
                  @click="handlePublishArticle(asArticle(record))"
                >
                  发布
                </Button>
                <Popconfirm
                  title="确认删除该教程？"
                  @confirm="handleDeleteArticle(asArticle(record))"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <Tabs.TabPane key="categories" tab="教程分类">
        <div class="toolbar">
          <Input.Search
            v-model:value="categoryQuery.search"
            allow-clear
            placeholder="搜索分类"
            style="width: 240px"
            @search="loadCategories"
          />
          <Button type="primary" @click="openCreateCategory">新增分类</Button>
        </div>

        <Table
          row-key="id"
          :columns="categoryColumns"
          :data-source="categoryRows"
          :loading="categoryLoading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'description'">
              {{ record.description || '-' }}
            </template>
            <template v-else-if="column.key === 'is_active'">
              <Switch
                :checked="record.is_active"
                @change="(checked) => handleCategorySwitchChange(record, checked)"
              />
            </template>
            <template v-else-if="column.key === 'operation'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="openEditCategory(asCategory(record))"
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该分类？"
                  @confirm="handleDeleteCategory(asCategory(record))"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>

    <ArticleEditorDrawer
      v-model:open="articleDrawerOpen"
      :article-id="editingArticleId"
      :categories="categories"
      @saved="handleArticleSaved"
    />
    <CategoryEditorDrawer
      v-model:open="categoryDrawerOpen"
      :category="editingCategory"
      @saved="handleCategorySaved"
    />
  </Page>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
