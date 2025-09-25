import type { VbenFormSchema } from '@vben/common-ui';
import type { VxeGridPropTypes } from '@vben/vxe-table';

import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ProjectInfoResult } from '#/api/project';

import { $t } from '@vben/locales';

// 动态表单字段定义函数
export function getFormSchema(isEdit: boolean = false): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目编号',
        disabled: isEdit,
      },
      fieldName: 'pid',
      label: '项目编号',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目名称',
      },
      fieldName: 'pname',
      label: '项目名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'Xenium', value: 'Xenium' },
          { label: 'VisiumHD', value: 'VisiumHD' }
        ],
        placeholder: '请选择项目类型',
      },
      fieldName: 'ptype',
      label: '项目类型',
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入客户姓名',
      },
      fieldName: 'custmor_name',
      label: '客户姓名',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入客户单位',
      },
      fieldName: 'custmor_address',
      label: '客户单位',
      rules: 'required',
    },
  ];
}

// 查询表单字段定义
export const querySchema: VbenFormSchema[] = [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入项目编号',
    },
    fieldName: 'pid',
    label: '项目编号',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入项目名称',
    },
    fieldName: 'pname',
    label: '项目名称',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: 'Xenium', value: 'Xenium' },
        { label: 'VisiumHD', value: 'VisiumHD' }
      ],
      placeholder: '请选择项目类型',
    },
    fieldName: 'ptype',
    label: '项目类型',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入客户姓名',
    },
    fieldName: 'custmor_name',
    label: '客户姓名',
  },
];

// 动态列配置函数
export function useColumns(
  onActionClick?: OnActionClickFn<ProjectInfoResult>,
): VxeGridPropTypes.Columns {
  return [
    {
      type: 'checkbox',
      width: 50,
      visible: false,
    },
    {
      field: 'id',
      title: 'ID',
      width: 80,
      visible: false,
    },
    {
      field: 'pid',
      title: '项目编号',
      width: 150,
    },
    {
      field: 'pname',
      title: '项目名称',
      width: 200,
    },
    {
      field: 'ptype',
      title: '项目类型',
      width: 120,
    },
    {
      field: 'custmor_name',
      title: '客户姓名',
      width: 150,
    },
    {
      field: 'custmor_address',
      title: '客户单位',
      width: 200,
    },
    {
      field: 'created_time',
      title: '创建时间',
      width: 180,
      formatter: ({ cellValue }) => {
        if (!cellValue) return '';
        return new Date(cellValue).toLocaleString('zh-CN');
      },
    },
    {
      field: 'updated_time',
      title: '更新时间',
      width: 180,
      formatter: ({ cellValue }) => {
        if (!cellValue) return '';
        return new Date(cellValue).toLocaleString('zh-CN');
      },
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      resizable: false,
      cellRender: {
        attrs: {
          nameField: 'pid',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
    },
  ];
}
