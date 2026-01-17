import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = {
    ...import.meta.glob('../views/**/*.vue'),
    ...import.meta.glob('../plugins/**/*.vue'),
  };

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const result = await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      return await getAllMenusApi();
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });

  // 手动添加前端定义的隐藏详情页路由（后端可能不返回这些路由）
  // 遍历 options.routes 找到所有 hideInMenu 的路由并确保它们被包含
  const ensureHiddenRoutes = (routes: any[], accessibleRoutes: any[]) => {
    routes.forEach(route => {
      if (route.children && route.children.length > 0) {
        // 检查是否有父路由在 accessibleRoutes 中
        const parentInAccessible = accessibleRoutes.find(r => r.name === route.name || r.path === route.path);
        if (parentInAccessible) {
          // 遍历子路由，添加隐藏的详情页
          route.children.forEach((child: any) => {
            if (child.meta?.hideInMenu && !parentInAccessible.children?.find((c: any) => c.name === child.name)) {
              // 这个隐藏路由不在 accessibleRoutes 中，手动添加
              if (!parentInAccessible.children) {
                parentInAccessible.children = [];
              }
              parentInAccessible.children.push(child);
            }
          });
        }
        // 递归处理子路由
        if (parentInAccessible?.children) {
          ensureHiddenRoutes(route.children, parentInAccessible.children);
        }
      }
    });
  };

  if (options.routes && result.accessibleRoutes) {
    ensureHiddenRoutes(options.routes, result.accessibleRoutes);
  }

  return result;
}

export { generateAccess };
