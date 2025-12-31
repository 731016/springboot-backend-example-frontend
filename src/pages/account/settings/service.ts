import {request} from '@umijs/max';
import type {CurrentUser, GeographicItemType} from './data';
import {UserRegisterParams} from "@/pages/user/register/service";

export async function queryCurrent(): Promise<{ data: API.CurrentUser }> {
  return request('/api/user/current');
}

export async function updateCurrentUser(params: API.CurrentUser) {
  return request('/api/user/update', {
    method: 'POST',
    data: params,
  });
}

export async function queryProvince(): Promise<{ data: GeographicItemType[] }> {
  return request('/api/geographic/province');
}

export async function queryCity(
  province: string,
): Promise<{ data: GeographicItemType[] }> {
  return request(`/api/geographic/city/${province}`);
}

export async function query() {
  return request('/api/users');
}
