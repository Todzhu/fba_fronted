<script setup lang="ts">
/**
 * 社交媒体侧边栏组件
 * - 主页(/index)：显示全部4个图标
 * - 其他页面：仅显示微信图标 + "联系我" 标签
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { X } from 'lucide-vue-next';

// 微信公众号二维码
import wechatQR from '#/assets/images/wechat.jpg';
// 公众号logo图标
import gzhLogo from '#/assets/images/gzh_logo.png';
// Bilibili logo图标
import bilibiliLogo from '#/assets/images/bilibili-logo.png';

// 社交平台配置
interface SocialItem {
  name: string;
  icon: string;
  type: 'qrcode' | 'link';
  url?: string;
  qrTitle?: string;
  qrSubtitle?: string;
}

// 微信配置（单独提取，用于其他页面）
const wechatItem: SocialItem = {
  name: '微信',
  icon: gzhLogo,
  type: 'qrcode',
  qrTitle: '欢迎添加我的微信',
  qrSubtitle: '了解更多信息',
};

// 全部社交平台（主页用）
const allSocialItems: SocialItem[] = [
  {
    name: '微信公众号',
    icon: gzhLogo,
    type: 'qrcode',
    qrTitle: '欢迎添加我的微信',
    qrSubtitle: '了解更多信息',
  },
  {
    name: 'Bilibili',
    icon: bilibiliLogo,
    type: 'link',
    url: 'https://space.bilibili.com',
  },
  {
    name: 'YouTube',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjE1JSIgZmlsbD0iI2ZmMDAwMCIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yMTAgMTkwdjEzMmwxMTAtNjZ6Ii8+PC9zdmc+',
    type: 'link',
    url: 'https://youtube.com',
  },
  {
    name: 'TikTok',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjE1JSIgZmlsbD0iIzAwMCIvPjxwYXRoIGZpbGw9IiMyNWYzZWUiIGQ9Ik0zMzEgMTY2YzI0IDE3IDUzIDI3IDg1IDI3di02OGMtNiAwLTEyLTEtMTgtMnYyNGMtMzIgMC02MS0xMC04NS0yN3YxMjRjMCA2Mi01MCAxMTItMTEyIDExMi0yMyAwLTQ0LTctNjItMTkgMjAgMjIgNDkgMzYgODEgMzYgNjIgMCAxMTItNTAgMTEyLTExMnoiLz48cGF0aCBmaWxsPSIjZmUyYzU1IiBkPSJNMzQ5IDE0MmMyMSAxNiA0NiAyNSA3NSAyNXYyYy0yOS0xLTU2LTEwLTc4LTI3djEyNGMwIDYyLTUwIDExMi0xMTIgMTEyLTM4IDAtNzItMTktOTItNDggMTggMTIgNDAgMjAgNjMgMjAgNjIgMCAxMTItNTAgMTEyLTExMnoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjg0IDI1N2MwLTYyIDUwLTExMiAxMTItMTEydjY4Yy0zMiAwLTYxLTEwLTg1LTI3djEyNGMwIDYyLTUwIDExMi0xMTIgMTEyLTYyIDAtMTEyLTUwLTExMi0xMTIgMC02MiA1MC0xMTIgMTEyLTExMiAxMCAwIDIwIDIgMjkgNHY3MGMtOS00LTIwLTYtMzAtNi0zNyAwLTY4IDMxLTY4IDY4czMxIDY4IDY4IDY4IDY4LTMxIDY4LTY4eiIvPjwvc3ZnPg==',
    type: 'link',
    url: 'https://tiktok.com',
  },
];

// 路由判断
const route = useRoute();
const isHomePage = computed(() => route.path === '/index' || route.path === '/');

// 根据页面显示不同图标
const displayItems = computed(() => (isHomePage.value ? allSocialItems : [wechatItem]));

// 弹窗状态
const showQRModal = ref(false);

// 点击处理
function handleClick(item: SocialItem) {
  if (item.type === 'qrcode') {
    showQRModal.value = true;
  } else if (item.url) {
    window.open(item.url, '_blank');
  }
}

// 关闭弹窗
function closeModal() {
  showQRModal.value = false;
}
</script>

<template>
  <!-- 固定定位侧边栏 -->
  <div class="fixed right-4 top-1/2 z-40 -translate-y-1/2">
    <!-- 主页：多图标卡片 -->
    <div
      v-if="isHomePage"
      class="flex flex-col gap-8 rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-lg"
    >
      <button
        v-for="item in displayItems"
        :key="item.name"
        :title="item.name"
        class="group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-lg"
        @click="handleClick(item)"
      >
        <img
          :src="item.icon"
          :alt="item.name"
          class="h-10 w-10 rounded-xl object-cover"
        />
      </button>
    </div>

    <!-- 其他页面：微信图标 + 联系我标签 -->
    <div v-else class="flex flex-col items-center gap-3">
      <!-- 微信圆形图标 -->
      <button
        class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/50 transition-all duration-200 hover:scale-110 hover:shadow-xl"
        title="联系我"
        @click="handleClick(wechatItem)"
      >
        <!-- 微信官方绿色logo -->
        <svg class="h-8 w-8" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="#07C160" />
          <path
            d="M32.5 21c0-4.7-4.5-8.5-10-8.5s-10 3.8-10 8.5c0 4.2 3.5 7.6 8.2 8.4l-.3 2.5 2.8-1.5c.5.1.9.1 1.3.1 5.5 0 10-3.8 10-8.5z"
            fill="#fff"
          />
          <circle cx="18.5" cy="20" r="1.5" fill="#07C160" />
          <circle cx="26.5" cy="20" r="1.5" fill="#07C160" />
        </svg>
      </button>
      <!-- 联系我标签 -->
      <div
        class="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md transition-all hover:shadow-lg"
        @click="handleClick(wechatItem)"
      >
        联系我
      </div>
    </div>
  </div>

  <!-- 二维码弹窗（新样式：包含头像和用户名） -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showQRModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div
          class="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white px-8 pb-8 pt-6 shadow-2xl"
        >
          <!-- 关闭按钮 -->
          <button
            class="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-500 text-white transition-colors hover:bg-slate-600"
            @click="closeModal"
          >
            <X class="h-5 w-5" />
          </button>

          <!-- 标题 -->
          <div class="mb-6 text-center">
            <h3 class="text-xl font-semibold text-slate-900">欢迎添加我的微信</h3>
            <p class="mt-1 text-base text-slate-500">了解更多信息</p>
          </div>

          <!-- 用户信息 -->
          <div class="mb-6 flex items-center gap-3">
            <img
              :src="wechatQR"
              alt="头像"
              class="h-12 w-12 rounded-lg object-cover"
            />
            <span class="text-lg font-medium text-slate-800">生信大杂烩</span>
          </div>

          <!-- 二维码 -->
          <div class="flex justify-center">
            <img
              :src="wechatQR"
              alt="微信二维码"
              class="h-64 w-64 rounded-lg object-contain"
            />
          </div>

          <!-- 底部提示 -->
          <p class="mt-6 text-center text-sm text-slate-400">
            扫一扫上面的二维码图案，加我为朋友。
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 弹窗动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
