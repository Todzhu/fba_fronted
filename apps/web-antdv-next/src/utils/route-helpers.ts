import type { Router } from 'vue-router';

/**
 * 动态查找任务中心路由路径
 *
 * 后台菜单系统可自由配置路由路径，前端不应硬编码。
 * 通过多种策略查找任务中心路由，无论后台配置了什么路径都能正确跳转。
 */
export function getTaskCenterPath(router: Router): string {
    const routes = router.getRoutes();

    // 策略1: 优先匹配后端菜单注册的真实路由，例如 /my-task
    const backendMenuRoute = routes.find((route) => {
        const meta = route.meta as Record<string, any> | undefined;
        return (
            typeof meta?.component === 'string' &&
            meta.component.includes('cloudTools/tasks')
        );
    });
    if (backendMenuRoute) {
        return backendMenuRoute.path;
    }

    // 策略2: 匹配任务列表路径，排除详情页
    const taskPathRoute = routes.find(
        (route) =>
            route.path.endsWith('/tasks') &&
            !route.path.includes(':') &&
            route.components?.default,
    );
    if (taskPathRoute) {
        return taskPathRoute.path;
    }

    // 策略3: 兼容前端静态路由
    const namedRoute = routes.find((route) => route.name === 'AnalysisTasks');
    return namedRoute?.path || '/my-task';
}

/**
 * 动态查找分析工具列表路由路径。
 *
 * 后台菜单可把工具列表配置为 /tools、/analysis/tools 等不同路径，
 * 详情页返回时不能硬编码固定地址。
 */
export function getAnalysisToolsPath(router: Router): string {
    const routes = router.getRoutes();

    const backendMenuRoute = routes.find((route) => {
        const meta = route.meta as Record<string, any> | undefined;
        return (
            typeof meta?.component === 'string' &&
            meta.component.includes('cloudTools/index')
        );
    });
    if (backendMenuRoute) {
        return backendMenuRoute.path;
    }

    const toolsPathRoute = routes.find(
        (route) =>
            (route.path === '/tools' || route.path.endsWith('/tools')) &&
            route.components?.default,
    );
    if (toolsPathRoute) {
        return toolsPathRoute.path;
    }

    const namedRoute = routes.find((route) => route.name === 'AnalysisTools');
    return namedRoute?.path || '/tools';
}
