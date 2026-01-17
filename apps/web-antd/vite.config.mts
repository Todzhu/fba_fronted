import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          // 后端 API 代理
          '/api/v1': {
            changeOrigin: true,
            target: 'http://localhost:8000',
            ws: true,
          },
          // Mock 服务代理（保留用于其他 mock 数据）
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
