import { request } from '@umijs/max';
import type { ApiResponse, EventQueueStatusVO, EventReceiveRequest } from './data';

const EVENT_BASE = '/api/event';

/**
 * 获取事件队列监控状态
 */
export async function getEventQueueStatus() {
  return request<ApiResponse<EventQueueStatusVO>>(`${EVENT_BASE}/status`, {
    method: 'GET',
  });
}

/**
 * 手动投递事件到队列
 */
export async function receiveEvent(data: EventReceiveRequest) {
  return request<ApiResponse<string>>(`${EVENT_BASE}/receive`, {
    method: 'POST',
    data,
  });
}
