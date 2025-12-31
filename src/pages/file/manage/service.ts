// @ts-ignore
/* eslint-disable */
import {request} from '@umijs/max';
import type {FileTableListItem} from './data';
import {FileTableListData} from "./data";

/** 删除对象 DELETE /api/rule */
export async function deleteRemoteUserAvatar(
  data: { key: string },
  options?: { [key: string]: any },
) {
  return request<Record<string, any>>('/api/file/deleteRemoteUserAvatar', {
    data,
    method: 'DELETE',
    ...(options || {}),
  });
}

export async function deleteLocalUserAvatar(
  data: { key: string },
  options?: { [key: string]: any },
) {
  return request<Record<string, any>>('/api/file/deleteLocalUserAvatar', {
    data,
    method: 'DELETE',
    ...(options || {}),
  });
}


/**
 * 根据当前文件key查询tag
 * @param data
 * @param options
 */
export async function queryCurrentRemoteUserAvatarTags(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<FileTableListItem>('/api/file/queryCurrentRemoteUserAvatarTags', {
    data,
    method: 'POST',
    ...(options || {}),
  });
}

/** 查询所有用户头像 POST /api/file/listCurrentDirRemoteUserAvatar */
export async function listAllUserAvatarByRemote(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<FileTableListData>('/api/file/listCurrentDirRemoteUserAvatar', {
    data,
    method: 'POST',
    ...(options || {}),
  });
}

export async function listCurrentDirLocalUserAvatar(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<FileTableListData>('/api/file/listCurrentDirLocalUserAvatar', {
    data,
    method: 'POST',
    ...(options || {}),
  });
}

/** 下载头像（字节流） */
export async function downloadUserAvatar({reqUrl = '/api/file/downloadRemoteUserAvatar', fileKey, fileName}) {
  const res = await fetch(reqUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({key: fileKey}),
  });

  if (!res.ok) throw new Error('获取下载流失败');

  // 解析文件名（可选）
  const contentDisp = res.headers.get('Content-Disposition');
  let name = fileName || fileKey;
  if (contentDisp) {
    const match = contentDisp.match(/filename\*?=(UTF-8'')?([^;]+)/);
    if (match) name = decodeURIComponent(match[2].replace(/"/g, ''));
  }

  // 字节流 → blob → 下载
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



