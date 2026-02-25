// src/pages/admin/kafka-point-manage/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  PointConfig,
  AddPointConfigRequest,
  PointConfigQueryRequest,
  Page,
  TaskStatusVO,
  QueryCollectTask,
  CollectedData,
  DataDetail,
  DataStatistics,
} from './data';

/**
 * 新增采集点
 * POST /kafka/kafkaPointConfig/point/add
 */
export async function addPointConfig(
  data: AddPointConfigRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<number>>('/api/kafka/kafkaPointConfig/point/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 分页查询采集点配置
 * POST /kafka/kafkaPointConfig/point/list/page
 */
export async function listPointConfigByPage(
  params: PointConfigQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<Page<PointConfig>>>(
    '/api/kafka/kafkaPointConfig/point/list/page',
    {
      method: 'POST',
      data: params,
      ...(options || {}),
    },
  );
}

/**
 * 更新采集点
 * POST /kafka/kafkaPointConfig/point/update
 */
export async function updatePointConfig(
  data: PointConfig,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>('/api/kafka/kafkaPointConfig/point/update', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 启动采集任务
 * POST /kafka/dataCollect/start/{pointCode}
 */
export async function startCollection(
  pointCode: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>(`/api/kafka/dataCollect/start/${pointCode}`, {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 停止采集任务
 * POST /kafka/dataCollect/stop/{pointCode}
 */
export async function stopCollection(
  pointCode: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>(`/api/kafka/dataCollect/stop/${pointCode}`, {
    method: 'POST',
    ...(options || {}),
  });
}

/**
 * 获取单个采集任务状态
 * GET /kafka/dataCollect/status/{pointCode}
 */
export async function getCollectionStatus(
  pointCode: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<TaskStatusVO>>(
    `/api/kafka/dataCollect/status/${pointCode}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/**
 * 获取所有采集任务状态
 * GET /kafka/dataCollect/status/all
 */
export async function getAllCollectionStatus(options?: Record<string, any>) {
  return request<ApiResponse<TaskStatusVO[]>>(
    '/api/kafka/dataCollect/status/all',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/**
 * 查询数据是否生效
 * POST /kafka/dataQuery/queryCollectTaskIsStart
 */
export async function queryCollectTaskIsStart(
  data: QueryCollectTask,
  options?: Record<string, any>,
) {
  return request<ApiResponse<TaskStatusVO>>(
    '/api/kafka/dataQuery/queryCollectTaskIsStart',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

/**
 * 采集数据
 * POST /kafka/dataQuery/queryCollectData
 */
export async function queryCollectData(
  data: QueryCollectTask,
  options?: Record<string, any>,
) {
  return request<ApiResponse<CollectedData>>(
    '/api/kafka/dataQuery/queryCollectData',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

/**
 * 根据点位编码查询采集数据
 * GET /kafka/dataCollect/data/detail/{pointCode}
 */
export async function getDataDetailsByPointCode(
  pointCode: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<DataDetail[]>>(
    `/api/kafka/dataCollect/data/detail/${pointCode}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/**
 * 根据点位编码查询统计数据
 * GET /kafka/dataCollect/data/statistics/{pointCode}
 */
export async function getDataStatisticsByPointCode(
  pointCode: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<DataStatistics[]>>(
    `/api/kafka/dataCollect/data/statistics/${pointCode}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
