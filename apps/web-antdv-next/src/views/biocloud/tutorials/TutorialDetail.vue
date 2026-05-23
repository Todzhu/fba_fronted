<script setup lang="ts">
import type { TutorialArticleDetail } from '#/api/tutorials';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileQuestion,
  Loader2,
  Paperclip,
  Tag,
} from 'lucide-vue-next';

import { getTutorialArticle, increaseTutorialView } from '#/api/tutorials';

import { extractHeadings, markdownToTutorialHtml } from './markdown';

const route = useRoute();
const router = useRouter();

const article = ref<null | TutorialArticleDetail>(null);
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

function formatDate(value?: null | string) {
  if (!value) return '未发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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

function goBack() {
  router.push('/tutorials');
}

onMounted(loadArticle);

watch(slug, () => {
  loadArticle();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-16">
    <div class="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        class="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div class="flex items-center gap-4">
          <button
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            type="button"
            @click="goBack"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Tutorial
            </p>
            <h1 class="mt-1 text-lg font-bold tracking-tight text-slate-900">
              教程详情
            </h1>
          </div>
        </div>
        <button
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          type="button"
          @click="goBack"
        >
          返回列表
        </button>
      </div>
    </div>

    <main class="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24"
      >
        <Loader2 class="mb-3 h-10 w-10 animate-spin text-cyan-600" />
        <span class="text-sm text-slate-500">加载教程内容中...</span>
      </div>

      <div
        v-else-if="errorMessage || !article"
        class="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"
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

      <div v-else class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article class="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <header class="border-b border-slate-200 px-5 py-6 sm:px-8">
            <h2 class="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
              {{ article.title }}
            </h2>
            <p
              v-if="article.summary"
              class="mt-4 max-w-3xl text-sm leading-6 text-slate-600"
            >
              {{ article.summary }}
            </p>

            <div class="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1.5">
                <CalendarDays class="h-3.5 w-3.5" />
                {{ formatDate(article.published_at || article.created_time) }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Eye class="h-3.5 w-3.5" />
                {{ article.view_count ?? 0 }} 次浏览
              </span>
            </div>

            <div v-if="article.tags?.length" class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="tag in article.tags"
                :key="tag"
                class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                <Tag class="h-3 w-3" />
                {{ tag }}
              </span>
            </div>
          </header>

          <section
            v-if="article.attachment_urls?.length"
            class="border-b border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-8"
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
                class="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-cyan-200 hover:text-cyan-700"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Download class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ attachmentName(url) }}</span>
              </a>
            </div>
          </section>

          <section class="px-5 py-7 sm:px-8">
            <div class="tutorial-markdown" v-html="articleHtml"></div>
          </section>
        </article>

        <aside class="hidden lg:block">
          <div class="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 class="text-sm font-bold text-slate-900">目录</h3>
            <nav v-if="headings.length" class="mt-4 space-y-1">
              <a
                v-for="heading in headings"
                :key="heading.id"
                :class="[
                  'block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-cyan-700',
                  heading.depth === 2 ? 'ml-3' : '',
                  heading.depth === 3 ? 'ml-6 text-xs' : '',
                ]"
                :href="`#${heading.id}`"
              >
                {{ heading.text }}
              </a>
            </nav>
            <p v-else class="mt-4 text-sm text-slate-400">暂无目录</p>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.tutorial-markdown {
  color: rgb(51 65 85);
  font-size: 15px;
  line-height: 1.85;
}

.tutorial-markdown :deep(h1),
.tutorial-markdown :deep(h2),
.tutorial-markdown :deep(h3) {
  color: rgb(15 23 42);
  font-weight: 800;
  letter-spacing: 0;
  scroll-margin-top: 96px;
}

.tutorial-markdown :deep(h1) {
  font-size: 1.75rem;
  line-height: 1.25;
  margin: 0 0 1rem;
}

.tutorial-markdown :deep(h2) {
  border-top: 1px solid rgb(226 232 240);
  font-size: 1.35rem;
  line-height: 1.35;
  margin: 2rem 0 0.85rem;
  padding-top: 1.35rem;
}

.tutorial-markdown :deep(h3) {
  font-size: 1.08rem;
  line-height: 1.4;
  margin: 1.5rem 0 0.7rem;
}

.tutorial-markdown :deep(p) {
  margin: 0 0 1rem;
}

.tutorial-markdown :deep(a) {
  color: rgb(14 116 144);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tutorial-markdown :deep(pre) {
  background: rgb(15 23 42);
  border-radius: 12px;
  color: rgb(226 232 240);
  margin: 1.25rem 0;
  overflow-x: auto;
  padding: 1rem;
}

.tutorial-markdown :deep(code) {
  background: rgb(241 245 249);
  border-radius: 6px;
  color: rgb(15 23 42);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 0.9em;
  padding: 0.15rem 0.35rem;
}

.tutorial-markdown :deep(pre code) {
  background: transparent;
  border-radius: 0;
  color: inherit;
  display: block;
  font-size: 0.875rem;
  padding: 0;
}
</style>
