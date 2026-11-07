import { request } from '@umijs/max';

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 事件队列监控状态，对应后端 EventQueueStatusVO
 */
export interface EventQueueStatus {
  /** 队列中待处理事件数量 */
  queueSize: number;
  /** 当前工作线程数 */
  curWorkerNum: number;
  /** 最大工作线程数 */
  maxWorkers: number;
  /** 是否启用（允许投递） */
  enable: boolean;
}

/**
 * 投递到队列的事件，对应后端 RequestData
 */
export interface RequestData {
  data?: any;
  type?: string;
}

/**
 * 获取队列监控状态
 * GET /api/event/status
 */
export async function getEventQueueStatus() {
  return request<ApiResponse<EventQueueStatus>>('/api/event/status', {
    method: 'GET',
  });
}

/**
 * 手动投递事件到队列
 * POST /api/event/receive
 */
export async function receiveEvent(data: RequestData) {
  return request<ApiResponse<string>>('/api/event/receive', {
    method: 'POST',
    data,
  });
}
