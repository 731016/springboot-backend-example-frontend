export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface Page<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

/** 接口请求记录（已执行接口） */
export interface ApiRequestRecord {
  id?: number;
  url?: string;
  httpMethod?: string;
  headers?: string;
  requestParams?: string;
  contentType?: string;
  isArrayRequest?: boolean;
  responseData?: string;
  status?: number;
  timeConsumed?: number;
  userId?: string;
  createTime?: string;
  updateTime?: string;
}

/** 分页查询请求 */
export interface ApiRequestRecordQueryRequest {
  current?: number;
  pageSize?: number;
  url?: string;
  httpMethod?: string;
}
