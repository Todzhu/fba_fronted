// @ts-check

import { defineConfig } from '@vben/eslint-config';

export default defineConfig([
    {
        files: ['**/*.vue'],
        rules: {
            // 禁用与 Prettier 冲突的规则
            'vue/html-closing-bracket-newline': 'off',
        },
    },
]);
