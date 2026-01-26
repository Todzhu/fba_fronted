import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:appstore-outlined',
      order: 10,
      title: '分析工具',
    },
    name: 'Analysis',
    path: '/analysis',
    component: () => import('#/layouts/basic.vue'),
    children: [
      {
        name: 'AnalysisTools',
        path: '/analysis/tools',
        component: () => import('#/views/cloudTools/index.vue'),
        meta: {
          icon: 'ant-design:tool-outlined',
          title: '分析工具',
        },
      },
      {
        name: 'AnalysisToolDetail',
        path: '/analysis/tool/:id',
        component: () => import('#/views/cloudTools/detail.vue'),
        meta: {
          title: '工具详情',
          hideInMenu: true,
        },
      },
    ],
  },
];

export default routes;
