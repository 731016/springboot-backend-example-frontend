import { request } from '@umijs/max';

export interface StateType {
  status?: 'ok' | 'error';
  currentAuthority?: 'user' | 'guest' | 'admin';
  code;
  data;
  message;
}

export interface UserRegisterParams {
  mail: string; //废弃
  password: string; //废弃
  confirm: string; //废弃
  mobile: string; //废弃
  captcha: string; //废弃
  prefix: string; //废弃
  checkPassword: string;
  userAccount: string;
  userPassword: string;
}

export async function fakeRegister(params: UserRegisterParams) {
  return request('/api/user/register', {
    method: 'POST',
    data: params,
  });
}
