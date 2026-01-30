<script setup lang="ts">
/**
 * BioCloud Landing Page - 故事叙述型
 * 路由: /index
 * 设计: 痛点共鸣 → 解决方案 → 工具展示 → 信任背书
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Activity,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  FileText,
  FlaskConical,
  Layers,
  LineChart,
  PieChart,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Users,
  Zap,
} from 'lucide-vue-next';

import AuthModal from './components/AuthModal.vue';

const router = useRouter();
const showAuthModal = ref(false);

// Mock 数据 - 热门工具
const popularTools = ref([
  {
    id: 1,
    name: 'ROE 富集分析',
    description: '计算基因集的观察/期望比值',
    category: 'Bulk RNA',
    icon: BarChart3,
    uses: 1234,
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
  },
  {
    id: 2,
    name: '火山图',
    description: '差异表达基因可视化',
    category: 'Bulk RNA',
    icon: LineChart,
    uses: 3567,
    image:
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=250&fit=crop',
  },
  {
    id: 3,
    name: 'PCA 降维',
    description: '主成分分析与可视化',
    category: 'scRNA-seq',
    icon: Layers,
    uses: 2890,
    image:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=250&fit=crop',
  },
  {
    id: 4,
    name: '热图绑制',
    description: '表达量热图聚类可视化',
    category: '可视化',
    icon: Database,
    uses: 4521,
    image:
      'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=250&fit=crop',
  },
  {
    id: 5,
    name: 'KEGG/GO 通路',
    description: '深入解析基因功能通路与生物学意义',
    category: 'Enrichment',
    icon: BarChart3,
    uses: 2100,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  },
  {
    id: 6,
    name: '生存分析',
    description: '临床预后评估与生存曲线绘制 (KM-Plot)',
    category: 'Clinical',
    icon: Activity,
    uses: 1890,
    image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557',
  },
  {
    id: 7,
    name: 'Venn 韦恩图',
    description: '多组数据交集与差异可视化',
    category: 'Basic',
    icon: PieChart,
    uses: 5600,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9',
  },
  {
    id: 8,
    name: '互作网络',
    description: '探索关键基因与蛋白相互作用关系 (PPI)',
    category: 'Network',
    icon: Share2,
    uses: 3200,
    image: 'https://images.unsplash.com/photo-1529810314902-366916060c2c',
  },
]);

// Mock 数据 - KPI 统计
const stats = ref([
  { label: '分析工具', value: '50+', icon: FlaskConical },
  { label: '注册用户', value: '1,000+', icon: Users },
  { label: '分析任务', value: '10,000+', icon: FileText },
  { label: '平均响应', value: '<30s', icon: Clock },
]);

// Mock 数据 - 用户痛点
const painPoints = ref([
  { icon: '🖥️', text: '命令行太复杂，学习成本高' },
  { icon: '🔄', text: '参数调了几十遍，结果还是不对' },
  { icon: '📁', text: '数据文件乱放，找不到上次的分析结果' },
  { icon: '🔍', text: '分析结果不可重现，无法追溯参数' },
]);

// Mock 数据 - 解决方案
const solutions = ref([
  {
    icon: Zap,
    title: '云工具',
    description: '50+ 专业分析工具，可视化配置，即时出结果',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Layers,
    title: '云流程',
    description: 'scRNA-seq 12步完整流程，每步可调参，状态可追溯',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: Database,
    title: '数据管理',
    description: '个人云盘 + 项目关联，数据归档井井有条',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: RefreshCw,
    title: '任务追溯',
    description: '参数快照、一键重跑、结果对比，完整可复现',
    color: 'from-purple-500 to-purple-600',
  },
]);

// Mock 数据 - 组学分类
const omicsCategories = ref([
  { name: 'Bulk RNA-seq', count: 18, color: 'bg-blue-100 text-blue-700' },
  { name: 'scRNA-seq', count: 15, color: 'bg-orange-100 text-orange-700' },
  { name: '蛋白组学', count: 8, color: 'bg-emerald-100 text-emerald-700' },
  { name: '代谢组学', count: 6, color: 'bg-purple-100 text-purple-700' },
  { name: '可视化', count: 12, color: 'bg-pink-100 text-pink-700' },
]);

// 搜索
const searchQuery = ref('');

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/tools', query: { q: searchQuery.value } });
  }
};

const goToTools = () => {
  showAuthModal.value = true;
};

const navItems = [
  { name: '云工具', href: '/tools', icon: FlaskConical },
  { name: '云流程', href: '/pipeline', icon: Layers },
  { name: '我的数据', href: '/data', icon: Database },
  { name: '我的任务', href: '/tasks', icon: RefreshCw },
];

const goToLogin = () => {
  showAuthModal.value = true;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <!-- 导航栏 (悬浮设计) -->
    <header class="fixed inset-x-0 top-6 z-50 mx-auto max-w-6xl px-4">
      <div
        class="flex h-16 items-center justify-between rounded-2xl border border-white/40 bg-white/70 px-6 shadow-lg shadow-slate-200/20 backdrop-blur-xl transition-all hover:bg-white/80"
      >
        <!-- Logo -->
        <div
          class="flex w-[200px] cursor-pointer items-center gap-2"
          @click="router.push('/')"
        >
          <div
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-300"
          >
            <div class="font-bold">B</div>
          </div>
          <span class="text-lg font-bold text-slate-800">BioCloud</span>
        </div>

        <!-- 导航 (居中) -->
        <nav
          class="hidden items-center gap-1 rounded-full border border-white/50 bg-slate-100/50 p-1 md:flex"
        >
          <a
            v-for="item in navItems"
            :key="item.name"
            :href="item.href"
            class="flex items-center gap-1.5 rounded-full px-4 py-2 text-base font-bold text-slate-700 transition-all hover:bg-white hover:text-blue-600 hover:shadow-sm"
          >
            <component
              :is="item.icon"
              class="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100"
            />
            {{ item.name }}
          </a>
        </nav>

        <!-- 右侧操作区 -->
        <div class="flex w-[200px] items-center justify-end gap-3">
          <button
            @click="goToTools"
            class="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
          >
            <Sparkles class="h-4 w-4 text-blue-300" />
            <span>开始使用</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Hero 区域 -->
    <section class="relative overflow-hidden bg-white pb-32 pt-40">
      <!-- 网格背景装饰 -->
      <div
        class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
      ></div>
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
      ></div>

      <!-- 渐变光晕 -->
      <div
        class="pointer-events-none absolute left-1/2 top-0 h-[500px] w-full max-w-[1000px] -translate-x-1/2 opacity-30"
      >
        <div
          class="animate-blob absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mix-blend-multiply blur-[100px]"
        ></div>
      </div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <!-- 标语 -->
          <div
            class="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 text-sm font-medium text-blue-600 backdrop-blur-sm"
          >
            <Sparkles class="h-4 w-4" />
            <span>让生信分析像点外卖一样简单</span>
          </div>

          <!-- 主标题 -->
          <h1
            class="animate-fade-in-up mb-6 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
            style="animation-delay: 0.1s"
          >
            释放多组学数据的
            <span class="relative inline-block">
              <span
                class="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                >无限潜能</span
              >
              <span
                class="absolute -bottom-2 left-0 h-3 w-full -rotate-1 bg-blue-200/50 blur-sm"
              ></span>
            </span>
          </h1>

          <!-- 副标题 -->
          <p
            class="animate-fade-in-up mx-auto mb-10 max-w-2xl text-base text-slate-600 md:text-lg"
            style="animation-delay: 0.2s"
          >
            BioCloud 为科研人员打造的一站式分析云平台。<br />
            无需编程基础，<span class="font-bold text-slate-900"
              >可视化配置</span
            >，即时获取高质量出版级图表。
          </p>

          <!-- 搜索框区域 -->
          <div
            class="animate-fade-in-up mx-auto mb-12 max-w-3xl"
            style="animation-delay: 0.3s"
          >
            <div
              class="relative flex items-center rounded-2xl bg-white p-1 shadow-xl shadow-blue-900/5 ring-1 ring-slate-200 transition-all hover:shadow-2xl hover:shadow-blue-900/10 hover:ring-blue-200"
            >
              <div
                class="flex h-12 w-12 items-center justify-center text-slate-400"
              >
                <Search class="h-5 w-5" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="试试搜索：ROE分析、单细胞聚类、火山图..."
                class="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                @keyup.enter="handleSearch"
              />
              <button
                @click="handleSearch"
                class="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-95"
              >
                搜索
              </button>
            </div>
          </div>

          <!-- 辅助链接 -->
          <div
            class="flex items-center justify-center gap-8 text-sm font-medium text-slate-500"
          >
            <span class="flex items-center gap-2">
              <CheckCircle class="h-4 w-4 text-emerald-500" />
              免费开始
            </span>
            <span class="flex items-center gap-2">
              <CheckCircle class="h-4 w-4 text-emerald-500" />
              无需代码
            </span>
            <span class="flex items-center gap-2">
              <CheckCircle class="h-4 w-4 text-emerald-500" />
              云端存储
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门工具 (向上重叠) -->
    <section class="relative z-10 -mt-20 pb-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 工具网格 -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="tool in popularTools"
            :key="tool.id"
            class="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <!-- 预览图 -->
            <div class="relative h-40 overflow-hidden">
              <img
                :src="tool.image"
                :alt="tool.name"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              ></div>
            </div>
            <!-- 内容 -->
            <div class="p-5">
              <div class="mb-2 flex items-center justify-between">
                <h3 class="font-bold text-slate-900 group-hover:text-blue-600">
                  {{ tool.name }}
                </h3>
                <span
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                >
                  {{ tool.uses }} 次
                </span>
              </div>
              <p class="mb-3 text-sm text-slate-500">{{ tool.description }}</p>
              <div class="flex items-center justify-between">
                <span
                  class="inline-block rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600"
                >
                  {{ tool.category }}
                </span>
                <ChevronRight
                  class="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 查看全部链接 -->
        <div class="mt-8 text-center">
          <button
            @click="goToTools"
            class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
          >
            查看目前已有 {{ stats[0]?.value }} 款工具
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- 数据亮点 -->
    <section class="border-y border-slate-200 bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div
              class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50"
            >
              <component :is="stat.icon" class="h-6 w-6 text-blue-600" />
            </div>
            <div class="text-3xl font-bold text-slate-900">
              {{ stat.value }}
            </div>
            <div class="text-sm text-slate-500">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 痛点区域 -->
    <section class="bg-slate-50 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h2 class="mb-4 text-3xl font-bold text-slate-900">
            你是否遇到这些问题？
          </h2>
          <p class="mb-12 text-slate-500">传统生信分析的常见痛点</p>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="pain in painPoints"
            :key="pain.text"
            class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-red-200 hover:shadow-md"
          >
            <span class="text-2xl">{{ pain.icon }}</span>
            <p class="text-slate-600">{{ pain.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 解决方案 -->
    <section class="bg-slate-900 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h2 class="mb-4 text-3xl font-bold text-white">我们如何帮你解决</h2>
          <p class="mb-12 text-slate-400">四大核心功能，覆盖完整分析流程</p>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="solution in solutions"
            :key="solution.title"
            class="group cursor-pointer rounded-2xl border border-slate-700 bg-slate-800/50 p-8 transition-all hover:border-slate-600 hover:bg-slate-800"
          >
            <div
              :class="`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${solution.color}`"
            >
              <component :is="solution.icon" class="h-7 w-7 text-white" />
            </div>
            <h3 class="mb-3 text-xl font-bold text-white">
              {{ solution.title }}
            </h3>
            <p class="text-slate-400">{{ solution.description }}</p>
            <div
              class="mt-4 flex items-center gap-1 text-sm text-blue-400 opacity-0 transition-opacity group-hover:opacity-100"
            >
              了解更多
              <ChevronRight class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 组学分类入口 -->
    <section class="py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-8 text-center">
          <h2 class="text-2xl font-bold text-slate-900">探索更多领域</h2>
        </div>
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="cat in omicsCategories"
            :key="cat.name"
            :class="`cursor-pointer rounded-full px-6 py-3 text-base font-medium transition-all hover:shadow-md ${cat.color}`"
          >
            {{ cat.name }} ({{ cat.count }})
          </button>
        </div>
      </div>
    </section>

    <!-- CTA 区域 -->
    <section class="bg-white py-12 sm:py-24">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div
          class="relative isolate overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-slate-50 to-blue-50 px-6 py-16 text-center shadow-2xl shadow-blue-900/5 ring-1 ring-slate-200 sm:px-16"
        >
          <h2
            class="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            准备好挖掘数据价值了吗？<br />
            <span class="text-blue-600">BioCloud</span> 助您一臂之力。
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
            无需繁琐的环境配置，无需昂贵的硬件投入。<br />
            注册即送 100 积分，免费体验所有基础分析流程。
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <button
              @click="goToTools"
              class="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-95"
            >
              免费开始使用
            </button>
            <button
              @click="goToLogin"
              class="text-base font-semibold leading-6 text-slate-900 transition-colors hover:text-blue-600"
            >
              已有账号？登录 <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- 装饰元素 -->
          <svg
            viewBox="0 0 1024 1024"
            class="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
            aria-hidden="true"
          >
            <circle
              cx="512"
              cy="512"
              r="512"
              fill="url(#gradient)"
              fill-opacity="0.25"
            />
            <defs>
              <radialGradient id="gradient">
                <stop stop-color="#3B82F6" />
                <stop offset="1" stop-color="#E935C1" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="border-t border-slate-200 bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-8 md:grid-cols-4">
          <!-- Logo & 简介 -->
          <div class="md:col-span-2">
            <div class="mb-4 flex items-center gap-2">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
              >
                B
              </div>
              <span class="text-lg font-bold text-slate-900">BioCloud</span>
            </div>
            <p class="max-w-sm text-sm text-slate-500">
              专业的多组学生物信息分析云平台，致力于降低生信分析门槛，
              为科研人员提供高效、准确、易用的分析工具。
            </p>
          </div>

          <!-- 产品 -->
          <div>
            <h4 class="mb-4 font-semibold text-slate-900">产品服务</h4>
            <ul class="space-y-2 text-sm text-slate-500">
              <li>
                <a href="/tools" class="transition-colors hover:text-blue-600"
                  >云工具</a
                >
              </li>
              <li>
                <a
                  href="/pipeline"
                  class="transition-colors hover:text-blue-600"
                  >云流程</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >API 文档</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >定制开发</a
                >
              </li>
            </ul>
          </div>

          <!-- 支持 -->
          <div>
            <h4 class="mb-4 font-semibold text-slate-900">帮助支持</h4>
            <ul class="space-y-2 text-sm text-slate-500">
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >使用教程</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >常见问题</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >技术支持</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-600"
                  >联系我们</a
                >
              </li>
            </ul>
          </div>
        </div>

        <!-- 底部版权 -->
        <div
          class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 md:flex-row"
        >
          <p class="text-sm text-slate-500">
            &copy; 2026 BioCloud Team. All rights reserved.
          </p>
          <div class="flex gap-6 text-sm text-slate-500">
            <a href="#" class="transition-colors hover:text-slate-900"
              >隐私政策</a
            >
            <a href="#" class="transition-colors hover:text-slate-900"
              >服务条款</a
            >
          </div>
        </div>
      </div>
    </footer>

    <!-- 登录/注册弹窗 -->
    <AuthModal :is-open="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>

<style scoped>
/* Custom Animations */
@keyframes blob {
  0% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -50px) scale(1.1);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }

  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

html {
  scroll-behavior: smooth;
}

.animate-blob {
  animation: blob 7s infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s ease-out forwards;
}

/* 平滑滚动 */
</style>
