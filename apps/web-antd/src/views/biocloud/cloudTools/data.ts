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
      field: 'image_url',
      title: '工具图片',
      width: 100,
      slots: {
        default: ({ row }) => {
          if (row.image_url) {
            return h('img', {
              src: row.image_url,
              alt: row.name || '工具图片',
              style: {
                width: '40px',
                height: '40px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              },
              onError: (e) => {
                e.target.src = '/images/tools/default-tool.svg';
              },
            });
          }
          return h('div', {
            class: 'flex items-center justify-center',
            style: {
              width: '40px',
              height: '40px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            },
          }, h('span', { style: { fontSize: '12px', color: '#6b7280' } }, '无图片'));
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
export function useAddSchema(): VbenFormSchema[] {
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
      component: 'Upload',
      componentProps: {
        action: '/api/upload/image',
        listType: 'picture-card',
        maxCount: 1,
        accept: 'image/*',
        beforeUpload: (file: File) => {
          const isImage = file.type.startsWith('image/');
          const isLt2M = file.size / 1024 / 1024 < 2;
          if (!isImage) {
            console.error('只能上传图片文件!');
            return false;
          }
          if (!isLt2M) {
            console.error('图片大小不能超过 2MB!');
            return false;
          }
          return true;
        },
        onChange: (info: any) => {
          if (info.file.status === 'done') {
            // 上传成功后设置图片URL
            const imageUrl = info.file.response?.data?.url;
            if (imageUrl) {
              // 这里需要通过表单实例设置值
              console.log('上传成功，图片URL:', imageUrl);
            }
          }
        },
      },
      fieldName: 'image_url',
      label: '工具图片',
      help: '支持 JPG、PNG、WebP 格式，建议尺寸 100x100px，文件大小不超过 2MB',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入组学分类',
      },
      fieldName: 'category',
      label: '组学分类',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入功能分类',
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

export function useEditSchema(categoryOptions: any, typeOptions: any): VbenFormSchema[] {
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
      component: 'Upload',
      componentProps: {
        action: '/api/upload/image',
        listType: 'picture-card',
        maxCount: 1,
        accept: 'image/*',
        beforeUpload: (file: File) => {
          const isImage = file.type.startsWith('image/');
          const isLt2M = file.size / 1024 / 1024 < 2;
          if (!isImage) {
            console.error('只能上传图片文件!');
            return false;
          }
          if (!isLt2M) {
            console.error('图片大小不能超过 2MB!');
            return false;
          }
          return true;
        },
        onChange: (info: any) => {
          if (info.file.status === 'done') {
            const imageUrl = info.file.response?.data?.url;
            if (imageUrl) {
              console.log('上传成功，图片URL:', imageUrl);
            }
          }
        },
      },
      fieldName: 'image_url',
      label: '工具图片',
      help: '支持 JPG、PNG、WebP 格式，建议尺寸 100x100px，文件大小不超过 2MB',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择组学分类',
        allowClear: true,
        options:
          categoryOptions?.map((item: string) => ({ label: item, value: item })) ||
          [],
      },
      fieldName: 'category',
      label: '组学分类',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择功能分类',
        allowClear: true,
        options:
          typeOptions?.map((item: string) => ({ label: item, value: item })) || [],
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
