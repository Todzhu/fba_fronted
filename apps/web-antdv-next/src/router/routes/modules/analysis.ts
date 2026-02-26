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
        component: () => import('#/views/biocloud/cloudTools/index.vue'),
        meta: {
          icon: 'ant-design:tool-outlined',
          title: '分析工具',
        },
      },
      {
        name: 'AnalysisToolDetail',
        path: '/analysis/tool/:id',
        component: () => import('#/views/biocloud/cloudTools/detail.vue'),
        meta: {
          title: '工具详情',
          hideInMenu: true,
        },
      },
      {
        name: 'AnalysisTasks',
        path: '/analysis/tasks',
        component: () => import('#/views/biocloud/cloudTools/tasks/index.vue'),
        meta: {
          icon: 'mdi:clipboard-list-outline',
          title: '任务中心',
        },
      },
    ],
  },
];

export default routes;
