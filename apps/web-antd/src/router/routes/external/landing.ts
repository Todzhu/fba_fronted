import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/landing/LandingPage.vue'),
    meta: {
      hideInMenu: true,
      ignoreAccess: true,
      title: 'BioCloud - 多组学生信分析云平台',
    },
    name: 'LandingPage',
    path: '/index',
    alias: ['/landing', '/home'],
  },
];

export default routes;
