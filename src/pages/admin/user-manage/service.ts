// src/pages/admin/user-manage/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  User,
  UserAddRequest,
  UserQueryRequest,
  UserUpdateRequest,
  DeleteRequest,
} from './data';

/**
 * 分页获取用户列表
 * POST /user/list/page
 */
export async function listUserByPage(
  params: UserQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<Page<User>>>('/api/user/list/page', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

/**
 * 创建用户
 * POST /user/add
 */
export async function addUser(
  data: UserAddRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<number>>('/api/user/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 更新用户
 * POST /user/update
 */
export async function updateUser(
  data: UserUpdateRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>('/api/user/update', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 删除用户
 * POST /user/delete
 */
export async function deleteUser(
  data: DeleteRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>('/api/user/delete', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 根据 ID 获取用户
 * GET /user/get
 */
export async function getUserById(
  params: { id: number },
  options?: Record<string, any>,
) {
  return request<ApiResponse<User>>('/api/user/get', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/**
 * 同步用户到 ES
 * POST /es/user/sync
 */
export async function syncUserToEs(
  data: User,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>('/api/es/user/sync', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

// 分页返回结构
export interface Page<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}
