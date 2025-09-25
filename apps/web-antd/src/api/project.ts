import type { PaginationResult } from '#/types';

import { requestClient } from './request';

export interface ProjectInfoResult {
  id: number;
  pid: string;
  pname: string;
  ptype: string;
  custmor_name: string;
  custmor_address: string;
  created_time: string;
  updated_time?: string;
}

export interface ProjectInfoParams {
  pid: string;
  pname: string;
  ptype: string;
  custmor_name: string;
  custmor_address: string;
}

export interface ProjectInfoQueryParams {
  pid?: string;
  pname?: string;
  ptype?: string;
  custmor_name?: string;
  page?: number;
  size?: number;
}

/**
 * 分页获取所有项目信息
 */
export async function getProjectInfoListApi(params?: ProjectInfoQueryParams) {
  return requestClient.get<PaginationResult<ProjectInfoResult>>(
    '/api/v1/project/',
    {
      params,
    },
  );
}

/**
 * 获取项目信息详情
 */
export async function getProjectInfoDetailApi(pk: number) {
  return requestClient.get<ProjectInfoResult>(`/api/v1/project/${pk}`);
}

/**
 * 创建项目信息
 */
export async function createProjectInfoApi(data: ProjectInfoParams) {
  return requestClient.post('/api/v1/project/', data);
}

/**
 * 更新项目信息
 */
export async function updateProjectInfoApi(
  pk: number,
  data: ProjectInfoParams,
) {
  return requestClient.put(`/api/v1/project/${pk}`, data);
}

/**
 * 删除项目信息
 */
export async function deleteProjectInfoApi(pks: number[]) {
  return requestClient.delete('/api/v1/project/', { data: { pks } });
}
