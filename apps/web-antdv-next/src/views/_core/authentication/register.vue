<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { registerApi, sendRegisterEmailCaptchaApi } from '#/api/core/auth';

defineOptions({ name: 'Register' });

const CODE_LENGTH = 6;
const CWMDA_EMAIL_PATTERN = /^[^@\s]+@cwmda\.com$/i;

const router = useRouter();
const loading = ref(false);
const emailValue = ref('');

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isCwmdaEmail(email: string) {
  return CWMDA_EMAIL_PATTERN.test(normalizeEmail(email));
}

async function handleSendEmailCaptcha() {
  const email = normalizeEmail(emailValue.value);
  if (!isCwmdaEmail(email)) {
    message.error('Please enter a @cwmda.com email address');
    return;
  }
  await sendRegisterEmailCaptchaApi({ email });
  message.success('Verification code sent. Please check your inbox');
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: 'Enter your @cwmda.com email',
      },
      fieldName: 'email',
      label: 'Email',
      rules: z
        .string()
        .min(1, { message: 'Please enter your email' })
        .email({ message: 'Please enter a valid email address' })
        .refine((value) => isCwmdaEmail(value), {
          message: 'Only @cwmda.com email addresses are allowed',
        }),
    },
    {
      component: 'VbenPinInput',
      componentProps: {
        codeLength: CODE_LENGTH,
        createText: (countdown: number) => {
          return countdown > 0
            ? $t('authentication.sendText', [countdown])
            : $t('authentication.sendCode');
        },
        handleSendCode: handleSendEmailCaptcha,
        placeholder: $t('authentication.code'),
      },
      dependencies: {
        trigger(values) {
          emailValue.value = values.email || '';
        },
        triggerFields: ['email'],
      },
      fieldName: 'captcha',
      label: $t('authentication.code'),
      rules: z.string().length(CODE_LENGTH, {
        message: $t('authentication.codeTip', [CODE_LENGTH]),
      }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => $t('authentication.passwordStrength'),
        };
      },
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
  ];
});

async function handleSubmit(value: Recordable<any>) {
  const email = normalizeEmail(value.email);
  loading.value = true;
  try {
    await registerApi({
      email,
      password: value.password,
      confirm_password: value.confirmPassword,
      captcha: value.captcha,
    });
    message.success('Registration successful. Please log in');
    await router.push('/auth/login');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
</template>
