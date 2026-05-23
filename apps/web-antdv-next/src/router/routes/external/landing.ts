import type { RouteRecordRaw } from 'vue-router';

// Public BioCloud client routes live here. These routes use ClientLayout and may show login prompts inside pages.
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
      {
        path: 'tool/:id',
        name: 'ToolUsage',
        component: () => import('#/views/biocloud/cloudTools/detail.vue'),
        meta: {
          title: '工具使用 - BioCloud',
          ignoreAccess: true,
        },
      },
      {
        path: 'data',
        name: 'MyData',
        component: () => import('#/views/biocloud/myData/index.vue'),
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
      {
        path: 'tasks/:taskId',
        name: 'TaskDetail',
        component: () => import('#/views/biocloud/task/TaskDetail.vue'),
        meta: { title: '任务详情 - BioCloud', ignoreAccess: true },
      },
      {
        path: 'pipeline',
        name: 'PipelineList',
        component: () => import('#/views/biocloud/pipeline/PipelineList.vue'),
        meta: {
          title: '云流程 - BioCloud',
          ignoreAccess: true,
        },
      },
      {
        path: 'pipeline/create',
        name: 'PipelineCreate',
        component: () => import('#/views/biocloud/pipeline/PipelineCreate.vue'),
        meta: {
          title: '创建云流程 - BioCloud',
          ignoreAccess: true,
        },
      },
      {
        path: 'pipeline/:id',
        name: 'PipelineDetail',
        component: () => import('#/views/biocloud/pipeline/PipelineDetail.vue'),
        meta: {
          title: '流程详情 - BioCloud',
          ignoreAccess: true,
        },
      },
    ],
  },
];

export default routes;
