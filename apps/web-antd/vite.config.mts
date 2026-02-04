import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        // Docker 容器中使用轮询模式监听文件变化（解决 Windows HMR 问题）
        watch: {
          usePolling: true,
          interval: 1000,
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
