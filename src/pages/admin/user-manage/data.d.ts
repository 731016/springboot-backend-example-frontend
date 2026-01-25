// src/pages/admin/user-manage/data.d.ts

/**
 * 通用后端返回结构
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 用户信息实体
 */
export interface User {
  id: number;
  userAccount: string;
  userPassword?: string;
  unionId?: string;
  mpOpenId?: string;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: string;
  createTime: string;
  updateTime: string;
  isDelete?: number;
}

/**
 * 用户查询参数
 */
export interface UserQueryRequest {
  current?: number;
  pageSize?: number;
  id?: number;
  unionId?: string;
  mpOpenId?: string;
  userName?: string;
  userProfile?: string;
  userRole?: string;
  sortField?: string;
  sortOrder?: string;
}

/**
 * 用户创建参数
 */
export interface UserAddRequest {
  userAccount: string;
  userPassword?: string;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
  userRole?: string;
}

/**
 * 用户更新参数
 */
export interface UserUpdateRequest {
  id: number;
  userAccount?: string;
  userPassword?: string;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
  userRole?: string;
}

/**
 * 删除用户参数
 */
export interface DeleteRequest {
  id: number;
}
