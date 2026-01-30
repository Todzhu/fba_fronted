import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
    {
        component: BasicLayout, // Use wrapper layout or BasicLayout
        meta: {
            icon: 'lucide:grid',
            keepAlive: true,
            order: 5,
            title: $t('page.tools.title'),
        },
        name: 'Tools',
        path: '/tools',
        children: [
            {
                name: 'ToolsIndex',
                path: '', // defaults to /tools
                component: () => import('#/views/tools/index.vue'),
                meta: {
                    title: $t('page.tools.plaza'), // Cloud Tools Plaza
                    icon: 'lucide:grid',
                },
            },
            {
                name: 'ToolDetail',
                path: ':id',
                component: () => import('#/views/tools/detail.vue'), // Placeholder for now
                meta: {
                    hideInMenu: true,
                    title: $t('page.tools.detail'),
                },
            },
        ],
    },
];

export default routes;
