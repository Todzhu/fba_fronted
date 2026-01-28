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
      {
        name: 'ScPipeline',
        path: '/analysis/sc-pipeline',
        component: () => import('#/views/scPipeline/index.vue'),
        meta: {
          icon: 'mdi:dna',
          title: '单细胞分析',
        },
      },
      {
        name: 'ScPipelineDetail',
        path: '/analysis/sc-pipeline/:id',
        component: () => import('#/views/scPipeline/detail.vue'),
        meta: {
          title: '分析详情',
          hideInMenu: true,
        },
      },
      {
        name: 'AnalysisTasks',
        path: '/analysis/tasks',
        component: () => import('#/views/cloudTools/tasks/index.vue'),
        meta: {
          icon: 'mdi:clipboard-list-outline',
          title: '任务中心',
        },
      },
    ],
  },
];

export default routes;
