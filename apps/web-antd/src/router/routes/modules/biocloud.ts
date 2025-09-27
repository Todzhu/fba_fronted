import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:cloud',
      order: 1000,
      title: '生物云',
    },
    name: 'Biocloud',
    path: '/biocloud',
    children: [
      {
        name: 'CloudTools',
        path: '/biocloud/cloudTools',
        component: () => import('#/views/biocloud/cloudTools/index.vue'),
        meta: {
          icon: 'lucide:wrench',
          title: '云工具管理',
        },
      },
    ],
  },
];

export default routes;