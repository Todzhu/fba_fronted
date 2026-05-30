<script setup lang="ts">
import type { TutorialArticleListItem } from '#/api/tutorials';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-vue-next';

import { getTutorialArticles } from '#/api/tutorials';

import {
  estimateReadingMinutes,
  groupArticlesByYear,
} from './TutorialList.helpers';

const router = useRouter();

const articles = ref<TutorialArticleListItem[]>([]);
const recentArticles = ref<TutorialArticleListItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');
const search = ref('');
const page = ref(1);
const size = 5;
const total = ref(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)));
const recentByYear = computed(() => groupArticlesByYear(recentArticles.value));

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
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

async function fetchArticles() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getTutorialArticles({
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

async function fetchRecentArticles() {
  try {
    const result = await getTutorialArticles({ page: 1, size: 10 });
    recentArticles.value = result.items ?? [];
  } catch (error) {
    console.error('获取最近教程失败:', error);
    recentArticles.value = [];
  }
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

watch(search, () => {
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
  fetchArticles();
  fetchRecentArticles();
});
</script>

<template>
  <div class="min-h-screen bg-white pb-20 text-[#171b21]">
    <div class="mx-auto max-w-[1760px] px-5 pt-10 sm:px-8 lg:px-12">
      <div class="mb-12 flex flex-col gap-5 lg:ml-[360px] lg:max-w-[900px]">
        <div>
          <h1 class="text-3xl font-black tracking-normal text-slate-950">
            教程
          </h1>
          <p class="mt-3 text-base leading-7 text-slate-600">
            阅读平台操作指南、分析流程说明和生信实战内容。
          </p>
        </div>

        <div class="relative w-full max-w-2xl">
          <Search
            class="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            autocomplete="off"
            class="block w-full border-0 border-b border-slate-300 bg-transparent py-3 pl-8 pr-10 text-base leading-7 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700"
            name="tutorial-search"
            placeholder="搜索教程标题、摘要..."
            type="text"
          />
          <button
            v-if="search"
            class="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-900"
            type="button"
            @click="search = ''"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <main class="grid items-start gap-12 xl:grid-cols-[300px_minmax(0,1020px)] 2xl:grid-cols-[340px_minmax(0,1080px)]">
        <aside class="hidden xl:block">
          <div class="sticky top-24 pr-8">
            <h2 class="text-xl font-black tracking-normal text-slate-950">
              最近文章
            </h2>
            <div v-if="recentByYear.length" class="mt-10 space-y-10">
              <section
                v-for="group in recentByYear"
                :key="group.year"
                class="space-y-5"
              >
                <h3 class="text-lg font-black text-slate-950">
                  {{ group.year }}
                </h3>
                <button
                  v-for="article in group.articles"
                  :key="article.id"
                  class="block w-full text-left text-sm font-medium leading-6 text-slate-800 transition-colors hover:text-emerald-700"
                  type="button"
                  @click="goToArticle(article)"
                >
                  {{ article.title }}
                </button>
              </section>
            </div>
            <p v-else class="mt-8 text-sm text-slate-500">
              暂无文章
            </p>
          </div>
        </aside>

        <section class="min-w-0">
          <div
            v-if="loading"
            class="flex min-h-[360px] flex-col items-center justify-center py-24"
          >
            <Loader2 class="mb-3 h-10 w-10 animate-spin text-emerald-700" />
            <span class="text-sm text-slate-500">加载教程中...</span>
          </div>

          <div
            v-else-if="errorMessage"
            class="px-6 py-20 text-center"
          >
            <FileText class="mx-auto mb-3 h-10 w-10 text-rose-400" />
            <p class="text-sm font-medium text-slate-700">{{ errorMessage }}</p>
          </div>

          <div
            v-else-if="articles.length === 0"
            class="px-6 py-20 text-center"
          >
            <FileText class="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h2 class="text-base font-semibold text-slate-900">暂无匹配教程</h2>
            <p class="mt-2 text-sm text-slate-500">
              调整关键词后再试试。
            </p>
          </div>

          <template v-else>
            <div class="space-y-20">
              <article
                v-for="article in articles"
                :key="article.id"
                class="max-w-[1020px]"
              >
                <button
                  class="block text-left"
                  type="button"
                  @click="goToArticle(article)"
                >
                  <h2
                    class="text-[clamp(1.45rem,2.4vw,2.1rem)] font-black leading-[1.18] tracking-normal text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    {{ article.title }}
                  </h2>
                </button>

                <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-950">
                  <span>
                    {{ formatDate(article.published_at || article.created_time) }}
                  </span>
                  <span class="text-slate-300">·</span>
                  <span>
                    阅读需
                    {{ estimateReadingMinutes(article.title, article.summary) }}
                    分钟
                  </span>
                  <span class="text-slate-300">·</span>
                  <span class="inline-flex items-center gap-1.5 text-slate-500">
                    <Eye class="h-3.5 w-3.5" />
                    {{ article.view_count ?? 0 }}
                  </span>
                </div>

                <p class="mt-5 max-w-[800px] text-base leading-[1.75] text-slate-950">
                  {{ article.summary || '查看完整教程内容。' }}
                </p>

                <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="text-sm font-black text-slate-950">标签:</span>
                    <span
                      v-for="tag in article.tags || []"
                      :key="tag"
                      class="border border-slate-200 px-2.5 py-1 text-sm font-medium text-emerald-700"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <button
                    class="text-base font-black text-emerald-700 transition-colors hover:text-emerald-900"
                    type="button"
                    @click="goToArticle(article)"
                  >
                    阅读更多
                  </button>
                </div>
              </article>
            </div>

            <div
              class="mt-16 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-sm font-medium text-slate-500">
                显示 {{ visibleRange }}，共 {{ total }} 篇
              </p>
              <div class="flex items-center gap-3">
                <button
                  class="inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="page <= 1"
                  type="button"
                  @click="goToPage(page - 1)"
                >
                  <ChevronLeft class="h-5 w-5" />
                </button>
                <span class="min-w-20 text-center text-sm font-bold text-slate-700">
                  {{ page }} / {{ totalPages }}
                </span>
                <button
                  class="inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-slate-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="page >= totalPages"
                  type="button"
                  @click="goToPage(page + 1)"
                >
                  <ChevronRight class="h-5 w-5" />
                </button>
              </div>
            </div>
          </template>
        </section>
      </main>
    </div>
  </div>
</template>
