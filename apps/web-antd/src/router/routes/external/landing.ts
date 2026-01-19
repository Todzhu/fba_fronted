import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/landing/LandingPage.vue'),
    meta: {
      hideInMenu: true,
      ignoreAccess: true,
      title: '工具广场',
    },
    name: 'LandingPage',
    path: '/index',
    alias: ['/landing', '/plaza'],
  },
];

export default routes;
