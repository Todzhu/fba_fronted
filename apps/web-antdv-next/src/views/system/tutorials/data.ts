import type { TutorialCategory } from '#/api';

export const tutorialStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
];

export function normalizeArticleStatus(status?: null | number) {
  return status === 1 ? 1 : 0;
}

export function getTutorialStatusLabel(status?: null | number) {
  const normalizedStatus = normalizeArticleStatus(status);
  return (
    tutorialStatusOptions.find((option) => option.value === normalizedStatus)
      ?.label || '未知'
  );
}

export function getTutorialStatusColor(status?: null | number) {
  if (normalizeArticleStatus(status) === 1) return 'green';
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
