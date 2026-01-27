import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        host: '0.0.0.0',
        proxy: {
          '/api': {
            changeOrigin: true,
            // 真实后端地址
            target: 'http://localhost:8000',
            ws: true,
          },
        },
      },
    },
  };
});

