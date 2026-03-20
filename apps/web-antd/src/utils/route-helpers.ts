import type { Router } from 'vue-router';

/**
 * 动态查找任务中心路由路径
 *
 * 后台菜单系统可自由配置路由路径，前端不应硬编码。
 * 通过多种策略查找任务中心路由，无论后台配置了什么路径都能正确跳转。
 */
export function getTaskCenterPath(router: Router): string {
    const routes = router.getRoutes();

    for (const route of routes) {
        // 策略1: 匹配后端菜单注册的路由（meta.component 包含组件路径）
        const meta = route.meta as Record<string, any> | undefined;
        if (meta?.component && typeof meta.component === 'string') {
            if (meta.component.includes('cloudTools/tasks')) {
                return route.path;
            }
        }

        // 策略2: 匹配路由名称（前端定义的路由）
        if (route.name === 'AnalysisTasks') {
            return route.path;
        }

        // 策略3: 匹配路由 path 中包含 tasks 且排除详情页的
        if (
            route.path.endsWith('/tasks') &&
            route.components?.default
        ) {
            return route.path;
        }
    }

    // 最终 fallback
    return '/tasks';
}
