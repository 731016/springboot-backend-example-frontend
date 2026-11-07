// src/pages/msgQueue/collector-source/service.ts
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  CollectorSource,
  CollectorSourceQueryRequest,
  CollectorSourceTestRequest,
  CollectorSourceTestResult,
  Page,
  PointBinding,
} from './data';

/**
 * 新增采集数据源
 * POST /kafka/collectorSource/source/add
 */
export async function addCollectorSource(
  data: CollectorSource,
  options?: Record<string, any>,
) {
  return request<ApiResponse<number>>('/api/kafka/collectorSource/source/add', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/**
 * 更新采集数据源
 * POST /kafka/collectorSource/source/update
 */
export async function updateCollectorSource(
  data: CollectorSource,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>(
    '/api/kafka/collectorSource/source/update',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

/**
 * 删除采集数据源
 * POST /kafka/collectorSource/source/delete/{id}
 */
export async function deleteCollectorSource(
  id: number,
  options?: Record<string, any>,
) {
  return request<ApiResponse<boolean>>(
    `/api/kafka/collectorSource/source/delete/${id}`,
    {
      method: 'POST',
      ...(options || {}),
    },
  );
}

/**
 * 分页查询采集数据源
 * POST /kafka/collectorSource/source/list/page
 */
export async function listCollectorSourceByPage(
  data: CollectorSourceQueryRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<Page<CollectorSource>>>(
    '/api/kafka/collectorSource/source/list/page',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

/**
 * 查询所有启用的采集数据源
 * GET /kafka/collectorSource/source/list/all
 */
export async function listAllCollectorSources(options?: Record<string, any>) {
  return request<ApiResponse<CollectorSource[]>>(
    '/api/kafka/collectorSource/source/list/all',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/**
 * 采集数据源详情
 * GET /kafka/collectorSource/source/detail/{id}
 */
export async function getCollectorSourceDetail(
  id: number,
  options?: Record<string, any>,
) {
  return request<ApiResponse<CollectorSource>>(
    `/api/kafka/collectorSource/source/detail/${id}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/**
 * 测试采集数据源（真实采集一次）
 * POST /kafka/collectorSource/source/test
 */
export async function testCollectorSource(
  data: CollectorSourceTestRequest,
  options?: Record<string, any>,
) {
  return request<ApiResponse<CollectorSourceTestResult>>(
    '/api/kafka/collectorSource/source/test',
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}

/**
 * 查询点位协议绑定
 * GET /kafka/collectorSource/point/binding/{pointId}
 */
export async function getPointBinding(
  pointId: number,
  options?: Record<string, any>,
) {
  return request<ApiResponse<PointBinding>>(
    `/api/kafka/collectorSource/point/binding/${pointId}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
