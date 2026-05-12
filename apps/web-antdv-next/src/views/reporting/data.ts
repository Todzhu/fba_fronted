import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeGridProps } from '#/adapter/vxe-table';
import type { ReportJobItem } from '#/api/reporting';

import { $t } from '@vben/locales';

const statusOptions = [
  { color: 'default', label: '等待中', value: 'pending' },
  { color: 'processing', label: '生成中', value: 'running' },
  { color: 'success', label: '已完成', value: 'completed' },
  { color: 'error', label: '失败', value: 'failed' },
];

const projectTypeLabelMap: Record<string, string> = {
  metabolism: '代谢组学',
  proteomics: '蛋白组学',
  ptm: '修饰组学',
  rnaseq: '转录组学',
};

export const querySchema: VbenFormSchema[] = [
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      options: statusOptions.map(({ label, value }) => ({ label, value })),
      placeholder: '请选择',
    },
    fieldName: 'status',
    label: '任务状态',
  },
];

export function useColumns(
  onActionClick?: OnActionClickFn<ReportJobItem>,
): VxeGridProps['columns'] {
  return [
    {
      field: 'seq',
      title: $t('common.table.id'),
      type: 'seq',
      width: 60,
    },
    {
      field: 'project_name',
      title: '项目名称',
      align: 'left',
      minWidth: 180,
    },
    {
      field: 'project_id',
      title: '项目编号',
      align: 'left',
      minWidth: 180,
    },
    {
      field: 'project_type',
      title: '项目类型',
      minWidth: 110,
      formatter({ cellValue }) {
        return projectTypeLabelMap[cellValue] || cellValue;
      },
    },
    {
      field: 'grouping',
      title: '分组',
      minWidth: 180,
      formatter({ row }) {
        return `${row.case_name}(${row.n_case}) vs ${row.control_name}(${row.n_control})`;
      },
    },
    {
      field: 'status',
      title: '状态',
      width: 110,
      cellRender: {
        name: 'CellTag',
        options: statusOptions,
      },
    },
    {
      field: 'created_time',
      title: '创建时间',
      minWidth: 190,
    },
    {
      field: 'completed_at',
      title: '完成时间',
      minWidth: 190,
      formatter({ cellValue }) {
        return cellValue || '-';
      },
    },
    {
      field: 'operation',
      title: $t('common.table.operation'),
      align: 'center',
      fixed: 'right',
      width: 160,
      cellRender: {
        attrs: {
          nameField: 'project_name',
          nameTitle: '报告任务',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'view',
            show: (row: ReportJobItem) => row.status === 'completed',
            text: '查看报告',
          },
          {
            code: 'delete',
            text: '删除',
          },
        ],
      },
    },
  ];
}
