import { requestClient } from '#/api/request';

export interface CreateReportJobData {
  project_type: 'metabolism' | 'proteomics' | 'ptm' | 'rnaseq';
  project_name: string;
  project_id: string;
  client_org: string;
  client_name: string;
  remark?: string;
  case_name: string;
  n_case: number;
  control_name: string;
  n_control: number;
}

export interface ReportJobItem {
  id: number;
  user_id?: number;
  project_type: string;
  project_name: string;
  project_id: string;
  client_org: string;
  client_name: string;
  remark?: null | string;
  case_name: string;
  n_case: number;
  control_name: string;
  n_control: number;
  status: 'completed' | 'failed' | 'pending' | 'running';
  output_dir: string;
  report_html_path?: null | string;
  error_message?: null | string;
  task_id?: null | string;
  created_time: string;
  updated_time?: null | string;
  completed_at?: null | string;
  report_url?: null | string;
}

export interface ReportJobListResponse {
  items: ReportJobItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReportJobListParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export async function createReportJobApi(data: CreateReportJobData) {
  return requestClient.post<{ id: number; status: string }>('/api/v1/sys/reporting/jobs', data);
}

export async function listReportJobsApi(params?: ReportJobListParams) {
  return requestClient.get<ReportJobListResponse>('/api/v1/sys/reporting/jobs', { params });
}

export async function getReportJobApi(id: number | string) {
  return requestClient.get<ReportJobItem>(`/api/v1/sys/reporting/jobs/${id}`);
}

export async function deleteReportJobApi(id: number | string) {
  return requestClient.delete(`/api/v1/sys/reporting/jobs/${id}`);
}

export async function retryReportJobApi(id: number | string) {
  return requestClient.post<{ id: number; status: string }>(`/api/v1/sys/reporting/jobs/${id}/retry`);
}

export async function getReportHtmlApi(id: number | string, filePath = 'report.html') {
  return requestClient.get<string>(getReportFileUrl(id, filePath), {
    responseReturn: 'body',
    responseType: 'text',
  });
}

export async function downloadReportPdfApi(id: number | string) {
  return requestClient.download<Blob>(getReportPdfUrl(id));
}

export function getReportFileUrl(id: number | string, filePath = 'report.html') {
  const normalized = filePath.replace(/^\/+/, '');
  return `/api/v1/sys/reporting/jobs/${id}/report/${normalized}`;
}

export function getReportPdfUrl(id: number | string) {
  return `/api/v1/sys/reporting/jobs/${id}/report.pdf`;
}
