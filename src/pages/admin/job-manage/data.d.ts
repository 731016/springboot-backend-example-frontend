// src/pages/job-manage/data.d.ts

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 定时任务实体
 */
export interface JobAndTrigger {
  id?: number;
  jobName?: string;
  jobGroup?: string;
  jobClassName?: string;
  triggerName?: string;
  triggerGroup?: string;
  repeatInterval?: number;
  timesTriggered?: number;
  cronExpression?: string;
  timeZoneId?: string;
  triggerState?: string;
}

/**
 * 定时任务表单
 */
export interface JobForm {
  jobClassName: string;
  jobGroupName: string;
  cronExpression: string;
}

/**
 * 查询任务参数
 */
export interface QueryJob {
  jobClassName: string;
  jobGroupName: string;
  cronExpression?: string;
}

/**
 * 任务列表查询参数
 */
export interface JobListQuery {
  currentPage?: number;
  pageSize?: number;
}
