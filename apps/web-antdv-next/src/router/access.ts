import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'antdv-next';

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
    routes.forEach((route) => {
      if (route.children && route.children.length > 0) {
        // 检查是否有父路由在 accessibleRoutes 中
        const parentInAccessible = accessibleRoutes.find(
          (r) => r.name === route.name || r.path === route.path,
        );
        if (parentInAccessible) {
          // 遍历子路由，添加隐藏的详情页
          route.children.forEach((child: any) => {
            const shouldAdd = child.meta?.hideInMenu || child.meta?.alwaysAccessible;
            if (shouldAdd && !parentInAccessible.children?.find((c: any) => c.name === child.name)) {
              // 这个隐藏路由不在 accessibleRoutes 中，手动添加
              if (!parentInAccessible.children) {
                parentInAccessible.children = [];
              }
              parentInAccessible.children.push(child);
              if (
                parentInAccessible.name &&
                child.name &&
                !options.router.hasRoute(child.name)
              ) {
                options.router.addRoute(parentInAccessible.name, child);
              }
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

  const reportingHiddenRoutes = [
    {
      name: 'MockReportCreate',
      path: 'mock-report/create',
      component: () => import('#/views/reporting/create.vue'),
      meta: {
        title: '创建报告',
        hideInMenu: true,
      },
    },
    {
      name: 'MockReportDetail',
      path: 'mock-report/:id/view',
      component: () => import('#/views/reporting/detail.vue'),
      meta: {
        title: '查看报告',
        hideInMenu: true,
      },
    },
  ];

  reportingHiddenRoutes.forEach((route) => {
    if (!options.router.hasRoute(route.name)) {
      options.router.addRoute('Root', route);
    }
  });

  const analysisHiddenRoutes = [
    {
      name: 'AnalysisToolDetail',
      path: 'analysis/tool/:id',
      component: () => import('#/views/cloudTools/detail.vue'),
      meta: {
        title: '工具详情',
        hideInMenu: true,
      },
    },
    {
      name: 'TaskDetail',
      path: 'analysis/tasks/:taskId',
      component: () => import('#/views/cloudTools/tasks/TaskDetail.vue'),
      meta: {
        title: '任务详情',
        hideInMenu: true,
        alwaysAccessible: true,
      },
    },
    {
      name: 'ScPipelineDetail',
      path: 'sc-pipeline/:id',
      component: () => import('#/views/scPipeline/detail.vue'),
      meta: {
        title: '单细胞分析流程',
        hideInMenu: true,
        alwaysAccessible: true,
        fullPathKey: true,
      },
    },
    {
      name: 'ScPipelineDetailLegacy',
      path: 'analysis/sc-pipeline/:id',
      redirect: (to: any) => ({
        name: 'ScPipelineDetail',
        params: to.params,
        query: to.query,
      }),
      meta: {
        title: '单细胞分析流程',
        hideInMenu: true,
        alwaysAccessible: true,
        fullPathKey: true,
      },
    },
  ];

  analysisHiddenRoutes.forEach((route) => {
    if (!options.router.hasRoute(route.name)) {
      options.router.addRoute('Root', route);
    }
  });

  return result;
}

export { generateAccess };
