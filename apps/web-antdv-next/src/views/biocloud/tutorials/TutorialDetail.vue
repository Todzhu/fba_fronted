<script setup lang="ts">
import type {
  TutorialArticleDetail,
  TutorialArticleListItem,
} from '#/api/tutorials';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  Download,
  Eye,
  FileQuestion,
  Loader2,
  Paperclip,
  Tag,
} from 'lucide-vue-next';

import {
  getTutorialArticle,
  getTutorialArticles,
  increaseTutorialView,
} from '#/api/tutorials';

import { extractHeadings, markdownToTutorialHtml } from './markdown';

const route = useRoute();
const router = useRouter();

const article = ref<null | TutorialArticleDetail>(null);
const recentArticles = ref<TutorialArticleListItem[]>([]);
const loading = ref(false);
const errorMessage = ref('');

const slug = computed(() => String(route.params.slug || ''));
const headings = computed(() =>
  article.value ? extractHeadings(article.value.content_markdown || '') : [],
);
const articleHtml = computed(() =>
  article.value
    ? markdownToTutorialHtml(article.value.content_markdown || '')
    : '',
);
const readingMinutes = computed(() => {
  const textLength = article.value?.content_markdown?.replace(/\s+/g, '').length ?? 0;
  return Math.max(5, Math.ceil(textLength / 900));
});
const recentByYear = computed(() => {
  const groups = new Map<string, TutorialArticleListItem[]>();
  for (const item of recentArticles.value) {
    const dateValue = item.published_at || item.created_time || '';
    const date = new Date(dateValue);
    const year = Number.isNaN(date.getTime())
      ? '最近'
      : String(date.getFullYear());
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].map(([year, items]) => ({ items, year }));
});

function formatDate(value?: null | string) {
  if (!value) return '未发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function attachmentName(url: string) {
  const cleanUrl = url.split('?')[0] ?? url;
  const name = cleanUrl.split('/').filter(Boolean).pop();
  return name ? safeDecodeFilename(name) : '附件';
}

function safeDecodeFilename(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

async function loadArticle() {
  if (!slug.value) {
    article.value = null;
    errorMessage.value = '教程不存在。';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await getTutorialArticle(slug.value);
    article.value = result;
    increaseTutorialView(result.id).catch((error) => {
      console.error('增加教程浏览量失败:', error);
    });
  } catch (error) {
    console.error('获取教程详情失败:', error);
    article.value = null;
    errorMessage.value = '教程不存在或暂时无法加载。';
  } finally {
    loading.value = false;
  }
}

async function loadRecentArticles() {
  try {
    const result = await getTutorialArticles({ page: 1, size: 8 });
    recentArticles.value = result.items ?? [];
  } catch (error) {
    console.error('获取最近教程失败:', error);
    recentArticles.value = [];
  }
}

function goBack() {
  router.push('/tutorials');
}

function goToArticle(nextSlug: string) {
  if (nextSlug === slug.value) return;
  router.push(`/tutorials/${nextSlug}`);
}

onMounted(() => {
  loadArticle();
  loadRecentArticles();
});

watch(slug, () => {
  loadArticle();
});
</script>

<template>
  <div class="min-h-screen bg-white pb-20 text-[#171b21]">
    <main class="mx-auto max-w-[1760px] px-5 pt-10 sm:px-8 lg:px-12">
      <div
        v-if="loading"
        class="flex min-h-[50vh] flex-col items-center justify-center py-24"
      >
        <Loader2 class="mb-3 h-10 w-10 animate-spin text-emerald-700" />
        <span class="text-sm text-slate-500">加载教程内容中...</span>
      </div>

      <div
        v-else-if="errorMessage || !article"
        class="mx-auto max-w-xl px-6 py-24 text-center"
      >
        <FileQuestion class="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h2 class="text-base font-semibold text-slate-900">
          {{ errorMessage || '教程不存在。' }}
        </h2>
        <button
          class="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          type="button"
          @click="goBack"
        >
          返回教程列表
        </button>
      </div>

      <div
        v-else
        class="grid items-start gap-10 xl:grid-cols-[300px_minmax(0,860px)_260px] 2xl:grid-cols-[340px_minmax(0,900px)_300px]"
      >
        <aside class="hidden xl:block">
          <div class="sticky top-24 pr-8">
            <h2 class="text-lg font-black tracking-normal text-slate-950">
              最近文章
            </h2>
            <div class="mt-10 space-y-10">
              <section
                v-for="group in recentByYear"
                :key="group.year"
                class="space-y-5"
              >
                <h3 class="text-lg font-black text-slate-950">
                  {{ group.year }}
                </h3>
                <button
                  v-for="item in group.items"
                  :key="item.id"
                  class="block w-full text-left text-sm leading-6 transition-colors hover:text-emerald-700"
                  :class="
                    item.slug === slug
                      ? 'font-semibold text-emerald-700'
                      : 'font-medium text-slate-800'
                  "
                  type="button"
                  @click="goToArticle(item.slug)"
                >
                  {{ item.title }}
                </button>
              </section>
            </div>
          </div>
        </aside>

        <article class="min-w-0">
          <button
            class="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
            type="button"
            @click="goBack"
          >
            <ArrowLeft class="h-4 w-4" />
            返回教程列表
          </button>

          <header>
            <h1
              class="article-title text-[clamp(1.55rem,2.45vw,2.35rem)] font-black leading-[1.18] tracking-normal text-emerald-700"
            >
              {{ article.title }}
            </h1>

            <div
              class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-950"
            >
              <span>
                {{ formatDate(article.published_at || article.created_time) }}
              </span>
              <span class="text-slate-300">|</span>
              <span>阅读需 {{ readingMinutes }} 分钟</span>
              <span class="text-slate-300">|</span>
              <span class="inline-flex items-center gap-1.5 text-slate-500">
                <Eye class="h-3.5 w-3.5" />
                {{ article.view_count ?? 0 }}
              </span>
            </div>

            <p
              v-if="article.summary"
              class="mt-4 text-sm leading-[1.7] text-slate-950"
            >
              {{ article.summary }}
            </p>

            <div v-if="article.tags?.length" class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="tag in article.tags"
                :key="tag"
                class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
              >
                <Tag class="h-3 w-3" />
                {{ tag }}
              </span>
            </div>
          </header>

          <section
            v-if="article.attachment_urls?.length"
            class="mt-8 border-y border-slate-200 py-4"
          >
            <div class="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Paperclip class="h-4 w-4 text-cyan-700" />
              附件
            </div>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="url in article.attachment_urls"
                :key="url"
                :href="url"
                class="inline-flex max-w-full items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-cyan-200 hover:text-cyan-700"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Download class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ attachmentName(url) }}</span>
              </a>
            </div>
          </section>

          <section class="pt-12">
            <div class="tutorial-markdown" v-html="articleHtml"></div>
          </section>
        </article>

        <aside class="hidden lg:block">
          <div class="sticky top-24 border-l border-slate-200 pl-7">
            <nav v-if="headings.length" class="space-y-5">
              <a
                v-for="heading in headings"
                :key="heading.id"
                :class="[
                  'block text-sm font-medium leading-6 text-slate-500 transition-colors hover:text-emerald-700',
                  heading.depth === 1 ? 'text-slate-700' : '',
                  heading.depth === 2 ? 'pl-0' : '',
                  heading.depth === 3 ? 'pl-4 text-xs' : '',
                ]"
                :href="`#${heading.id}`"
              >
                {{ heading.text }}
              </a>
            </nav>
            <p v-else class="text-sm text-slate-400">暂无目录</p>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.tutorial-markdown {
  color: rgb(15 23 42);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Microsoft YaHei', sans-serif;
  font-size: 0.875rem;
  line-height: 1.72;
}

.article-title {
  color: rgb(4 120 87);
}

.tutorial-markdown :deep(h1),
.tutorial-markdown :deep(h2),
.tutorial-markdown :deep(h3) {
  color: rgb(23 27 33);
  font-weight: 900;
  letter-spacing: 0;
  scroll-margin-top: 96px;
}

.tutorial-markdown :deep(h1) {
  font-size: 1.45rem;
  line-height: 1.18;
  margin: 0 0 1rem;
}

.tutorial-markdown :deep(h2) {
  font-size: 1.18rem;
  line-height: 1.22;
  margin: 2.2rem 0 0.8rem;
}

.tutorial-markdown :deep(h3) {
  font-size: 1rem;
  line-height: 1.4;
  margin: 1.5rem 0 0.55rem;
}

.tutorial-markdown :deep(p) {
  margin: 0 0 0.9rem;
}

.tutorial-markdown :deep(strong) {
  color: rgb(23 27 33);
  font-weight: 900;
}

.tutorial-markdown :deep(ul),
.tutorial-markdown :deep(ol) {
  margin: 0 0 1.25rem 1.35rem;
  padding: 0;
}

.tutorial-markdown :deep(ul) {
  list-style: disc;
}

.tutorial-markdown :deep(ol) {
  list-style: decimal;
}

.tutorial-markdown :deep(li) {
  margin: 0.32rem 0;
  padding-left: 0.25rem;
}

.tutorial-markdown :deep(a) {
  color: rgb(4 120 87);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tutorial-markdown :deep(hr) {
  border: 0;
  border-top: 1px solid rgb(221 214 254);
  margin: 1.8rem 0;
}

.tutorial-markdown :deep(figure) {
  margin: 1.4rem 0 1.6rem;
}

.tutorial-markdown :deep(img) {
  border-radius: 8px;
  box-shadow: 0 12px 28px rgb(15 23 42 / 12%);
  display: block;
  height: auto;
  margin: 0 auto;
  max-width: 100%;
}

.tutorial-markdown :deep(pre) {
  background: rgb(17 24 39);
  color: rgb(226 232 240);
  margin: 1.35rem 0;
  overflow-x: auto;
  padding: 1rem 1.1rem;
}

.tutorial-markdown :deep(code) {
  background: rgb(241 245 249);
  color: rgb(15 23 42);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 0.9em;
  padding: 0.15rem 0.35rem;
}

.tutorial-markdown :deep(pre code) {
  background: transparent;
  color: inherit;
  display: block;
  font-size: 0.82rem;
  padding: 0;
}

.tutorial-markdown :deep(table) {
  border-collapse: collapse;
  font-size: 0.82rem;
  line-height: 1.6;
  margin: 1.5rem 0 1.75rem;
  width: 100%;
}

.tutorial-markdown :deep(th),
.tutorial-markdown :deep(td) {
  border: 1px solid rgb(214 219 226);
  padding: 0.7rem 0.85rem;
  text-align: left;
  vertical-align: top;
}

.tutorial-markdown :deep(th) {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-weight: 900;
  text-align: center;
}

.tutorial-markdown :deep(tr:nth-child(even) td) {
  background: rgb(248 250 252);
}

.tutorial-markdown :deep(.callout) {
  border-left: 4px solid rgb(16 185 129);
  background: rgb(240 253 244);
  margin: 1.5rem 0;
  padding: 0.9rem 1rem 0.1rem;
}

.tutorial-markdown :deep(.callout h2),
.tutorial-markdown :deep(.callout h3) {
  font-size: 0.95rem;
  margin-top: 0;
}

@media (max-width: 640px) {
  .tutorial-markdown {
    font-size: 0.86rem;
  }

  .tutorial-markdown :deep(h1) {
    font-size: 1.25rem;
  }

  .tutorial-markdown :deep(h2) {
    font-size: 1.08rem;
  }

  .tutorial-markdown :deep(table) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
