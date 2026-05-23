<script setup lang="ts">
import type {
  TutorialArticleListItem,
  TutorialCategory,
} from '#/api/tutorials';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-vue-next';

import { getTutorialArticles, getTutorialCategories } from '#/api/tutorials';

const router = useRouter();

const categories = ref<TutorialCategory[]>([]);
const articles = ref<TutorialArticleListItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const search = ref('');
const selectedCategoryId = ref<null | number>(null);
const page = ref(1);
const size = 9;
const total = ref(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)));

const selectedCategoryName = computed(() => {
  if (selectedCategoryId.value === null) return '全部';
  return (
    categories.value.find((category) => category.id === selectedCategoryId.value)
      ?.name ?? '全部'
  );
});

const visibleRange = computed(() => {
  if (total.value === 0) return '0-0';
  const start = (page.value - 1) * size + 1;
  const end = Math.min(page.value * size, total.value);
  return `${start}-${end}`;
});

function formatDate(value?: null | string) {
  if (!value) return '未发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function fetchCategories() {
  try {
    categories.value = await getTutorialCategories();
  } catch (error) {
    console.error('获取教程分类失败:', error);
    categories.value = [];
  }
}

async function fetchArticles() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getTutorialArticles({
      category_id: selectedCategoryId.value ?? undefined,
      page: page.value,
      search: search.value.trim() || undefined,
      size,
    });
    articles.value = result.items ?? [];
    total.value = result.total ?? 0;
  } catch (error) {
    console.error('获取教程列表失败:', error);
    articles.value = [];
    total.value = 0;
    errorMessage.value = '教程列表暂时无法加载，请稍后再试。';
  } finally {
    loading.value = false;
  }
}

function selectCategory(categoryId: null | number) {
  selectedCategoryId.value = categoryId;
}

function goToArticle(article: TutorialArticleListItem) {
  router.push(`/tutorials/${article.slug}`);
}

function goToPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) {
    return;
  }
  page.value = nextPage;
}

watch([search, selectedCategoryId], () => {
  if (page.value !== 1) {
    page.value = 1;
    return;
  }
  fetchArticles();
});

watch(page, () => {
  fetchArticles();
  window.scrollTo({ behavior: 'smooth', top: 0 });
});

onMounted(() => {
  fetchCategories();
  fetchArticles();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-16">
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div class="flex items-center gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 text-white shadow-inner ring-1 ring-black/5"
          >
            <BookOpen class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-slate-900">
              教程
            </h1>
            <p class="mt-0.5 text-[13px] font-medium text-slate-500">
              阅读平台操作指南、分析流程说明和生信实战内容。
            </p>
          </div>
        </div>
        <div class="text-sm font-medium text-slate-500">
          {{ selectedCategoryName }} · 共 {{ total }} 篇
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div class="relative w-full lg:max-w-md">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            autocomplete="off"
            class="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm leading-5 text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            name="tutorial-search"
            placeholder="搜索教程标题、摘要..."
            type="text"
          />
          <button
            v-if="search"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            type="button"
            @click="search = ''"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          <button
            class="whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all"
            :class="
              selectedCategoryId === null
                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            "
            type="button"
            @click="selectCategory(null)"
          >
            全部
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            class="whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-all"
            :class="
              selectedCategoryId === category.id
                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            "
            type="button"
            @click="selectCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </div>
      </div>
    </div>

    <main class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24"
      >
        <Loader2 class="mb-3 h-10 w-10 animate-spin text-cyan-600" />
        <span class="text-sm text-slate-500">加载教程中...</span>
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center"
      >
        <FileText class="mx-auto mb-3 h-10 w-10 text-rose-400" />
        <p class="text-sm font-medium text-slate-700">{{ errorMessage }}</p>
      </div>

      <div
        v-else-if="articles.length === 0"
        class="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"
      >
        <FileText class="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h2 class="text-base font-semibold text-slate-900">暂无匹配教程</h2>
        <p class="mt-2 text-sm text-slate-500">
          调整关键词或分类后再试试。
        </p>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="article in articles"
            :key="article.id"
            class="group flex min-h-[220px] cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-100/40"
            @click="goToArticle(article)"
          >
            <div class="mb-4 flex items-start justify-between gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
              >
                <FileText class="h-5 w-5" />
              </div>
              <div
                class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
              >
                <Eye class="h-3.5 w-3.5" />
                {{ article.view_count ?? 0 }}
              </div>
            </div>

            <h2
              class="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-cyan-700"
            >
              {{ article.title }}
            </h2>
            <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
              {{ article.summary || '查看完整教程内容。' }}
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="tag in article.tags || []"
                :key="tag"
                class="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
              >
                {{ tag }}
              </span>
            </div>

            <div class="mt-auto flex items-center justify-between pt-5">
              <span
                class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"
              >
                <CalendarDays class="h-3.5 w-3.5" />
                {{ formatDate(article.published_at || article.created_time) }}
              </span>
              <span
                class="text-sm font-semibold text-cyan-700 transition-transform group-hover:translate-x-0.5"
              >
                阅读
              </span>
            </div>
          </article>
        </div>

        <div
          class="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-slate-500">
            显示 {{ visibleRange }}，共 {{ total }} 篇
          </p>
          <div class="flex items-center gap-2">
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page <= 1"
              type="button"
              @click="goToPage(page - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <span class="min-w-20 text-center text-sm font-medium text-slate-700">
              {{ page }} / {{ totalPages }}
            </span>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page >= totalPages"
              type="button"
              @click="goToPage(page + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
