import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('#/layouts/ClientLayout.vue'),
    redirect: '/index',
    children: [
      {
        path: 'index',
        name: 'LandingPage',
        component: () => import('#/views/biocloud/landing/LandingPage.vue'),
        alias: ['/', '/home'],
        meta: {
          title: 'BioCloud - 多组学生信分析云平台',
          ignoreAccess: true,
        },
      },
      {
        path: 'tools',
        name: 'CloudTools',
        component: () => import('#/views/biocloud/cloudTools/CloudTools.vue'),
        meta: {
          title: '云工具 - BioCloud',
          ignoreAccess: true, // Allow browsing without login
        },
      },
      // Placeholder routes for future implementation
      {
        path: 'tool/:id',
        name: 'ToolUsage',
        component: () => import('#/views/cloudTools/detail.vue'),
        meta: {
          title: '工具使用 - BioCloud',
          ignoreAccess: true,
        },
      },
      {
        path: 'data',
        name: 'MyData',
        component: () => import('#/views/biocloud/data/MyData.vue'),
        meta: {
          title: '我的数据 - BioCloud',
          ignoreAccess: true,
        },
      },
      {
        path: 'tasks',
        name: 'MyTasks',
        component: () => import('#/views/biocloud/task/MyTasks.vue'),
        meta: { title: '我的任务 - BioCloud', ignoreAccess: true },
      },
      /*
      {
         path: 'pipeline',
         name: 'CloudFlow',
         component: () => import('#/views/pipeline/CloudFlow.vue'),
         meta: { title: '云流程' }
      }
      */
    ],
  },
];

export default routes;
