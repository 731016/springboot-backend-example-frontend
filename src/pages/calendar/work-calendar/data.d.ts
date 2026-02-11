export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 工作日历实体
 */
export interface WorkCalendar {
  id?: number;
  workDate?: string; // ISO 字符串
  shiftCode?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  status?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 分页
 */
export interface Page<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

/**
 * 查询请求
 */
export interface WorkCalendarQueryRequest {
  current?: number;
  pageSize?: number;
  workDate?: string;
  shiftCode?: string;
  shiftName?: string;
  status?: number;
  sortField?: string;
  sortOrder?: string;
}

/**
 * 保存请求
 */
export interface WorkCalendarSaveRequest {
  id?: number;
  workDate: string;
  shiftCode: string;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: number;
  remark?: string;
}
