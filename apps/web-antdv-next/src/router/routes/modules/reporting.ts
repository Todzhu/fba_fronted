import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'Reporting',
    path: '/reporting',
    component: () => import('#/layouts/basic.vue'),
    redirect: '/reporting/list',
    meta: {
      title: '报告管理',
      icon: 'mdi:file-chart-outline',
      order: 11,
      alwaysAccessible: true,
    },
    children: [
      {
        name: 'ReportingCreate',
        path: 'create',
        component: () => import('#/views/reporting/create.vue'),
        meta: {
          title: '创建报告',
          icon: 'mdi:playlist-edit',
          alwaysAccessible: true,
        },
      },
      {
        name: 'ReportingList',
        path: 'list',
        component: () => import('#/views/reporting/list.vue'),
        meta: {
          title: '报告列表',
          icon: 'mdi:history',
          alwaysAccessible: true,
        },
      },
      {
        name: 'ReportingDetail',
        path: ':id/view',
        component: () => import('#/views/reporting/detail.vue'),
        meta: {
          title: '查看报告',
          icon: 'mdi:file-eye-outline',
          hideInMenu: true,
          alwaysAccessible: true,
        },
      },
    ],
  },
];

export default routes;
