import { requestClient } from '#/api/request';

export interface AnalysisTool {
    id: number;
    title: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    omics_category: string;
    func_category: string | null;
    views: number;
    stars: number;
    status: number;
    sort: number;
    created_time: string;
    updated_time: string | null;
}

export interface AnalysisToolListResponse {
    items: AnalysisTool[];
    total: number;
}

export interface AnalysisToolListParams {
    search?: string;
    omics?: string;
    func?: string[];
    page?: number;
    size?: number;
}

/**
 * 获取分析工具列表
 */
export async function getAnalysisToolList(params?: AnalysisToolListParams) {
    // 需要手动序列化 func 数组参数，FastAPI 期望 func=a&func=b 格式
    const searchParams = new URLSearchParams();

    if (params?.page) {
        searchParams.append('page', String(params.page));
    }
    if (params?.size) {
        searchParams.append('size', String(params.size));
    }
    if (params?.search) {
        searchParams.append('search', params.search);
    }
    if (params?.omics) {
        searchParams.append('omics', params.omics);
    }
    if (params?.func && params.func.length > 0) {
        params.func.forEach(f => searchParams.append('func', f));
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/api/v1/sys/analysis-tools?${queryString}` : '/api/v1/sys/analysis-tools';

    return requestClient.get<AnalysisToolListResponse>(url);
}

/**
 * 获取分析工具详情
 */
export async function getAnalysisTool(id: number) {
    return requestClient.get<AnalysisTool>(`/api/v1/sys/analysis-tools/${id}`);
}

export interface AnalysisToolCategories {
    omics: string[];
    func: string[];
}

/**
 * 获取分析工具分类列表
 */
export async function getAnalysisToolCategories() {
    return requestClient.get<AnalysisToolCategories>('/api/v1/sys/analysis-tools/categories');
}
