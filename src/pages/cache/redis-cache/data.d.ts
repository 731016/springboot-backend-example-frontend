// src/pages/cache/redis-cache/data.d.ts

/**
 * 通用后端返回结构，对应 BaseResponse<T>
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * CodeDictionary 实体，对应后端 com.xiaofei.springbootbackendredis.model.entity.CodeDictionary
 */
export interface CodeDictionary {
  id?: number;
  isDeleted?: number;
  createTime?: string;
  updateTime?: string;

  type: string;
  code: string;
  name: string;

  attr1?: string;
  attr2?: string;
  attr3?: string;
  attr4?: string;
  attr5?: string;
  attr6?: string;
  attr7?: string;
  attr8?: string;
  attr9?: string;
  attr10?: string;
  attr11?: string;
  attr12?: string;
  sourceType?:string;
}

/**
 * 分页查询参数（目前后端 getByType 未做分页，这里主要用于 ProTable 的查询表单）
 */
export interface CodeDictionaryListParams {
  /** 字典类型，例如 USER */
  type?: string;
  code: string;
  name: string;
}

/**
 * 新增单条字典记录，对应后端 CodeDictionaryDto
 */
export interface CodeDictionaryCreateParams {
  type: string;
  code: string;
  name: string;
  attr1?: string;
  attr2?: string;
  attr3?: string;
  attr4?: string;
  attr5?: string;
  attr6?: string;
  attr7?: string;
  attr8?: string;
  attr9?: string;
  attr10?: string;
  attr11?: string;
  attr12?: string;
}

/**
 * 批量新增参数（如果后续需要做批量新增，可以复用）
 */
export type CodeDictionaryBatchCreateParams = CodeDictionaryCreateParams[];

/**
 * ProTable 的请求/分页类型
 */
export interface TableListPagination {
  current?: number;
  pageSize?: number;
  total?: number;
}
