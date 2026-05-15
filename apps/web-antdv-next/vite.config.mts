import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        hmr: {
          host: '127.0.0.1',
          port: 5173,
        },
        proxy: {
          '/api': {
            changeOrigin: true,
            // 真实后端地址
            target: 'http://127.0.0.1:8001',
            ws: true,
          },
          '/static': {
            changeOrigin: true,
            // 静态资源代理到后端
            target: 'http://127.0.0.1:8001',
          },
        },
      },
    },
  };
});
