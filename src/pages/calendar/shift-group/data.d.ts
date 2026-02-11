export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 班次班组基础实体
 */
export interface ShiftGroup {
  id?: number;
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
export interface ShiftGroupQueryRequest {
  current?: number;
  pageSize?: number;
  shiftCode?: string;
  shiftName?: string;
  status?: number;
  sortField?: string;
  sortOrder?: string;
}

/**
 * 保存请求
 */
export interface ShiftGroupSaveRequest {
  id?: number;
  shiftCode: string;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: number;
  remark?: string;
}

