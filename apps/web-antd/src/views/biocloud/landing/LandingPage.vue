<script setup lang="ts">
/**
 * BioCloud Landing Page - 全新设计
 * 特点：每个区块背景色不同，彩色标签，现代卡片
 */
import { useRouter } from 'vue-router';

import {
  ArrowRight,
  BarChart3,
  Clock,
  Database,
  ExternalLink,
  Layers,
  LineChart,
  Play,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from 'lucide-vue-next';

const router = useRouter();

// KPI 统计
const stats = [
  { label: '分析工具', value: '50+' },
  { label: '注册用户', value: '10K+' },
  { label: '可靠性', value: '99.9%' },
];

// 技术标签
const techTags = ['Bulk RNA', 'scRNA-seq', '可视化', 'AI 分析'];

// 四大能力
const capabilities = [
  {
    icon: Zap,
    title: '云工具',
    description: '50+ 专业分析工具，可视化配置，无需编程，即刻获取出版级图表。',
    color: 'bg-blue-500',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=280&fit=crop',
    link: '/tools',
  },
  {
    icon: Layers,
    title: '云流程',
    description: 'scRNA-seq 完整分析流程，每步可调参，状态实时追踪。',
    color: 'bg-orange-500',
    image:
      'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=280&fit=crop',
    link: '/pipelines',
  },
  {
    icon: Database,
    title: '数据管理',
    description: '个人云盘 + 项目关联，数据归档井井有条，随时调用。',
    color: 'bg-emerald-500',
    image:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=280&fit=crop',
    link: '/data',
  },
];

// 精选热门工具
const featuredTools = [
  {
    id: 1,
    name: 'ROE 富集分析',
    description: '计算基因集的观察/期望比值，快速识别显著富集通路',
    category: 'Bulk RNA',
    icon: BarChart3,
    color: 'bg-blue-500',
    uses: '1.2K',
    forks: '35',
  },
  {
    id: 2,
    name: '火山图绘制',
    description: '差异表达基因可视化，支持自定义阈值与配色',
    category: 'scRNA-seq',
    icon: LineChart,
    color: 'bg-purple-500',
    uses: '3.5K',
    forks: '89',
  },
  {
    id: 3,
    name: 'PCA 降维分析',
    description: '主成分分析与可视化，揭示样本间整体差异',
    category: '可视化',
    icon: Layers,
    color: 'bg-emerald-500',
    uses: '2.8K',
    forks: '56',
  },
];

// 教程/媒体内容
const mediaContent = [
  {
    title: '快速上手：5分钟完成首个分析',
    description:
      '从数据上传到出图，手把手带你体验云分析全流程。适合零基础用户快速入门。',
    views: '22.5K',
    likes: '1.2K',
    duration: '05:28',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop',
    color: 'bg-blue-500',
  },
  {
    title: 'scRNA-seq 分析实战教程',
    description: '从原始数据到细胞注释，完整单细胞分析流程详解。',
    views: '48.3K',
    likes: '3.6K',
    duration: '12:45',
    image:
      'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&h=340&fit=crop',
    color: 'bg-purple-500',
  },
];

const goToTools = () => router.push('/tools');
const goToFeature = (path: string) => router.push(path);
</script>

<template>
  <div class="font-sans text-slate-900">
    <!-- ========== Hero 区域 (白色背景) ========== -->
    <section class="relative overflow-hidden bg-white pb-48 pt-24">
      <!-- 背景装饰 -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]"
      ></div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <!-- 左侧：文字内容 -->
          <div class="flex-1 text-center lg:text-left">
            <!-- 标签 -->
            <div
              class="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600"
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"
                ></span>
                <span
                  class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"
                ></span>
              </span>
              多组学生信分析云平台
            </div>

            <!-- 主标题 -->
            <h1
              class="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 lg:text-5xl"
            >
              释放多组学数据的<br />
              <span
                class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                >无限潜能</span
              >
            </h1>

            <!-- 副标题 -->
            <p class="mb-8 max-w-lg text-lg text-slate-500">
              整合前沿生信技术与实际分析场景，提供定制化解决方案，让数据驱动决策，让创新创造价值。
            </p>

            <!-- CTA 按钮 -->
            <div
              class="mb-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <button
                @click="goToTools"
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-95"
              >
                探索工具
                <ArrowRight class="h-5 w-5" />
              </button>
              <button
                @click="goToTools"
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                开源项目
              </button>
            </div>

            <!-- 统计数字 -->
            <div
              class="mb-6 flex flex-wrap justify-center gap-6 lg:justify-start"
            >
              <div
                v-for="stat in stats"
                :key="stat.label"
                class="border-l-2 border-slate-200 pl-4 text-center first:border-0 first:pl-0 lg:text-left"
              >
                <div class="text-2xl font-bold text-slate-900">
                  {{ stat.value }}
                </div>
                <div class="text-sm text-slate-500">{{ stat.label }}</div>
              </div>
            </div>

            <!-- 技术标签 -->
            <div class="flex flex-wrap justify-center gap-2 lg:justify-start">
              <span
                v-for="tag in techTags"
                :key="tag"
                class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 右侧：产品截图 -->
          <div class="w-full flex-shrink-0 lg:w-[480px]">
            <div
              class="relative overflow-hidden rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/50"
            >
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop"
                alt="BioCloud Dashboard"
                class="h-auto w-full"
              />
              <!-- 浮动状态标签 -->
              <div
                class="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-sm shadow backdrop-blur"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                  ></span>
                  <span
                    class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"
                  ></span>
                </span>
                <span class="text-slate-700">系统运行中</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 特色产品 ========== -->
    <section class="bg-slate-50/80 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-12 text-center">
          <span class="mb-3 inline-block text-sm font-semibold text-blue-600"
            >—— 核心能力 ——</span
          >
          <h2 class="text-3xl font-bold text-slate-900">特色产品</h2>
          <p class="mx-auto mt-3 max-w-2xl text-slate-500">
            通过云端技术，为您提供创新、高效的解决方案，帮助您应对各种挑战。
          </p>
        </div>

        <!-- 产品卡片 -->
        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="cap in capabilities"
            :key="cap.title"
            @click="goToFeature(cap.link)"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
          >
            <!-- 图片区域 -->
            <div class="relative h-48 overflow-hidden">
              <img
                :src="cap.image"
                :alt="cap.title"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <!-- 图标徽标 -->
              <div
                :class="`absolute left-4 top-4 h-10 w-10 rounded-xl ${cap.color} flex items-center justify-center shadow-lg`"
              >
                <component :is="cap.icon" class="h-5 w-5 text-white" />
              </div>
            </div>

            <!-- 内容 -->
            <div class="p-6">
              <h3 class="mb-2 text-xl font-bold text-slate-900">
                {{ cap.title }}
              </h3>
              <p class="mb-4 text-sm leading-relaxed text-slate-500">
                {{ cap.description }}
              </p>
              <div
                class="flex items-center gap-1 text-sm font-medium text-blue-600 transition-all group-hover:gap-2"
              >
                了解更多
                <ArrowRight class="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <!-- 查看全部按钮 -->
        <div class="mt-12 text-center">
          <button
            @click="goToTools"
            class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow"
          >
            查看全部产品
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- ========== 热门工具 ========== -->
    <section
      class="bg-gradient-to-b from-blue-50/40 via-indigo-50/30 to-purple-50/40 py-20"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-12 text-center">
          <span class="mb-3 inline-block text-sm font-semibold text-purple-600"
            >—— 开放共享 ——</span
          >
          <h2 class="text-3xl font-bold text-slate-900">热门工具</h2>
          <p class="mx-auto mt-3 max-w-2xl text-slate-500">
            我们秉持开放共享的理念，积极参与开源社区，推动技术创新与发展。
          </p>
        </div>

        <!-- 工具卡片 -->
        <div class="grid gap-6 md:grid-cols-3">
          <div
            v-for="tool in featuredTools"
            :key="tool.id"
            @click="goToTools"
            class="group cursor-pointer rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-100 hover:shadow-lg"
          >
            <!-- 头部：图标 + 标题 -->
            <div class="mb-4 flex items-start gap-4">
              <div
                :class="`h-12 w-12 rounded-xl ${tool.color} flex items-center justify-center shadow`"
              >
                <component :is="tool.icon" class="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">
                  {{ tool.name }}
                </h3>
                <p class="mt-1 text-sm text-slate-500">
                  {{ tool.description }}
                </p>
              </div>
            </div>

            <!-- 标签 -->
            <div class="mb-4 flex flex-wrap gap-2">
              <span
                class="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
                >{{ tool.category }}</span
              >
            </div>

            <!-- 统计 -->
            <div
              class="flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-400"
            >
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1">
                  <Sparkles class="h-4 w-4" />
                  {{ tool.uses }} 使用
                </span>
                <span class="flex items-center gap-1">
                  <RefreshCw class="h-4 w-4" />
                  {{ tool.forks }} Forks
                </span>
              </div>
              <Clock class="h-4 w-4" />
            </div>

            <!-- 链接 -->
            <div
              class="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 transition-all group-hover:gap-2"
            >
              立即使用
              <ExternalLink class="h-4 w-4" />
            </div>
          </div>
        </div>

        <!-- 查看全部按钮 -->
        <div class="mt-12 text-center">
          <button
            @click="goToTools"
            class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-purple-300 hover:text-purple-600 hover:shadow"
          >
            查看全部工具
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- ========== 媒体内容 ========== -->
    <section class="bg-slate-50/60 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- 标题 -->
        <div class="mb-12 text-center">
          <span class="mb-3 inline-block text-sm font-semibold text-rose-500"
            >—— 精彩内容 ——</span
          >
          <h2 class="text-3xl font-bold text-slate-900">媒体内容</h2>
          <p class="mx-auto mt-3 max-w-2xl text-slate-500">
            获取我们在各大平台发布的技术深度解析与实用教程，紧跟生信前沿动态。
          </p>
        </div>

        <!-- 视频卡片 -->
        <div class="grid gap-8 md:grid-cols-2">
          <div
            v-for="media in mediaContent"
            :key="media.title"
            class="group cursor-pointer"
          >
            <!-- 视频缩略图 -->
            <div class="relative mb-4 overflow-hidden rounded-2xl">
              <img
                :src="media.image"
                :alt="media.title"
                class="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <!-- 播放按钮 -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div
                  :class="`h-16 w-16 rounded-full ${media.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`"
                >
                  <Play class="ml-1 h-7 w-7 text-white" />
                </div>
              </div>
              <!-- 时长 -->
              <div
                class="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs text-white"
              >
                {{ media.duration }}
              </div>
            </div>

            <!-- 信息 -->
            <div class="mb-2 flex items-center gap-4 text-sm text-slate-400">
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
              class="mb-2 text-lg font-bold text-blue-600 group-hover:text-blue-700"
            >
              {{ media.title }}
            </h3>
            <p class="text-sm leading-relaxed text-slate-500">
              {{ media.description }}
            </p>

            <div
              class="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600"
            >
              前往观看
              <ExternalLink class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes ping {
  75%,
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
