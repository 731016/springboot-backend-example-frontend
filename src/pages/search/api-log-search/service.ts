// src/pages/admin/api-log-search/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse, ApiLogEs, ApiLogEsQueryRequest } from './data';

/**
 * 搜索 API 日志（ES）
 * POST /es/api-log/search
 */
export async function searchApiLog(
  params: ApiLogEsQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<ApiLogEs[]>>('/api/es/api-log/search', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}
