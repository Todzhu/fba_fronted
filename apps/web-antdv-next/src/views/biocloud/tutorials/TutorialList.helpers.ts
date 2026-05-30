import type { TutorialArticleListItem } from '#/api/tutorials';

export interface TutorialYearGroup {
  articles: TutorialArticleListItem[];
  year: string;
}

function getArticleYear(article: Pick<TutorialArticleListItem, 'created_time' | 'published_at'>) {
  const value = article.published_at || article.created_time || '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '最近' : String(date.getFullYear());
}

export function groupArticlesByYear(
  articles: TutorialArticleListItem[],
): TutorialYearGroup[] {
  const groups = new Map<string, TutorialArticleListItem[]>();
  for (const article of articles) {
    const year = getArticleYear(article);
    groups.set(year, [...(groups.get(year) ?? []), article]);
  }

  return [...groups.entries()].map(([year, groupedArticles]) => ({
    articles: groupedArticles,
    year,
  }));
}

export function estimateReadingMinutes(title?: null | string, summary?: null | string) {
  const length = `${title ?? ''}${summary ?? ''}`.replace(/\s+/g, '').length;
  return Math.max(3, Math.ceil(length / 900));
}
