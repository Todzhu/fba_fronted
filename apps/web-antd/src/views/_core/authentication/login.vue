<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, h, onMounted, onUnmounted, ref } from 'vue';

import { AuthenticationLogin, useVbenForm } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { useAccessStore, useAuthStore } from '@vben/stores';

import { message, Modal } from 'ant-design-vue';
import { refAutoReset } from '@vueuse/core';

import { getCaptcha } from '#/api';

defineOptions({ name: 'Login' })

const authStore = useAuthStore();
const accessStore = useAccessStore();

const imageSrc = ref('');
const captchaEnabled = ref(false);
const captchaExpireSeconds = ref(0);
const uuid = ref('');

// 倒计时
const countdown = refAutoReset(0, 1000); // 1秒后重置为0，用于简单的倒计时触发器不合适，直接用数字减吧。
// const countdownValue = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const loading = ref(false);

// 生成验证码
const refreshCaptcha = async () => {
  try {
    const result = await getCaptcha();
    if (result) {
      if (result.is_enabled) {
        captchaEnabled.value = true;
        imageSrc.value = result.image;
        uuid.value = result.uuid;
        captchaExpireSeconds.value = result.expire_seconds;

        // 重置并启动倒计时
        if (timer) clearInterval(timer);
        countdown.value = result.expire_seconds;
        timer = setInterval(() => {
          if (countdown.value > 0) {
            countdown.value--;
          } else {
            if (timer) clearInterval(timer);
          }
        }, 1000);
      } else {
        captchaEnabled.value = false;
        if (timer) clearInterval(timer);
      }
    }
  } catch (error) {
    console.error('Failed to get captcha:', error);
    captchaEnabled.value = false;
  }
};

const formSchema = computed((): VbenFormSchema[] => {
  const baseFields: VbenFormSchema[] = [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.passwordTip'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];

  if (captchaEnabled.value) {
    baseFields.push({
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入验证码',
      },
      fieldName: 'captcha',
      label: '验证码',
      rules: z.string().min(1, { message: '请输入验证码' }),
      renderComponentContent: () => {
        return {
          addonAfter: () =>
            h('div', { class: 'flex items-center cursor-pointer' }, [
              imageSrc.value
                ? h('img', {
                    src: imageSrc.value,
                    alt: 'captcha',
                    class: 'h-8 cursor-pointer',
                    onClick: refreshCaptcha,
                    style: { display: 'block' },
                  })
                : null,
            ]),
        };
      },
    });
  }

  return baseFields;
});

const [Form, { validate, setValues }] = useVbenForm({
  fieldMappingTime: [['rangeDate', ['startTime', 'endTime'], 'YYYY-MM-DD']],
  schema: formSchema,
  showDefaultActions: false,
});

const handleSubmit = async () => {
  const { valid, values } = await validate();
  if (valid) {
    try {
      loading.value = true;
      // 添加 uuid 到登录参数
      const loginParams = {
        ...values,
        uuid: uuid.value,
      };

      await authStore.authLogin(loginParams);
      await accessStore.fetchAccess();
      await refreshCaptcha(); // 登录成功也刷新一下，虽然会跳转
    } catch (error: any) {
      console.error('Login failed:', error);
      // 登录失败强制刷新验证码
      await refreshCaptcha();
      // 密码错误还是验证码错误，已经在 axios 拦截器处理或者 store 处理了
    } finally {
      loading.value = false;
    }
  }
};

onMounted(() => {
  refreshCaptcha();
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <AuthenticationLogin :loading="loading" @submit="handleSubmit">
    <template #content>
      <Form />
      <!-- 倒计时提示（可选） -->
      <div v-if="captchaEnabled && countdown > 0 && countdown <= 10" class="text-xs text-red-500 mt-1">
        验证码将在 {{ countdown }} 秒后过期
      </div>
      <div v-if="captchaEnabled && countdown === 0" class="text-xs text-gray-500 mt-1 cursor-pointer" @click="refreshCaptcha">
        验证码已过期，点击刷新
      </div>
    </template>
  </AuthenticationLogin>
</template>
