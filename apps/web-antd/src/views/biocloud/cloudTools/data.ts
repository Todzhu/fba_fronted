import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import { h } from 'vue';
import { Tag, Button, Popconfirm, Space } from 'ant-design-vue';

// 搜索表单配置
export function useQuerySchema(categoryOptions: any, typeOptions: any): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入工具名称',
      },
      fieldName: 'name',
      label: '工具名称',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择组学分类',
        allowClear: true,
        options: categoryOptions?.map((item: string) => ({ label: item, value: item })) || [],
      },
      fieldName: 'category',
      label: '组学分类',
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择功能分类',
        allowClear: true,
        options: typeOptions?.map((item: string) => ({ label: item, value: item })) || [],
      },
      fieldName: 'type',
      label: '功能分类',
      rules: 'selectRequired',
    },
  ];
}

// 表格列配置
export function useColumns(actions: {
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      width: 60,
      title: '序号',
    },
    {
      field: 'name',
      title: '工具名称',
      width: 150,
      showOverflow: true,
    },
    {
      field: 'description',
      title: '工具描述',
      width: 200,
      showOverflow: true,
    },
    {
      field: 'icon',
      title: '图标',
      width: 80,
      slots: {
        default: ({ row }) => {
          if (row.icon) {
            return h('div', {
              class: 'flex items-center justify-center',
              style: {
                width: '32px',
                height: '32px',
                backgroundColor: row.icon_bg || '#f0f0f0',
                color: row.icon_color || '#333',
                borderRadius: '4px',
              },
            }, row.icon);
          }
          return '-';
        },
      },
    },
    {
      field: 'category',
      title: '组学分类',
      width: 120,
      slots: {
        default: ({ row }) => {
          return row.category ? h(Tag, { color: 'blue' }, () => row.category) : '-';
        },
      },
    },
    {
      field: 'type',
      title: '功能分类',
      width: 120,
      slots: {
        default: ({ row }) => {
          return row.type ? h(Tag, { color: 'green' }, () => row.type) : '-';
        },
      },
    },
    {
      field: 'views',
      title: '浏览量',
      width: 80,
      align: 'center',
    },
    {
      field: 'likes',
      title: '点赞数',
      width: 80,
      align: 'center',
    },
    {
      field: 'is_favorite',
      title: '是否收藏',
      width: 100,
      align: 'center',
      slots: {
        default: ({ row }) => {
          return h(Tag, { 
            color: row.is_favorite ? 'red' : 'default' 
          }, () => row.is_favorite ? '是' : '否');
        },
      },
    },
    {
      field: 'created_time',
      title: '创建时间',
      width: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'updated_time',
      title: '更新时间',
      width: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'operation',
      title: '操作',
      fixed: 'right',
      slots: {
        default: ({ row }) => {
          return h(Space, { size: 'small' }, () => [
            h(Button, {
              type: 'link',
              size: 'small',
              onClick: () => actions.onEdit(row),
            }, () => '编辑'),
            h(Popconfirm, {
              title: '确定要删除这个工具吗？',
              onConfirm: () => actions.onDelete(row),
            }, {
              default: () => h(Button, {
                type: 'link',
                size: 'small',
                danger: true,
              }, () => '删除'),
            }),
          ]);
        },
      },
    },
  ];
}

// 新增表单配置
export function useAddSchema(categoryOptions: any, typeOptions: any): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入工具名称',
      },
      fieldName: 'name',
      label: '工具名称',
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入工具描述',
        rows: 3,
      },
      fieldName: 'description',
      label: '工具描述',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入图标名称',
      },
      fieldName: 'icon',
      label: '图标名称',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入图标背景色',
        type: 'color',
      },
      fieldName: 'icon_bg',
      label: '图标背景色',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入图标颜色',
        type: 'color',
      },
      fieldName: 'icon_color',
      label: '图标颜色',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择组学分类',
        allowClear: true,
        options: categoryOptions?.map((item: string) => ({ label: item, value: item })) || [],
      },
      fieldName: 'category',
      label: '组学分类',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择功能分类',
        allowClear: true,
        options: typeOptions?.map((item: string) => ({ label: item, value: item })) || [],
      },
      fieldName: 'type',
      label: '功能分类',
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入浏览量',
        min: 0,
      },
      fieldName: 'views',
      label: '浏览量',
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入点赞数',
        min: 0,
      },
      fieldName: 'likes',
      label: '点赞数',
    },
    {
      component: 'Switch',
      componentProps: {
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      fieldName: 'is_favorite',
      label: '是否收藏',
    },
  ];
}

// 编辑表单配置（与新增相同）
export function useEditSchema(categoryOptions: any, typeOptions: any): VbenFormSchema[] {
  return useAddSchema(categoryOptions, typeOptions);
}