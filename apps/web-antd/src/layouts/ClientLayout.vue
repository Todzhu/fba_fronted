<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import {
  ChevronDown,
  ClipboardList,
  Database,
  GitBranch,
  Home,
  LogOut,
  Sparkles,
  Wrench,
} from 'lucide-vue-next';

import { useAuthStore } from '#/store/auth';
import AuthModal from '#/views/biocloud/landing/components/AuthModal.vue';

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const authStore = useAuthStore();

// Navigation Items
const navItems = [
  { name: '首页', href: '/index', icon: Home },
  { name: '云工具', href: '/tools', icon: Wrench },
  { name: '云流程', href: '/pipeline', icon: GitBranch },
  { name: '我的数据', href: '/data', icon: Database },
  { name: '我的任务', href: '/tasks', icon: ClipboardList },
];

// Auth Modal State
const showAuthModal = ref(false);

// Login Check - 使用 accessStore.accessToken 判断登录状态
const isLoggedIn = computed(() => !!accessStore.accessToken);
const userInfo = computed(
  () => userStore.userInfo || { realName: 'User', avatar: '' },
);

const handleLogin = () => {
  showAuthModal.value = true;
};

const handleLogout = () => {
  authStore.logout();
};

const isUserMenuOpen = ref(false);
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
    <!-- Header -->
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md transition-all"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo -->
          <div
            class="flex cursor-pointer items-center gap-2"
            @click="router.push('/')"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-200 transition-transform hover:scale-105"
            >
              <span class="text-lg font-bold">B</span>
            </div>
            <span class="text-xl font-bold tracking-tight text-slate-800"
              >BioCloud</span
            >
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden items-center gap-1 md:flex">
            <router-link
              v-for="item in navItems"
              :key="item.name"
              :to="item.href"
              class="group flex items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-blue-600"
              active-class="!bg-blue-50 !text-blue-600 shadow-sm ring-1 ring-blue-100"
            >
              <component
                :is="item.icon"
                class="h-5 w-5 opacity-70 transition-opacity group-hover:opacity-100"
              />
              {{ item.name }}
            </router-link>
          </nav>

          <!-- Right Actions -->
          <div class="flex items-center gap-4">
            <!-- User Menu (Logged In) -->
            <div v-if="isLoggedIn" class="relative">
              <button
                @click="toggleUserMenu"
                class="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-sm font-bold text-white shadow-sm"
                >
                  {{ userInfo.realName?.charAt(0).toUpperCase() || 'U' }}
                </div>
                <span
                  class="max-w-[100px] truncate text-sm font-medium text-slate-700"
                  >{{ userInfo.realName || 'User' }}</span
                >
                <ChevronDown class="h-4 w-4 text-slate-400" />
              </button>

              <!-- Dropdown -->
              <div
                v-if="isUserMenuOpen"
                class="animate-in fade-in zoom-in-95 absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-xl shadow-slate-200/50 ring-1 ring-black ring-opacity-5 duration-200 focus:outline-none"
              >
                <div class="mb-1 border-b border-slate-100 px-3 py-2">
                  <p class="text-xs font-medium text-slate-500">Signed in as</p>
                  <p class="truncate text-sm font-bold text-slate-800">
                    {{ userInfo.realName }}
                  </p>
                </div>
                <button
                  @click="
                    router.push('/tasks');
                    isUserMenuOpen = false;
                  "
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
                >
                  <RefreshCw class="h-4 w-4" /> 我的任务
                </button>
                <button
                  @click="
                    router.push('/data');
                    isUserMenuOpen = false;
                  "
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
                >
                  <Database class="h-4 w-4" /> 我的数据
                </button>
                <div class="my-1 border-t border-slate-100"></div>
                <button
                  @click="handleLogout"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut class="h-4 w-4" /> 退出登录
                </button>
              </div>
            </div>

            <!-- Guest Action (Not Logged In) -->
            <button
              v-else
              @click="handleLogin"
              class="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
            >
              <Sparkles class="h-4 w-4 text-blue-300" />
              <span>开始使用</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow pt-16">
      <router-view />
    </main>

    <!-- Footer (深色设计) -->
    <footer class="bg-slate-900 py-16 text-slate-300">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-12 grid grid-cols-1 gap-12 md:grid-cols-3">
          <!-- 左侧：Logo + 描述 + 社交图标 -->
          <div>
            <div class="mb-4 flex items-center gap-2">
              <div class="rounded-lg bg-blue-600 p-1.5 text-white">
                <span class="text-sm font-bold">B</span>
              </div>
              <span class="text-xl font-bold text-white">BioCloud</span>
            </div>
            <p class="mb-6 text-sm leading-relaxed text-slate-400">
              专注于多组学生信分析云平台开发，致力于让科技更加贴近生活
            </p>
            <!-- 社交图标 -->
            <div class="flex gap-4">
              <a
                href="#"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-blue-600"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
              </a>
              <a
                href="#"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-blue-600"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                  />
                </svg>
              </a>
              <a
                href="#"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-blue-600"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- 中间：快速导航 -->
          <div>
            <h4 class="mb-4 font-bold text-white">快速导航</h4>
            <ul class="space-y-3 text-sm">
              <li>
                <router-link
                  to="/index"
                  class="transition-colors hover:text-blue-400"
                >
                  首页
                </router-link>
              </li>
              <li>
                <router-link
                  to="/tools"
                  class="transition-colors hover:text-blue-400"
                >
                  产品
                </router-link>
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-400"
                  >开源项目</a
                >
              </li>
              <li>
                <a href="#" class="transition-colors hover:text-blue-400"
                  >关于我们</a
                >
              </li>
            </ul>
          </div>

          <!-- 右侧：联系我们 -->
          <div>
            <h4 class="mb-4 font-bold text-white">联系我们</h4>
            <ul class="space-y-3 text-sm">
              <li class="flex items-center gap-2">
                <svg
                  class="h-4 w-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                support@biocloud.com
              </li>
              <li class="flex items-center gap-2">
                <svg
                  class="h-4 w-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                中国，深圳
              </li>
            </ul>
          </div>
        </div>

        <!-- 版权信息 -->
        <div
          class="border-t border-slate-800 pt-8 text-center text-sm text-slate-500"
        >
          © 2026 版权所有 保留所有权利
        </div>
      </div>
    </footer>

    <!-- Global Auth Modal -->
    <AuthModal :is-open="showAuthModal" @close="showAuthModal = false" />
  </div>
</template>

<style scoped>
/* Ensure dropdown closes when clicking outside */
</style>
