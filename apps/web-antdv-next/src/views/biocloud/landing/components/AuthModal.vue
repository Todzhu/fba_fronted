<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';
import { ArrowRight, Lock, Mail, ShieldCheck, User, X } from 'lucide-vue-next';

import { useAuthStore } from '#/store';

interface Props {
  isOpen: boolean;
  // 登录成功后跳转的目标路径，默认刷新当前页面
  redirectPath?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

const router = useRouter();
const authStore = useAuthStore();
const isLogin = ref(true); // true: Login, false: Register
const countdown = ref(0);
const captchaSending = ref(false);
let countdownTimer: null | ReturnType<typeof setInterval> = null;

// 表单数据
const formData = ref({
  username: '',
  password: '',
  nickname: '',
  confirmPassword: '',
  captcha: '',
});

// 加载状态
const loading = ref(false);

// 错误信息
const errorMsg = ref('');

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      isLogin.value = true;
      errorMsg.value = '';
    }
  },
);

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const startCountdown = () => {
  countdown.value = 60;
  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
};

const handleClose = () => {
  emit('close');
  errorMsg.value = '';
};

const switchMode = (nextIsLogin: boolean) => {
  isLogin.value = nextIsLogin;
  errorMsg.value = '';
};

const handleSendRegisterCaptcha = async () => {
  if (captchaSending.value || countdown.value > 0) {
    return;
  }

  const registerEmail = formData.value.username.trim();
  if (!isEmail(registerEmail)) {
    errorMsg.value = '请输入有效邮箱后再获取验证码';
    return;
  }

  captchaSending.value = true;
  errorMsg.value = '';
  try {
    await authStore.sendRegisterEmailCaptcha(
      registerEmail,
      formData.value.nickname.trim() || registerEmail,
    );
    message.success('验证码已发送，请查收邮箱');
    startCountdown();
  } catch (error: any) {
    errorMsg.value = error?.message || '验证码发送失败，请稍后重试';
  } finally {
    captchaSending.value = false;
  }
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
          uuid: '',
          captcha: '',
        },
        () => {
          // 使用 onSuccess 回调，阻止 authLogin 内部的默认 router.push
          // 关闭弹窗
          handleClose();
          // 跳转到目标页面（如果指定了 redirectPath），否则刷新当前页面
          if (props.redirectPath) {
            router.push(props.redirectPath);
          } else {
            // 刷新当前页面以更新登录状态
            window.location.reload();
          }
        },
      );
    } catch (error: any) {
      errorMsg.value = error?.message || '登录失败，请检查用户名和密码';
    } finally {
      loading.value = false;
    }
  } else {
    const registerEmail = formData.value.username.trim();
    if (!formData.value.nickname.trim()) {
      errorMsg.value = '请输入昵称';
      return;
    }
    if (!isEmail(registerEmail)) {
      errorMsg.value = '请输入有效邮箱';
      return;
    }
    if (!formData.value.password) {
      errorMsg.value = '请输入密码';
      return;
    }
    if (formData.value.password !== formData.value.confirmPassword) {
      errorMsg.value = '两次输入的密码不一致';
      return;
    }
    if (!formData.value.captcha.trim()) {
      errorMsg.value = '请输入邮箱验证码';
      return;
    }

    loading.value = true;
    try {
      await authStore.authRegister({
        nickname: formData.value.nickname.trim(),
        email: registerEmail,
        password: formData.value.password,
        confirm_password: formData.value.confirmPassword,
        captcha: formData.value.captcha.trim(),
      });
      message.success('注册成功，请登录');
      isLogin.value = true;
      formData.value.password = '';
      formData.value.confirmPassword = '';
      formData.value.captcha = '';
    } catch (error: any) {
      errorMsg.value = error?.message || '注册失败，请稍后重试';
    } finally {
      loading.value = false;
    }
  }
};

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity"
        @click="handleClose"
      ></div>

      <!-- Modal Content -->
      <div
        class="auth-modal-card relative max-h-[calc(100vh-32px)] w-full max-w-[460px] overflow-hidden bg-white transition-all"
        @click.stop
      >
        <div class="auth-modal-glow"></div>

        <!-- Close Button -->
        <button
          class="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95"
          aria-label="关闭弹窗"
          @click="handleClose"
        >
          <X class="h-4 w-4" />
        </button>

        <div
          class="relative max-h-[calc(100vh-32px)] overflow-y-auto p-7 sm:p-9"
        >
          <!-- Header -->
          <div class="mb-7 text-center">
            <h2 class="text-[28px] font-bold leading-tight text-slate-950">
              {{ isLogin ? '欢迎回来' : '创建账号' }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{
                isLogin
                  ? '登录以继续您的生物信息分析之旅'
                  : '免费注册，探索无限可能'
              }}
            </p>
          </div>

          <!-- Tabs -->
          <div
            class="auth-tabs mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1"
          >
            <button
              class="auth-tab"
              :class="
                isLogin
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="switchMode(true)"
            >
              登录
            </button>
            <button
              class="auth-tab"
              :class="
                !isLogin
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="switchMode(false)"
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
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                昵称
              </label>
              <div class="auth-input-wrap">
                <div
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <User class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.nickname"
                  type="text"
                  autocomplete="off"
                  class="auth-input"
                  placeholder="请输入昵称"
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                {{ isLogin ? '用户名' : '邮箱' }}
              </label>
              <div class="auth-input-wrap">
                <div
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <component :is="isLogin ? User : Mail" class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.username"
                  :type="isLogin ? 'text' : 'email'"
                  autocomplete="off"
                  class="auth-input"
                  :placeholder="
                    isLogin ? '输入用户名或邮箱' : '输入邮箱作为登录账号'
                  "
                />
              </div>
            </div>

            <div v-if="!isLogin">
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                邮箱验证码
              </label>
              <div class="auth-input-wrap">
                <div
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <ShieldCheck class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.captcha"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  class="auth-input auth-input-with-action"
                  placeholder="输入邮箱验证码"
                />
                <button
                  type="button"
                  class="auth-send-code"
                  :disabled="
                    captchaSending ||
                    countdown > 0 ||
                    !isEmail(formData.username.trim())
                  "
                  @click="handleSendRegisterCaptcha"
                >
                  <span v-if="captchaSending">发送中</span>
                  <span v-else-if="countdown > 0">{{ countdown }}秒后重发</span>
                  <span v-else>获取验证码</span>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                密码
              </label>
              <div class="auth-input-wrap">
                <div
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <Lock class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.password"
                  type="password"
                  autocomplete="new-password"
                  class="auth-input"
                  placeholder="输入密码"
                />
              </div>
            </div>

            <div v-if="!isLogin">
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                确认密码
              </label>
              <div class="auth-input-wrap">
                <div
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <Lock class="h-4 w-4" />
                </div>
                <input
                  v-model="formData.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  class="auth-input"
                  placeholder="再次输入密码"
                />
              </div>
            </div>

            <!-- 错误提示 -->
            <div
              v-if="errorMsg"
              class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {{ errorMsg }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="group relative mt-6 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                class="absolute inset-0 bg-white/0 transition group-hover:bg-white/10"
              ></span>
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
                {{ isLogin ? '登录中...' : '注册中...' }}
              </span>
              <template v-else>
                {{ isLogin ? '立即登录' : '创建账户' }}
                <ArrowRight
                  class="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </template>
            </button>
          </form>
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

.fade-enter-active .auth-modal-card,
.fade-leave-active .auth-modal-card {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-from .auth-modal-card,
.fade-leave-to .auth-modal-card {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.auth-modal-card {
  border: 1px solid rgb(226 232 240 / 95%);
  border-radius: 28px;
  box-shadow:
    0 28px 80px rgb(15 23 42 / 22%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

.auth-modal-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 0%, rgb(34 211 238 / 20%), transparent 34%),
    radial-gradient(circle at 88% 10%, rgb(59 130 246 / 16%), transparent 32%),
    linear-gradient(
      180deg,
      rgb(248 250 252 / 96%) 0%,
      rgb(255 255 255 / 0%) 42%
    );
}

.auth-tab {
  min-height: 46px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 14px;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.auth-tab:active {
  transform: scale(0.98);
}

.auth-input-wrap {
  position: relative;
}

.auth-input {
  width: 100%;
  height: 50px;
  padding: 0 16px 0 44px;
  font-size: 14px;
  color: rgb(15 23 42);
  outline: none;
  background: rgb(248 250 252 / 82%);
  border: 1px solid rgb(226 232 240);
  border-radius: 16px;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.auth-input::placeholder {
  color: rgb(148 163 184);
}

.auth-input:focus {
  background: rgb(255 255 255);
  border-color: rgb(6 182 212);
  box-shadow:
    0 0 0 4px rgb(6 182 212 / 12%),
    0 12px 26px rgb(15 23 42 / 6%);
}

.auth-input-with-action {
  padding-right: 128px;
}

.auth-send-code {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 108px;
  min-height: 34px;
  padding: 0 10px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  color: rgb(37 99 235);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(239 246 255);
  border: 1px solid rgb(191 219 254);
  border-radius: 11px;
  transform: translateY(-50%);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.auth-send-code:hover:not(:disabled) {
  color: rgb(29 78 216);
  background: rgb(219 234 254);
  border-color: rgb(147 197 253);
}

.auth-send-code:disabled {
  cursor: not-allowed;
  color: rgb(148 163 184);
  background: rgb(241 245 249);
  border-color: rgb(226 232 240);
}

@media (max-width: 480px) {
  .auth-modal-card {
    border-radius: 24px;
  }
}
</style>
