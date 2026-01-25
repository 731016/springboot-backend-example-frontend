// src/pages/admin/api-log-search/data.d.ts

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * API 日志 ES 信息实体
 */
export interface ApiLogEs {
  id: number;
  requestId: string;
  url: string;
  httpMethod: string;
  ip: string;
  classMethod: string;
  requestParams?: string;
  responseData?: string;
  timeConsumed: number;
  userId?: string;
  createTime: string;
  updateTime: string;
  // 高亮字段
  highlightUrl?: string;
  highlightClassMethod?: string;
  highlightRequestParams?: string;
  highlightResponseData?: string;
}

/**
 * API 日志 ES 查询参数
 */
export interface ApiLogEsQueryRequest {
  current?: number;
  pageSize?: number;
  searchText?: string;
  requestId?: string;
  httpMethod?: string;
  ip?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
  minTimeConsumed?: number;
  maxTimeConsumed?: number;
}
