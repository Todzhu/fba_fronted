<script setup lang="ts">
import { reactive, ref } from 'vue';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Github,
  Loader2,
  Lock,
  Mail,
  User,
  X,
} from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const activeTab = ref<'login' | 'register'>('login');
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const loginForm = reactive({
  username: '',
  password: '',
});

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const closeModal = () => {
  if (isLoading.value) return;
  emit('update:visible', false);
};

const handleLogin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  console.log('Login attempt:', loginForm);

  // Simulate API call
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Implement actual login logic here
  } finally {
    isLoading.value = false;
  }
};

const handleRegister = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  console.log('Register attempt:', registerForm);

  // Simulate API call
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Implement actual register logic here
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          @click="closeModal"
        ></div>

        <!-- Modal Content -->
        <Transition
          enter-active-class="transition duration-300 ease-out transform"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in transform"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
          appear
        >
          <div
            class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <!-- Close Button -->
            <button
              @click="closeModal"
              class="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              :disabled="isLoading"
            >
              <X class="h-5 w-5" />
            </button>

            <!-- Header / Illustration -->
            <div
              class="border-b border-rose-100/50 bg-gradient-to-br from-rose-50 via-white to-rose-50 p-8 pb-6 text-center"
            >
              <div
                class="mx-auto mb-4 flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-200 transition-transform duration-300 hover:scale-105"
              >
                <span class="text-2xl font-bold tracking-tighter">B</span>
              </div>
              <h2 class="text-2xl font-bold tracking-tight text-gray-900">
                {{ activeTab === 'login' ? '欢迎回来' : '创建账号' }}
              </h2>
              <p class="mt-2 text-sm text-gray-500">
                {{
                  activeTab === 'login'
                    ? '登录以继续使用 BioCloud 工具'
                    : '加入 BioCloud，开启科研之旅'
                }}
              </p>
            </div>

            <!-- Tabs -->
            <div class="relative mx-6 mt-6 flex rounded-xl bg-gray-100/80 p-1">
              <div
                class="ease-spring absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-all duration-300"
                :class="
                  activeTab === 'login' ? 'left-1' : 'left-[calc(50%+4px)]'
                "
              ></div>
              <button
                class="relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                :class="
                  activeTab === 'login'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                "
                @click="activeTab = 'login'"
              >
                登录
              </button>
              <button
                class="relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                :class="
                  activeTab === 'register'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                "
                @click="activeTab = 'register'"
              >
                注册
              </button>
            </div>

            <!-- Forms -->
            <div class="p-8 pt-6">
              <!-- Login Form -->
              <form
                v-if="activeTab === 'login'"
                @submit.prevent="handleLogin"
                class="space-y-5"
              >
                <div class="space-y-1.5">
                  <label class="ml-1 text-xs font-semibold text-gray-700"
                    >用户名</label
                  >
                  <div class="group relative">
                    <User
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="loginForm.username"
                      type="text"
                      placeholder="请输入用户名"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <div class="ml-1 flex items-center justify-between">
                    <label class="text-xs font-semibold text-gray-700"
                      >密码</label
                    >
                    <a
                      href="#"
                      class="text-xs font-medium text-rose-500 hover:text-rose-600 hover:underline"
                      >忘记密码?</a
                    >
                  </div>
                  <div class="group relative">
                    <Lock
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="loginForm.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="请输入密码"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-10 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                    <button
                      type="button"
                      @click="showPassword = !showPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <component
                        :is="showPassword ? EyeOff : Eye"
                        class="h-4 w-4"
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl hover:shadow-rose-500/40 active:bg-rose-800 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="isLoading"
                >
                  <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
                  <span v-else>立即登录</span>
                  <ArrowRight v-if="!isLoading" class="h-4 w-4" />
                </button>
              </form>

              <!-- Register Form -->
              <form v-else @submit.prevent="handleRegister" class="space-y-4">
                <div class="space-y-1.5">
                  <label class="ml-1 text-xs font-semibold text-gray-700"
                    >用户名</label
                  >
                  <div class="group relative">
                    <User
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="registerForm.username"
                      type="text"
                      placeholder="设置用户名"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="ml-1 text-xs font-semibold text-gray-700"
                    >邮箱</label
                  >
                  <div class="group relative">
                    <Mail
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="registerForm.email"
                      type="email"
                      placeholder="您的邮箱地址"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="ml-1 text-xs font-semibold text-gray-700"
                    >密码</label
                  >
                  <div class="group relative">
                    <Lock
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="registerForm.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="设置登录密码"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-10 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                    <button
                      type="button"
                      @click="showPassword = !showPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <component
                        :is="showPassword ? EyeOff : Eye"
                        class="h-4 w-4"
                      />
                    </button>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="ml-1 text-xs font-semibold text-gray-700"
                    >确认密码</label
                  >
                  <div class="group relative">
                    <Lock
                      class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-rose-500"
                    />
                    <input
                      v-model="registerForm.confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      placeholder="再次输入密码"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-10 text-sm placeholder-gray-400 outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      required
                      :disabled="isLoading"
                    />
                    <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <component
                        :is="showConfirmPassword ? EyeOff : Eye"
                        class="h-4 w-4"
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 font-bold text-white shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl hover:shadow-rose-500/40 active:bg-rose-800 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="isLoading"
                >
                  <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
                  <span v-else>注册账号</span>
                </button>
              </form>

              <!-- Divider -->
              <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-100"></div>
                </div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-white px-2 text-gray-400">或者</span>
                </div>
              </div>

              <!-- Social Login -->
              <button
                class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100"
                :disabled="isLoading"
              >
                <Github class="h-5 w-5" />
                使用 GitHub 登录
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
