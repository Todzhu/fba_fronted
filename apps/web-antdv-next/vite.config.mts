import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        hmr: {
          host: '172.30.10.205',
          port: 5173,
        },
        proxy: {
          '/api': {
            changeOrigin: true,
            // 真实后端地址
            target: 'http://172.30.10.205:8000',
            ws: true,
          },
          '/static': {
            changeOrigin: true,
            // 静态资源代理到后端
            target: 'http://172.30.10.205:8000',
          },
        },
      },
    },
  };
});
