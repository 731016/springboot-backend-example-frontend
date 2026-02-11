import { request } from '@umijs/max';
import type {
  ApiResponse,
  Page,
  ShiftGroup,
  ShiftGroupQueryRequest,
  ShiftGroupSaveRequest,
} from './data';

/**
 * 分页查询班次
 */
export async function listShiftGroupByPage(
  params: ShiftGroupQueryRequest,
): Promise<ApiResponse<Page<ShiftGroup>>> {
  return request('/api/kafka/shiftGroup/list/page', {
    method: 'POST',
    data: params,
  });
}

/**
 * 保存班次
 */
export async function saveShiftGroup(
  data: ShiftGroupSaveRequest,
): Promise<ApiResponse<number>> {
  return request('/api/kafka/shiftGroup/save', {
    method: 'POST',
    data,
  });
}

/**
 * 删除班次
 */
export async function deleteShiftGroup(id: number): Promise<ApiResponse<boolean>> {
  return request(`/api/kafka/shiftGroup/delete/${id}`, {
    method: 'POST',
  });
}

/**
 * 根据 ID 获取详情（如后面有需要）
 */
export async function getShiftGroupById(
  id: number,
): Promise<ApiResponse<ShiftGroup>> {
  return request(`/api/kafka/shiftGroup/get/${id}`, {
    method: 'GET',
  });
}

