export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** 事件队列监控状态 */
export interface EventQueueStatusVO {
  queueSize: number;
  curWorkerNum: number;
  maxWorkers: number;
  enable: boolean;
}

/** 手动投递请求体 */
export interface EventReceiveRequest {
  type: string;
  data?: any;
}
