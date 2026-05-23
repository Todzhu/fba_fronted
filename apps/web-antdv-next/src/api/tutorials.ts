import { requestClient } from '#/api/request';

export interface TutorialPage<T> {
  items: T[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

export interface TutorialCategory {
  id: number;
  name: string;
  slug: string;
  description?: null | string;
  sort: number;
  is_active: boolean;
}

export interface TutorialArticleListItem {
  id: number;
  title: string;
  slug: string;
  summary?: null | string;
  cover_url?: null | string;
  category_id?: null | number;
  tags?: null | string[];
  status: number;
  sort: number;
  view_count: number;
  published_at?: null | string;
  created_time?: null | string;
  updated_time?: null | string;
}

export interface TutorialArticleDetail extends TutorialArticleListItem {
  content_markdown: string;
  attachment_urls?: null | string[];
}

export interface TutorialArticleQuery {
  category_id?: number;
  page?: number;
  search?: string;
  size?: number;
  status?: number;
  tag?: string;
}

export interface TutorialArticlePayload {
  title: string;
  slug: string;
  summary?: null | string;
  cover_url?: null | string;
  category_id?: null | number;
  tags?: null | string[];
  content_markdown: string;
  attachment_urls?: null | string[];
  status: number;
  sort?: number;
  published_at?: null | string;
}

export type TutorialArticleUpdatePayload = Partial<TutorialArticlePayload>;

function withOptionalParams<T, P extends object = object>(
  url: string,
  params?: P,
) {
  return params && Object.keys(params).length > 0
    ? requestClient.get<T>(url, { params })
    : requestClient.get<T>(url);
}

export function getTutorialCategories() {
  return requestClient.get<TutorialCategory[]>('/api/v1/tutorials/categories');
}

export function getTutorialArticles(params: TutorialArticleQuery = {}) {
  return withOptionalParams<TutorialPage<TutorialArticleListItem>>(
    '/api/v1/tutorials/articles',
    params,
  );
}

export function getTutorialArticle(slug: string) {
  return requestClient.get<TutorialArticleDetail>(
    `/api/v1/tutorials/articles/${slug}`,
  );
}

export function increaseTutorialView(id: number) {
  return requestClient.post(`/api/v1/tutorials/articles/${id}/view`);
}

export function getAdminTutorialCategories(
  params: { is_active?: boolean; search?: string } = {},
) {
  return withOptionalParams<TutorialCategory[]>(
    '/api/v1/sys/tutorials/categories',
    params,
  );
}

export function getAdminTutorialCategory(id: number) {
  return requestClient.get<TutorialCategory>(
    `/api/v1/sys/tutorials/categories/${id}`,
  );
}

export function createAdminTutorialCategory(
  data: Omit<TutorialCategory, 'id'>,
) {
  return requestClient.post('/api/v1/sys/tutorials/categories', data);
}

export function updateAdminTutorialCategory(
  id: number,
  data: Partial<Omit<TutorialCategory, 'id'>>,
) {
  return requestClient.put(`/api/v1/sys/tutorials/categories/${id}`, data);
}

export function deleteAdminTutorialCategory(id: number) {
  return requestClient.delete(`/api/v1/sys/tutorials/categories/${id}`);
}

export function getAdminTutorialArticles(params: TutorialArticleQuery = {}) {
  return withOptionalParams<TutorialPage<TutorialArticleListItem>>(
    '/api/v1/sys/tutorials/articles',
    params,
  );
}

export function getAdminTutorialArticle(id: number) {
  return requestClient.get<TutorialArticleDetail>(
    `/api/v1/sys/tutorials/articles/${id}`,
  );
}

export function createAdminTutorialArticle(data: TutorialArticlePayload) {
  return requestClient.post('/api/v1/sys/tutorials/articles', data);
}

export function updateAdminTutorialArticle(
  id: number,
  data: TutorialArticleUpdatePayload,
) {
  return requestClient.put(`/api/v1/sys/tutorials/articles/${id}`, data);
}

export function publishAdminTutorialArticle(id: number) {
  return requestClient.put(`/api/v1/sys/tutorials/articles/${id}/publish`);
}

export function deleteAdminTutorialArticle(id: number) {
  return requestClient.delete(`/api/v1/sys/tutorials/articles/${id}`);
}

export function uploadTutorialFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<{ url: string }>(
    '/api/v1/sys/tutorials/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}
