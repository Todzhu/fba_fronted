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
    children: [
      {
        name: 'AnalysisTools',
        path: '/analysis/tools',
        component: () => import('#/views/cloudTools/index.vue'),
        meta: {
          icon: 'ant-design:tool-outlined',
          title: '工具广场',
        },
      },
    ],
  },
];

export default routes;
