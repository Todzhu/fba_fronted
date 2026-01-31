import type { RouteRecordRaw } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';

import { $t } from '#/locales';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');
/** 全局404页面 */
const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

/** 基本路由，这些路由是必须存在的 */
const coreRoutes: RouteRecordRaw[] = [
  /**
   * 根路由
   * 使用基础布局，作为所有页面的父级容器，子级就不必配置BasicLayout。
   * 此路由必须存在，且不应修改
   */
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    redirect: '/index',
    children: [],
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: {
          title: $t('page.auth.login'),
        },
      },
      {
        name: 'CodeLogin',
        path: 'code-login',
        component: () => import('#/views/_core/authentication/code-login.vue'),
        meta: {
          title: $t('page.auth.codeLogin'),
        },
      },
      {
        name: 'QrCodeLogin',
        path: 'qrcode-login',
        component: () =>
          import('#/views/_core/authentication/qrcode-login.vue'),
        meta: {
          title: $t('page.auth.qrcodeLogin'),
        },
      },
      {
        name: 'ForgetPassword',
        path: 'forget-password',
        component: () =>
          import('#/views/_core/authentication/forget-password.vue'),
        meta: {
          title: $t('page.auth.forgetPassword'),
        },
      },
      {
        name: 'Register',
        path: 'register',
        component: () => import('#/views/_core/authentication/register.vue'),
        meta: {
          title: $t('page.auth.register'),
        },
      },
    ],
  },
  {
    component: BasicLayout,
    meta: {
      title: 'Analysis',
    },
    name: 'AnalysisCore',
    path: '/analysis',
    children: [
      {
        name: 'AnalysisTools',
        path: 'tools',
        component: () => import('#/views/cloudTools/index.vue'),
        meta: {
          title: '分析工具',
        },
      },
      {
        name: 'AnalysisToolDetail',
        path: 'tool/:id',
        component: () => import('#/views/cloudTools/detail.vue'),
        meta: {
          title: '工具详情',
          hideInMenu: true,
        },
      },
      {
        name: 'ScPipeline',
        path: 'sc-pipeline',
        component: () => import('#/views/scPipeline/index.vue'),
        meta: {
          icon: 'mdi:dna',
          title: '单细胞分析',
        },
      },
      {
        name: 'ScPipelineDetail',
        path: 'sc-pipeline/:id',
        component: () => import('#/views/scPipeline/detail.vue'),
        meta: {
          title: '分析详情',
          hideInMenu: true,
        },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
