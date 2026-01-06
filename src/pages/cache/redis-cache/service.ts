// src/pages/cache/redis-cache/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  CodeDictionary,
  CodeDictionaryCreateParams,
  CodeDictionaryKeyQuery,
  CodeDictionaryListParams,
} from './data';

/**
 * 加载 Redis 缓存
 * POST /cache/loadCache
 */
export async function loadCache(options?: Record<string, any>) {
  return request<ApiResponse<string>>('/api/cache/loadCache', {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 清空 Redis 缓存
 * POST /cache/clearCache
 */
export async function clearCache(options?: Record<string, any>) {
  return request<ApiResponse<string>>('/api/cache/clearCache', {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 根据 type 查询某一类字典列表
 * POST /cache/getByType
 *
 * 当前后端实现中 type 是写死为 "USER" 的，
 * 这里依然按通用接口来封装，方便后端后续扩展。
 */
export async function queryByType(
  params: CodeDictionaryListParams,
  options?: Record<string, any>,
) {
  return request<ApiResponse<CodeDictionary[]>>('/api/cache/getByType', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

/**
 * 根据 type + code 查询单条数据
 * POST /cache/getByAndTypeCode
 *
 * 说明：当前后端实现中参数同样是写死在 service 里，
 * 这里按通用结构封装，便于后续后端改造。
 */
export async function queryByTypeAndCode(
  params: CodeDictionaryKeyQuery,
  options?: Record<string, any>,
) {
  return request<ApiResponse<CodeDictionary>>('/api/cache/getByAndTypeCode', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

/**
 * 新增单条字典数据
 * POST /cache/addCodeDictionary
 */
export async function addCodeDictionary(
  data: CodeDictionaryCreateParams,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/cache/addCodeDictionary', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 批量新增字典数据（如果页面后续需要批量导入，可使用）
 * POST /cache/addCodeDictionaryList
 */
export async function addCodeDictionaryList(
  data: CodeDictionaryCreateParams[],
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/cache/addCodeDictionaryList', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
