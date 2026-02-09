// src/pages/job-manage/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  JobForm,
  QueryJob,
  JobAndTrigger,
  JobListQuery,
} from './data';

/**
 * 添加定时任务
 * POST /job/addJob
 */
export async function addJob(
  data: JobForm,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/job/addJob', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 删除定时任务
 * DELETE /job/deleteJob
 */
export async function deleteJob(
  data: JobForm,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/job/deleteJob', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 暂停定时任务
 * POST /job/pause
 */
export async function pauseJob(
  data: JobForm,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/job/pause', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 恢复定时任务
 * POST /job/resume
 */
export async function resumeJob(
  data: JobForm,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/job/resume', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 修改定时任务cron表达式
 * POST /job/cron
 */
export async function updateCronJob(
  data: JobForm,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/job/cron', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 获取任务列表
 * GET /job/jobList
 */
export async function getJobList(
  params: JobListQuery,
  options?: Record<string, any>,
) {
  return request<ApiResponse<JobAndTrigger[]>>('/api/job/jobList', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/**
 * 查询任务下次执行时间
 * POST /job/queryJobNextFireTimes
 */
export async function queryJobNextFireTimes(
  data: QueryJob,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string[]>>('/api/job/queryJobNextFireTimes', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
