<script setup lang="ts">
/**
 * BioCloud Landing Page - Glassmorphism 重设计
 * 特点：暗色渐变Hero、毛玻璃卡片、彩色光源blob、现代能量感
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  FlaskConical,
  GitBranch,
  Layers,
  LineChart,
  Play,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-vue-next';

const router = useRouter();

// ========== 轮播 Banner 数据 ==========
const bannerSlides = [
  {
    title: '释放多组学数据的无限潜能',
    subtitle:
      '整合前沿生信技术与实际分析场景，提供定制化解决方案，让数据驱动决策。',
    btnText: '探索工具',
    btnLink: '/tools',
    icon: Zap,
    accentColor: 'text-amber-400',
  },
  {
    title: '单细胞转录组全流程分析',
    subtitle:
      '从 QC 到细胞注释，12 步标准化 scRNA-seq 分析云流程，每步可调参，状态实时追踪。',
    btnText: '进入流程',
    btnLink: '/pipeline',
    icon: GitBranch,
    accentColor: 'text-emerald-400',
  },
  {
    title: '50+ 专业在线分析工具',
    subtitle:
      '可视化配置、在线表格编辑、无需编程，一键获取出版级图表。覆盖转录组、蛋白组、代谢组。',
    btnText: '立即体验',
    btnLink: '/tools',
    icon: Sparkles,
    accentColor: 'text-violet-400',
  },
];

const currentSlide = ref(0);
let slideTimer: null | ReturnType<typeof setInterval> = null;

// ========== Hero 右侧图片 ==========
const heroImages = [
  {
    src: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=400&fit=crop',
    alt: '生物信息分析实验室',
  },
  {
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&crop=top',
    alt: '',
  },
];

// ========== Hero 浮动特性卡片 ==========
const heroFeatures = [
  {
    icon: Wifi,
    label: '高速云计算',
    desc: 'GPU 集群加速',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: CheckCircle,
    label: '全流程覆盖',
    desc: '50+ 分析工具',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
];

// ========== Hero 底部内联统计 ==========
const heroStats = [
  { value: '50+', label: '分析工具' },
  { value: '12', label: '步标准流程' },
  { value: '99.9%', label: '系统可靠性' },
];

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % bannerSlides.length;
};

const prevSlide = () => {
  currentSlide.value =
    (currentSlide.value - 1 + bannerSlides.length) % bannerSlides.length;
};

const goToSlide = (index: number) => {
  currentSlide.value = index;
};

// 当前幻灯片数据
const activeSlide = computed(() => bannerSlides[currentSlide.value]!);

onMounted(() => {
  slideTimer = setInterval(nextSlide, 5000);
});

onUnmounted(() => {
  if (slideTimer) clearInterval(slideTimer);
});

// ========== 快速入口 ==========
const quickEntries = [
  {
    name: '云工具',
    desc: '50+ 专业工具',
    icon: Wrench,
    link: '/tools',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'group-hover:shadow-blue-500/25',
  },
  {
    name: '云流程',
    desc: 'scRNA-seq 全流程',
    icon: GitBranch,
    link: '/pipeline',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/25',
  },
  {
    name: '我的数据',
    desc: '个人云盘管理',
    icon: Database,
    link: '/data',
    gradient: 'from-orange-500 to-amber-600',
    glow: 'group-hover:shadow-orange-500/25',
  },
  {
    name: '快速上手',
    desc: '5 分钟入门教程',
    icon: BookOpen,
    link: '/tools',
    gradient: 'from-purple-500 to-pink-600',
    glow: 'group-hover:shadow-purple-500/25',
  },
];

// ========== 统计数据 ==========
const statsData = [
  { value: '50+', label: '专业分析工具', icon: FlaskConical },
  { value: '10K+', label: '注册用户', icon: Users },
  { value: '100K+', label: '分析完成次数', icon: TrendingUp },
  { value: '99.9%', label: '系统可靠性', icon: Star },
];

// ========== 特色产品 ==========
const capabilities = [
  {
    icon: Zap,
    title: '云工具',
    description:
      '50+ 专业分析工具，涵盖转录组学、单细胞、蛋白组学、代谢组学，可视化配置，无需编程。',
    gradient: 'from-blue-500 to-indigo-600',
    bgGlow: 'bg-blue-500/10',
    users: '4,221',
    rating: 5,
    link: '/tools',
    tags: ['转录组学', '可视化', '一键出图'],
  },
  {
    icon: Layers,
    title: '云流程',
    description:
      'scRNA-seq 完整分析流程，从 QC 到细胞注释，每步可调参，状态实时追踪。',
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500/10',
    users: '2,108',
    rating: 5,
    link: '/pipeline',
    tags: ['scRNA-seq', '全流程', '可调参'],
  },
  {
    icon: Database,
    title: '数据管理',
    description:
      '个人云盘 + 项目关联，50GB 存储空间，数据归档井井有条，随时调用与分享。',
    gradient: 'from-orange-500 to-red-500',
    bgGlow: 'bg-orange-500/10',
    users: '1,450',
    rating: 4,
    link: '/data',
    tags: ['云盘', '项目管理', '50GB'],
  },
];

// ========== 热门工具（画廊式） ==========
const galleryTools = [
  {
    name: '火山图',
    category: '蛋白组学',
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-amber-500/10',
    borderColor: 'border-orange-500/20',
    views: 4885,
  },
  {
    name: '主成分分析',
    category: '转录组学',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'border-blue-500/20',
    views: 9803,
  },
  {
    name: 'Ro/e 分析',
    category: '单细胞',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/20',
    views: 1200,
  },
  {
    name: 'Heatmap 热图',
    category: '转录组学',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-violet-500/10',
    borderColor: 'border-purple-500/20',
    views: 7755,
  },
  {
    name: '差异基因火山图',
    category: '单细胞',
    color: 'text-rose-400',
    bgGradient: 'from-rose-500/20 to-pink-500/10',
    borderColor: 'border-rose-500/20',
    views: 575,
  },
  {
    name: 'Monocle2 拟时序',
    category: '单细胞',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 to-sky-500/10',
    borderColor: 'border-cyan-500/20',
    views: 4733,
  },
];

// ========== 媒体/教程内容 ==========
const mediaContent = [
  {
    title: '快速上手：5分钟完成首个分析',
    description:
      '从数据上传到出图，手把手带你体验云分析全流程。适合零基础用户快速入门。',
    views: '22.5K',
    likes: '1.2K',
    duration: '05:28',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    title: 'scRNA-seq 分析实战教程',
    description: '从原始数据到细胞注释，完整单细胞分析流程详解。',
    views: '48.3K',
    likes: '3.6K',
    duration: '12:45',
    gradient: 'from-purple-600 to-pink-600',
  },
];

// ========== 方法 ==========
const goToTools = () => router.push('/tools');
const goToFeature = (path: string) => router.push(path);

// 格式化浏览量
const formatViews = (views: number): string => {
  if (views >= 10_000) return `${(views / 10_000).toFixed(1)}W`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return String(views);
};
</script>

<template>
  <div class="landing-page font-sans text-slate-900">
    <!-- ========== Hero 区域（浅色 + Aurora 动态背景 + 图片拼贴） ========== -->
    <section
      class="relative min-h-[600px] overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white lg:min-h-[680px]"
    >
      <!-- Aurora 极光动态背景层 -->
      <div class="aurora-bg pointer-events-none absolute inset-0">
        <div class="aurora-layer"></div>
      </div>

      <!-- 柔和装饰光点 -->
      <div
        class="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-[120px]"
      ></div>
      <div
        class="pointer-events-none absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-pink-200/15 blur-[120px]"
      ></div>

      <div
        class="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20"
      >
        <div
          class="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-20"
        >
          <!-- ====== 左侧文字区 ====== -->
          <div class="flex-1 text-center lg:text-left">
            <!-- 标签 badge -->
            <div
              class="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5"
            >
              <Star class="h-3.5 w-3.5 fill-purple-500 text-purple-500" />
              <span class="text-sm font-semibold text-purple-700"
                >多组学生信分析云平台</span
              >
            </div>

            <!-- 轮播标题 -->
            <transition name="slide-fade" mode="out-in">
              <div :key="currentSlide">
                <h1
                  class="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]"
                >
                  {{ activeSlide.title.slice(0, -4)
                  }}<br class="hidden sm:block" />
                  <span
                    class="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent"
                    >{{ activeSlide.title.slice(-4) }}</span
                  >
                </h1>
                <p
                  class="mx-auto mb-8 max-w-md text-base leading-relaxed text-slate-500 sm:text-lg lg:mx-0"
                >
                  {{ activeSlide.subtitle }}
                </p>
              </div>
            </transition>

            <!-- CTA 按钮 -->
            <div
              class="mb-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <button
                @click="goToFeature(activeSlide.btnLink)"
                class="group inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/35 active:scale-95"
              >
                <component :is="activeSlide.icon" class="h-5 w-5" />
                {{ activeSlide.btnText }}
                <ArrowRight
                  class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
              <button
                @click="goToTools"
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
              >
                <Play class="h-5 w-5 text-slate-400" />
                观看演示
              </button>
            </div>

            <!-- 轮播指示器 -->
            <div
              class="mb-10 flex items-center justify-center gap-3 lg:justify-start"
            >
              <button
                @click="prevSlide"
                class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-700 hover:shadow-md"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <div class="flex gap-2">
                <button
                  v-for="(_, index) in bannerSlides"
                  :key="index"
                  @click="goToSlide(index)"
                  class="h-2 cursor-pointer rounded-full transition-all duration-300"
                  :class="
                    index === currentSlide
                      ? 'w-8 bg-gradient-to-r from-purple-600 to-pink-500'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  "
                ></button>
              </div>
              <button
                @click="nextSlide"
                class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:text-slate-700 hover:shadow-md"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>

            <!-- 底部内联统计（仿图二 5,000+ Members / 12 Locations / 98% Satisfaction） -->
            <div class="flex flex-wrap justify-center gap-8 lg:justify-start">
              <div
                v-for="s in heroStats"
                :key="s.label"
                class="text-center lg:text-left"
              >
                <div
                  class="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl"
                >
                  {{ s.value }}
                </div>
                <div class="mt-1 text-sm text-slate-400">{{ s.label }}</div>
              </div>
            </div>
          </div>

          <!-- ====== 右侧图片拼贴区 ====== -->
          <div class="relative hidden w-full max-w-[520px] lg:block">
            <!-- 主图（左侧大图） -->
            <div class="relative z-10">
              <img
                src="/images/umap-cell-atlas.png"
                alt="UMAP Immune Cell Atlas"
                class="h-[320px] w-[340px] rounded-3xl object-cover shadow-2xl shadow-slate-300/40"
              />
            </div>

            <!-- 辅图（右上角叠放） -->
            <div class="absolute -right-4 top-6 z-20">
              <!-- 浮动特性卡片1（右上角） -->
              <div
                class="mb-3 flex w-[200px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:-translate-y-0.5"
              >
                <div
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                  :class="heroFeatures[0].bg"
                >
                  <component
                    :is="heroFeatures[0].icon"
                    class="h-5 w-5"
                    :class="heroFeatures[0].color"
                  />
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">
                    {{ heroFeatures[0].label }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ heroFeatures[0].desc }}
                  </div>
                </div>
              </div>

              <!-- 实验室照片 -->
              <img
                :src="heroImages[0].src"
                :alt="heroImages[0].alt"
                class="h-[240px] w-[240px] rounded-3xl object-cover shadow-xl shadow-slate-200/40"
              />
            </div>

            <!-- 浮动特性卡片2（左下角） -->
            <div
              class="absolute -bottom-4 left-8 z-30 flex w-[200px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:-translate-y-0.5"
            >
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                :class="heroFeatures[1].bg"
              >
                <component
                  :is="heroFeatures[1].icon"
                  class="h-5 w-5"
                  :class="heroFeatures[1].color"
                />
              </div>
              <div>
                <div class="text-sm font-bold text-slate-800">
                  {{ heroFeatures[1].label }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ heroFeatures[1].desc }}
                </div>
              </div>
            </div>

            <!-- 装饰圆点 -->
            <div
              class="absolute -left-6 top-1/2 h-3 w-3 rounded-full bg-purple-400/40"
            ></div>
            <div
              class="absolute -bottom-8 right-1/3 h-4 w-4 rounded-full bg-pink-400/30"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 快速入口条（浮出 Glassmorphism 卡片） ========== -->
    <section class="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div
          class="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-2xl shadow-slate-300/30 backdrop-blur-xl sm:grid-cols-4 sm:gap-4 sm:p-6"
        >
          <button
            v-for="entry in quickEntries"
            :key="entry.name"
            @click="goToFeature(entry.link)"
            class="group flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-4"
            :class="entry.glow"
          >
            <div
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105"
              :class="`bg-gradient-to-br ${entry.gradient}`"
            >
              <component :is="entry.icon" class="h-6 w-6" />
            </div>
            <div class="text-left">
              <div
                class="text-sm font-bold text-slate-800 transition-colors group-hover:text-slate-900"
              >
                {{ entry.name }}
              </div>
              <div class="text-xs text-slate-400">{{ entry.desc }}</div>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- ========== 移动端统计数据 ========== -->
    <section class="py-10 lg:hidden">
      <div class="mx-auto max-w-7xl px-4 sm:px-6">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            v-for="stat in statsData"
            :key="stat.label"
            class="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <component :is="stat.icon" class="mb-2 h-5 w-5 text-blue-500" />
            <div class="text-xl font-extrabold text-blue-600">
              {{ stat.value }}
            </div>
            <div class="mt-1 text-xs text-slate-500">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 特色产品（Glassmorphism 卡片） ========== -->
    <section
      class="bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 py-24"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-16 text-center">
          <span
            class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600"
          >
            <Sparkles class="h-3.5 w-3.5" />
            核心能力
          </span>
          <h2 class="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            为科研而生的特色产品
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-base text-slate-500">
            通过云端技术，为您提供创新、高效的解决方案，帮助您应对各种挑战。
          </p>
        </div>

        <!-- 产品卡片 -->
        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="cap in capabilities"
            :key="cap.title"
            @click="goToFeature(cap.link)"
            class="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/40"
          >
            <!-- 渐变色头部 -->
            <div
              class="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br p-6"
              :class="cap.gradient"
            >
              <component
                :is="cap.icon"
                class="h-16 w-16 text-white/90 transition-all duration-500 group-hover:scale-110"
              />
              <!-- 装饰圆 -->
              <div
                class="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"
              ></div>
              <div
                class="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10"
              ></div>
              <!-- 光效 -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              ></div>
            </div>

            <!-- 内容 -->
            <div class="p-6">
              <h3 class="mb-2 text-xl font-bold text-slate-900">
                {{ cap.title }}
              </h3>
              <p class="mb-4 text-sm leading-relaxed text-slate-500">
                {{ cap.description }}
              </p>

              <!-- 标签 -->
              <div class="mb-4 flex flex-wrap gap-2">
                <span
                  v-for="tag in cap.tags"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition-colors group-hover:bg-slate-200/80"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- 底部：社会证明 -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4"
              >
                <div class="flex items-center gap-1 text-sm text-slate-400">
                  <Users class="h-4 w-4" />
                  <span>{{ cap.users }} 人使用</span>
                </div>
                <div class="flex items-center gap-0.5">
                  <Star
                    v-for="s in cap.rating"
                    :key="s"
                    class="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 查看全部按钮 -->
        <div class="mt-14 text-center">
          <button
            @click="goToTools"
            class="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
          >
            查看全部产品
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- ========== 热门工具画廊（暗色 Glassmorphism） ========== -->
    <section
      class="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950 py-24"
    >
      <!-- 装饰光源 -->
      <div
        class="pointer-events-none absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-blue-600/15 blur-[120px]"
      ></div>
      <div
        class="pointer-events-none absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-purple-600/15 blur-[120px]"
      ></div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-16 text-center">
          <span
            class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm font-semibold text-purple-300"
          >
            <FlaskConical class="h-3.5 w-3.5" />
            工具集锦
          </span>
          <h2 class="mt-5 text-3xl font-bold text-white sm:text-4xl">
            热门分析工具
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-base text-slate-400">
            覆盖转录组、单细胞、蛋白组学等多领域，一键生成出版级图表。
          </p>
        </div>

        <!-- 工具网格 -->
        <div class="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          <div
            v-for="tool in galleryTools"
            :key="tool.name"
            @click="goToTools"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-blue-500/10"
          >
            <!-- 工具预览区 -->
            <div
              class="relative flex h-40 items-center justify-center bg-gradient-to-br sm:h-48"
              :class="tool.bgGradient"
            >
              <BarChart3
                class="h-16 w-16 opacity-30 transition-all duration-300 group-hover:scale-110 group-hover:opacity-50 sm:h-20 sm:w-20"
                :class="tool.color"
              />

              <!-- 分类标签 -->
              <div
                class="absolute left-3 top-3 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md"
                :class="tool.color"
              >
                {{ tool.category }}
              </div>
            </div>

            <!-- 底部信息 -->
            <div class="flex items-center justify-between px-4 py-4">
              <h3
                class="text-sm font-bold text-white/90 transition-colors group-hover:text-white sm:text-base"
              >
                {{ tool.name }}
              </h3>
              <div class="flex items-center gap-1 text-xs text-slate-500">
                <Users class="h-3.5 w-3.5" />
                {{ formatViews(tool.views) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 查看更多 -->
        <div class="mt-14 text-center">
          <button
            @click="goToTools"
            class="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            查看全部工具
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- ========== 大数据统计横幅 ========== -->
    <section
      class="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-16"
    >
      <!-- 光效 -->
      <div
        class="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-[80px]"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-[80px]"
      ></div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          <div v-for="stat in statsData" :key="stat.label" class="group">
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
            >
              <component :is="stat.icon" class="h-7 w-7 text-white/90" />
            </div>
            <div class="text-3xl font-extrabold text-white sm:text-4xl">
              {{ stat.value }}
            </div>
            <div class="mt-1 text-sm text-white/60">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 教程媒体内容 ========== -->
    <section
      class="bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 py-24"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-16 text-center">
          <span
            class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-500"
          >
            <Play class="h-3.5 w-3.5" />
            精彩内容
          </span>
          <h2 class="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            教程与资源
          </h2>
          <p class="mx-auto mt-4 max-w-2xl text-base text-slate-500">
            获取技术深度解析与实用教程，紧跟生信前沿动态。
          </p>
        </div>

        <!-- 教程卡片 -->
        <div class="grid gap-8 md:grid-cols-2">
          <div
            v-for="media in mediaContent"
            :key="media.title"
            class="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40"
          >
            <!-- 渐变色封面 -->
            <div
              class="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br"
              :class="media.gradient"
            >
              <!-- 播放按钮 -->
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/15 shadow-xl backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/25"
              >
                <Play class="ml-1 h-7 w-7 text-white" />
              </div>
              <!-- 时长 -->
              <div
                class="absolute bottom-3 right-3 rounded-xl bg-black/30 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
              >
                {{ media.duration }}
              </div>
              <!-- 装饰 -->
              <div
                class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
              ></div>
            </div>

            <!-- 信息 -->
            <div class="p-6">
              <div class="mb-3 flex items-center gap-4 text-sm text-slate-400">
                <span class="flex items-center gap-1">
                  <Users class="h-4 w-4" />
                  {{ media.views }} 次观看
                </span>
                <span class="flex items-center gap-1">
                  <Sparkles class="h-4 w-4" />
                  {{ media.likes }} 点赞
                </span>
              </div>

              <h3
                class="mb-2 text-lg font-bold text-slate-800 transition-colors group-hover:text-blue-600"
              >
                {{ media.title }}
              </h3>
              <p class="mb-4 text-sm leading-relaxed text-slate-500">
                {{ media.description }}
              </p>

              <div
                class="flex items-center gap-1 text-sm font-medium text-blue-600 transition-all group-hover:gap-2"
              >
                前往观看
                <ExternalLink class="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== CTA 区域（暗色 Glassmorphism） ========== -->
    <section
      class="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 py-24"
    >
      <!-- 光效 -->
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/15 blur-[120px]"
      ></div>

      <div class="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <!-- Glassmorphism 容器 -->
        <div
          class="rounded-3xl border border-white/10 bg-white/[0.05] p-10 backdrop-blur-xl sm:p-14"
        >
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30"
          >
            <Sparkles class="h-7 w-7 text-white" />
          </div>
          <h2 class="mb-4 text-3xl font-bold text-white sm:text-4xl">
            准备好开始您的分析之旅了吗？
          </h2>
          <p class="mx-auto mb-10 max-w-xl text-base text-slate-400 sm:text-lg">
            免费注册即可体验全部工具，无需安装任何软件，数据安全有保障。
          </p>
          <div class="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              @click="goToTools"
              class="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 active:scale-95"
            >
              <Sparkles class="h-5 w-5" />
              免费开始使用
              <ArrowRight
                class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
            <button
              @click="goToTools"
              class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
            >
              <LineChart class="h-5 w-5 text-slate-400" />
              浏览工具列表
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 光源blob漂浮动画 */
@keyframes blob {
  0% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -40px) scale(1.05);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }

  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes aurora {
  0% {
    background-position: 50% 50%;
    opacity: 0.5;
  }

  25% {
    background-position: 80% 30%;
    opacity: 0.65;
  }

  50% {
    background-position: 150% 60%;
    opacity: 0.55;
  }

  75% {
    background-position: 250% 40%;
    opacity: 0.6;
  }

  100% {
    background-position: 350% 50%;
    opacity: 0.5;
  }
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.animate-blob {
  animation: blob 8s ease-in-out infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Aurora 极光动态背景 */
.aurora-bg {
  overflow: hidden;
  mask-image: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    black 40%,
    transparent 100%
  );
}

.aurora-layer {
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background-image:
    repeating-linear-gradient(
      100deg,
      rgb(255 255 255 / 12%) 0%,
      rgb(255 255 255 / 12%) 7%,
      transparent 10%,
      transparent 12%,
      rgb(255 255 255 / 12%) 16%
    ),
    repeating-linear-gradient(
      100deg,
      rgb(96 165 250 / 25%) 10%,
      rgb(129 140 248 / 20%) 15%,
      rgb(167 139 250 / 15%) 20%,
      rgb(192 132 252 / 12%) 25%,
      rgb(96 165 250 / 18%) 30%
    );
  background-position: 50% 50%;
  background-size: 300% 200%;
  opacity: 0.6;
  filter: blur(12px);
  animation: aurora 18s ease-in-out infinite alternate;
}

/* 幻灯片切换动画 */
</style>
