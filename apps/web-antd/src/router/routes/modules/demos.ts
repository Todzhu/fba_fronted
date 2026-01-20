import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-template',
      order: 1000,
      title: 'Demos',
    },
    name: 'Demos',
    path: '/demos',
    children: [
      {
        name: 'Spreadsheet',
        path: '/demos/spreadsheet',
        component: () => import('#/views/demos/spreadsheet/index.vue'),
        meta: {
          icon: 'lucide:sheet',
          title: 'Spreadsheet',
        },
      },
    ],
  },
];

export default routes;
