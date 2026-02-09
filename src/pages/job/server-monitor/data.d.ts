// src/pages/admin/server-monitor/data.d.ts

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  cpu: Array<{ key: string; value: string }>;
  mem: Array<{ key: string; value: string }>;
  jvm: Array<{ key: string; value: string }>;
  sys: Array<{ key: string; value: string }>;
  sysFile: Array<Array<{ key: string; value: string }>>;
}
