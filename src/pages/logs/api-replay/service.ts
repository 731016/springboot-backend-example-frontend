// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  ApiRequestRecord,
  ApiRequestRecordQueryRequest,
  Page,
} from './data';

/**
 * 分页查询已执行接口记录
 */
export async function listApiRequestRecordByPage(
  params: ApiRequestRecordQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<Page<ApiRequestRecord>>>('/api/replay/records/page', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

/**
 * 重放接口
 */
export async function replayApiRequest(recordId: number, options?: Record<string, any>) {
  return request<ApiResponse<any>>('/api/replay/execute', {
    method: 'POST',
    params: { recordId },
    ...(options || {}),
  });
}
