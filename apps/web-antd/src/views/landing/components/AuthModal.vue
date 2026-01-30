<script setup lang="ts">
import { ref } from 'vue';

import { message } from 'ant-design-vue';
import { ArrowRight, Github, Lock, User, X } from 'lucide-vue-next';

import { useAuthStore } from '#/store';

interface Props {
  isOpen: boolean;
}

defineProps<Props>();
const emit = defineEmits(['close']);

const authStore = useAuthStore();
const isLogin = ref(true); // true: Login, false: Register

// 表单数据
const formData = ref({
  username: '',
  password: '',
  registerUsername: '', // 注册用的用户名
});

// 加载状态
const loading = ref(false);

// 错误信息
const errorMsg = ref('');

const handleClose = () => {
  emit('close');
  errorMsg.value = '';
};

// 登录处理
const handleSubmit = async () => {
  errorMsg.value = '';

  if (isLogin.value) {
    // 登录模式
    if (!formData.value.username || !formData.value.password) {
      errorMsg.value = '请输入用户名和密码';
      return;
    }

    loading.value = true;
    try {
      await authStore.authLogin(
        {
          username: formData.value.username,
          password: formData.value.password,
          uuid: '', // 简化版无验证码
          captcha: '',
        },
        () => {
          // 使用 onSuccess 回调，阻止 authLogin 内部的默认 router.push
          // 关闭弹窗
          handleClose();
          // 强制刷新跳转到分析页面
          window.location.replace('/analytics');
        },
      );
    } catch (error: any) {
      errorMsg.value = error?.message || '登录失败，请检查用户名和密码';
    } finally {
      loading.value = false;
    }
  } else {
    // 注册模式 - 暂时提示功能未开放
    message.info('注册功能即将开放，敬请期待！');
  }
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        @click="handleClose"
      ></div>

      <!-- Modal Content -->
      <div
        class="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl transition-all"
        @click.stop
      >
        <!-- Close Button -->
        <button
          @click="handleClose"
          class="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 active:scale-95"
        >
          <X class="h-4 w-4" />
        </button>

        <div class="p-8">
          <!-- Header -->
          <div class="mb-8 text-center">
            <h2 class="text-2xl font-bold text-slate-900">
              {{ isLogin ? '欢迎回来' : '创建账号' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">
              {{
                isLogin
                  ? '登录以继续您的生物信息分析之旅'
                  : '免费注册，探索无限可能'
              }}
            </p>
          </div>

          <!-- Tabs -->
          <div class="mb-8 flex rounded-xl bg-slate-100 p-1">
            <button
              class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
              :class="
                isLogin
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="isLogin = true"
            >
              登录
            </button>
            <button
              class="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
              :class="
                !isLogin
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="isLogin = false"
            >
              注册
            </button>
          </div>

          <!-- Form -->
          <form
            @submit.prevent="handleSubmit"
            class="space-y-4"
            autocomplete="off"
          >
            <div v-if="!isLogin">
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >用户名</label
              >
              <div class="relative">
                <div
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <User class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.username"
                  type="text"
                  autocomplete="off"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="您的称呼"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >用户名</label
              >
              <div class="relative">
                <div
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <User class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.username"
                  type="text"
                  autocomplete="off"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="输入用户名或邮箱"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >密码</label
              >
              <div class="relative">
                <div
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <Lock class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.password"
                  type="password"
                  autocomplete="new-password"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="输入密码"
                />
              </div>
            </div>

            <!-- 错误提示 -->
            <div
              v-if="errorMsg"
              class="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {{ errorMsg }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="group relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg
                  class="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                登录中...
              </span>
              <template v-else>
                {{ isLogin ? '立即登录' : '创建账户' }}
                <ArrowRight
                  class="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </template>
            </button>
          </form>

          <!-- Divider -->
          <div class="my-6 flex items-center gap-4">
            <div class="h-px flex-1 bg-slate-100"></div>
            <span class="text-xs text-slate-400">或者使用</span>
            <div class="h-px flex-1 bg-slate-100"></div>
          </div>

          <!-- Social Login -->
          <button
            class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95"
          >
            <Github class="h-4 w-4" />
            GitHub
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
