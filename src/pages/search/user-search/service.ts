// src/pages/admin/user-search/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse, UserEs, UserEsQueryRequest } from './data';

/**
 * 搜索用户（ES）
 * 注意：后端接口使用 GET 但接收 RequestBody，这里使用 POST 以确保兼容性
 * POST /es/user/search
 */
export async function searchUser(
  params: UserEsQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<UserEs[]>>('/api/es/user/search', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}
