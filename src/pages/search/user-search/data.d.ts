// src/pages/admin/user-search/data.d.ts

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 用户 ES 信息实体
 */
export interface UserEs {
  id: number;
  userAccount: string;
  userName?: string;
  userProfile?: string;
  userRole: string;
  createTime: string;
  updateTime: string;
  isDelete?: number;
  // 高亮字段
  highlightUserAccount?: string;
  highlightUserName?: string;
  highlightUserProfile?: string;
}

/**
 * 用户 ES 查询参数
 */
export interface UserEsQueryRequest {
  current?: number;
  pageSize?: number;
  searchText?: string;
}
