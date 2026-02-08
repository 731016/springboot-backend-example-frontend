// src/pages/admin/server-monitor/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse, ServerInfo } from './data';

/**
 * 获取服务器信息
 * GET /websocket/server
 */
export async function getServerInfo(options?: Record<string, any>) {
  return request<ApiResponse<ServerInfo>>('/api/websocket/server', {
    method: 'GET',
    ...(options || {}),
  });
}
