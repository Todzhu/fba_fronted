import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:folder-outlined',
      order: 11,
      title: '我的数据',
    },
    name: 'MyData',
    path: '/my-data',
    component: () => import('#/views/myData/index.vue'),
  },
];

export default routes;
