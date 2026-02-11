// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  WorkCalendar,
  WorkCalendarQueryRequest,
  WorkCalendarSaveRequest,
  Page,
} from './data';

/**
 * 保存（新增 / 修改）工作日历
 * POST /kafka/workCalendar/save
 */
export async function saveWorkCalendar(
  data: WorkCalendarSaveRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<number>>('/api/kafka/workCalendar/save', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 删除工作日历
 * POST /kafka/workCalendar/delete/{id}
 */
export async function deleteWorkCalendar(id: number, options?: Record<string, any>) {
  return request<ApiResponse<boolean>>(`/api/kafka/workCalendar/delete/${id}`, {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 分页查询
 * POST /kafka/workCalendar/list/page
 */
export async function listWorkCalendarByPage(
  params: WorkCalendarQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<Page<WorkCalendar>>>('/api/kafka/workCalendar/list/page', {
    method: 'POST',
    data: params,
    ...(options || {}),
  });
}

/**
 * 根据 ID 获取
 * GET /kafka/workCalendar/get/{id}
 */
export async function getWorkCalendarById(id: number, options?: Record<string, any>) {
  return request<ApiResponse<WorkCalendar>>(`/api/kafka/workCalendar/get/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}
