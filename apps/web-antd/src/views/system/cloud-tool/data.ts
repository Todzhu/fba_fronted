import type { VbenFormSchema } from '#/adapter/form';
import type {
    OnActionClickFn,
    OnActionClickParams,
    VxeGridProps,
} from '#/adapter/vxe-table';
import type { AnalysisTool } from '#/api';

import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { updateCloudToolApi } from '#/api';

export const querySchema: VbenFormSchema[] = [
    {
        component: 'Input',
        fieldName: 'search',
        label: '关键词',
        componentProps: {
            placeholder: '搜索工具名称或描述',
        },
    },
    {
        component: 'Select',
        componentProps: {
            allowClear: true,
            options: [
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
            ],
            placeholder: $t('common.form.select'),
        },
        fieldName: 'status',
        label: $t('common.form.status'),
    },
];

export function useColumns(
    onActionClick?: OnActionClickFn<AnalysisTool>,
): VxeGridProps['columns'] {
    return [
        {
            field: 'seq',
            title: $t('common.table.id'),
            type: 'seq',
            fixed: 'left',
            width: 50,
        },
        { field: 'title', title: '工具名称', fixed: 'left', width: 180 },
        { field: 'omics_category', title: '组学分类', width: 100 },
        { field: 'func_category', title: '功能分类', width: 100 },
        {
            field: 'description',
            title: '描述',
            width: 200,
            showOverflow: 'ellipsis',
        },
        { field: 'icon', title: '图标', width: 80 },
        { field: 'color', title: '颜色', width: 80 },
        { field: 'views', title: '浏览次数', width: 90 },
        { field: 'stars', title: '收藏数', width: 80 },
        { field: 'sort', title: '排序', width: 60 },
        {
            field: 'status',
            title: '状态',
            width: 80,
            cellRender: {
                name: 'CellSwitch',
                attrs: {
                    onChange: ({ row }: OnActionClickParams<AnalysisTool>) => {
                        updateCloudToolApi(row.id, { status: row.status === 1 ? 0 : 1 }).then(() => {
                            message.success($t('ui.actionMessage.operationSuccess'));
                        });
                    },
                },
            },
        },
        { field: 'created_time', title: '创建时间', width: 168 },
        {
            field: 'operation',
            title: $t('common.table.operation'),
            align: 'center',
            fixed: 'right',
            width: 150,
            cellRender: {
                attrs: {
                    nameField: 'title',
                    onClick: onActionClick,
                },
                name: 'CellOperation',
                options: ['edit', 'delete'],
            },
        },
    ];
}

export const formSchema: VbenFormSchema[] = [
    {
        component: 'Input',
        fieldName: 'title',
        label: '工具名称',
        rules: 'required',
    },
    {
        component: 'Input',
        fieldName: 'omics_category',
        label: '组学分类',
        rules: 'required',
    },
    {
        component: 'Input',
        fieldName: 'func_category',
        label: '功能分类',
    },
    {
        component: 'Textarea',
        fieldName: 'description',
        label: '描述',
        componentProps: {
            rows: 3,
        },
    },
    {
        component: 'Input',
        fieldName: 'icon',
        label: '图标标识',
        componentProps: {
            placeholder: '输入图标Class或图片URL(以/开头)',
        },
    },
    {
        component: 'Input',
        fieldName: 'color',
        label: '图标颜色',
    },
    {
        component: 'InputNumber',
        fieldName: 'sort',
        label: '排序',
        componentProps: {
            min: 0,
        },
        defaultValue: 0,
    },
    {
        component: 'RadioGroup',
        fieldName: 'status',
        label: '状态',
        componentProps: {
            options: [
                { label: '正常', value: 1 },
                { label: '停用', value: 0 },
            ],
        },
        defaultValue: 1,
    },
];
