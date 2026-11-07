// src/pages/msgQueue/collector-source/data.d.ts

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface Page<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export type CollectorProtocol = 'HTTP' | 'MODBUS_TCP' | 'OPC_UA';

export interface CollectorHttpConfig {
  baseUrl: string;
  validUrl?: string;
  method?: string;
  contentType?: string;
  headers?: string;
  requestTemplate?: string;
  responseDataPath?: string;
  valueField?: string;
  attributeNameField?: string;
  timeoutMillis?: number;
}

export interface CollectorModbusConfig {
  host: string;
  port?: number;
  slaveId?: number;
  connectTimeoutMillis?: number;
  readTimeoutMillis?: number;
}

export interface CollectorOpcUaConfig {
  endpointUrl: string;
  securityPolicy?: string;
  username?: string;
  password?: string;
  requestTimeoutMillis?: number;
}

/**
 * 采集数据源
 */
export interface CollectorSource {
  id?: number;
  sourceCode: string;
  sourceName: string;
  protocol: CollectorProtocol;
  status?: number;
  remark?: string;
  pointCount?: number;
  createTime?: string;
  updateTime?: string;
  httpConfig?: CollectorHttpConfig;
  modbusConfig?: CollectorModbusConfig;
  opcUaConfig?: CollectorOpcUaConfig;
}

export interface CollectorSourceQueryRequest {
  current?: number;
  pageSize?: number;
  sourceCode?: string;
  sourceName?: string;
  protocol?: string;
  status?: number;
}

/**
 * 点位协议绑定
 */
export interface PointBinding {
  registerType?: string;
  address?: number;
  quantity?: number;
  dataType?: string;
  byteOrder?: string;
  scale?: number;
  nodeId?: string;
  attributeName?: string;
}

export interface CollectorSourceTestRequest {
  sourceId: number;
  pointId?: number;
}

export interface CollectorSourceTestResult {
  success: boolean;
  message?: string;
  value?: number;
  attributeName?: string;
  costMillis?: number;
}
