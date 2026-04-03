import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:experiment-outlined',
      order: 1,
      title: 'AI agent',
      hideInMenu: true,
    },
    name: 'BioClaw',
    path: '/agent',
    component: () => import('#/views/bioclaw/workbench/index.vue'),
  },
];

export default routes;
