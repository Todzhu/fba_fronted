import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules } from '@vben/utils';

import { coreRoutes, fallbackRoutes } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

// const externalRouteFiles = import.meta.glob('./external/**/*.ts', {
//   eager: true,
// });

// const staticRouteFiles = import.meta.glob('./static/**/*.ts', {
//   eager: true,
// });

/** 动态路由 */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** 插件路由 */
const pluginRouteFiles = import.meta.glob('./plugin/**/*.ts', {
  eager: true,
});
const pluginRoutes: RouteRecordRaw[] = mergeRouteModules(pluginRouteFiles);

/** 外部路由列表，访问这些页面可以不需要Layout，可能用于内嵌在别的系统(不会显示在菜单中) */
// const externalRoutes: RouteRecordRaw[] = mergeRouteModules(externalRouteFiles);
// const staticRoutes: RouteRecordRaw[] = mergeRouteModules(staticRouteFiles);

// 静态路由 - 不受后端菜单控制，直接加载
const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/analysis',
    component: () => import('#/layouts/basic.vue'),
    children: [
      {
        name: 'AnalysisToolDetail',
        path: 'tool/:id',
        component: () => import('#/views/cloudTools/detail.vue'),
        meta: {
          hideInMenu: true,
          title: '工具分析',
          activeMenu: '/analysis/tools',
        },
      },
    ],
  },
];
const externalRoutes: RouteRecordRaw[] = [];

/** 路由列表，由基本路由、外部路由和404兜底路由组成
 *  无需走权限验证（会一直显示在菜单中） */
const publicRoutes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...externalRoutes,
  ...fallbackRoutes,
];

export { dynamicRoutes, externalRoutes, pluginRoutes, publicRoutes, staticRoutes };
