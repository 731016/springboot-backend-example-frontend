// src/pages/admin/kafka-point-manage/data.d.ts

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 采集点配置
 * 注意：字段需和后端 PointConfig / AddPointConfigRequest 对齐
 */
export interface PointConfig {
  id?: number;
  pointCode: string;
  pointName: string;
  validUrl?: string;
  dataUrl: string;
  minLimit?: number;
  maxLimit?: number;
  intervalSeconds: number;
  isMainPoint?: number;
  status?: number;
  runningStatus?: number;
  createTime?: string;
  updateTime?: string;
}

/**
 * 新增采集点请求
 */
export interface AddPointConfigRequest {
  pointCode: string;
  pointName: string;
  validUrl?: string;
  dataUrl: string;
  minLimit?: number;
  maxLimit?: number;
  intervalSeconds: number;
  isMainPoint?: number;
  status?: number;
}

/**
 * 采集点配置查询请求
 */
export interface PointConfigQueryRequest {
  current?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
  pointCode?: string;
  pointName?: string;
  intervalSeconds?: number;
  isMainPoint?: number;
  status?: number;
}

/**
 * 分页返回结构
 */
export interface Page<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

/**
 * 采集任务状态
 */
export interface TaskStatusVO {
  pointCode?: string;
  running: boolean;
  lastCollectTime?: string;
  nextCollectTime?: string;
  message?: string;
}

/**
 * 查询采集任务
 * 用于 DataController 的接口
 */
export interface QueryCollectTask {
  pointCode: string;
  collectTime: string; // ISO 字符串，在前端用 moment/dayjs 处理
}

/**
 * 采集到的数据
 */
export interface CollectedData {
  pointCode: string;
  collectTime: string;
  value?: number;
}

/**
 * 采集数据明细
 */
export interface DataDetail {
  id?: number;
  pointCode: string;
  collectTime?: string;
  value?: number;
  attributeName?: string;
  statisticsId?: number;
  createTime?: string;
}

/**
 * 统计数据
 */
export interface DataStatistics {
  id?: number;
  pointCode: string;
  startTime?: string;
  endTime?: string;
  maximumValue?: number;
  minimumValue?: number;
  averageValue?: number;
  status?: number;
  createTime?: string;
  updateTime?: string;
}
