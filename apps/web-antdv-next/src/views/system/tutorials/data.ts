import type { TutorialCategory } from '#/api';

export const tutorialStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已下线', value: 2 },
];

export function getTutorialStatusLabel(status?: null | number) {
  return (
    tutorialStatusOptions.find((option) => option.value === status)?.label ||
    '未知'
  );
}

export function getTutorialStatusColor(status?: null | number) {
  if (status === 1) return 'green';
  if (status === 2) return 'orange';
  return 'default';
}

export function getTutorialCategoryName(
  categories: TutorialCategory[],
  categoryId?: null | number,
) {
  if (!categoryId) return '-';
  return (
    categories.find((category) => category.id === categoryId)?.name || '未分类'
  );
}

export function toCategoryOptions(categories: TutorialCategory[]) {
  return categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));
}
