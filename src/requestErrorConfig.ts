import type {RequestOptions} from '@@/plugin-request/request';
import type {RequestConfig} from '@umijs/max';
import {message, notification} from 'antd';
import {stringify} from "querystring";

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}

// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean; //废弃
  data: any;
  code?: number;
  errorCode?: number; //废弃
  message?: string;
  errorMessage?: string; //废弃
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const {code, data, message, showType} =
        res as unknown as ResponseStructure;
      if (code !== 0) {
        const error: any = new Error(message);
        error.name = 'BizError';
        error.info = {code, message, showType, data};
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const {message, code} = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              _antd.message.warning(message);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              _antd.message.error(message);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: message,
                message: code,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              _antd.message.error(message);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        if (error && error.response) {
          switch (error.response.status) {
            case 400:
              error.message = '请求错误(400)';
              break;
            case 401:
              error.message = '未授权，请重新登录(401)';
              break;
            case 403:
              error.message = '拒绝访问(403)';
              break;
            case 404:
              error.message = '请求出错(404)';
              break;
            case 408:
              error.message = '请求超时(408)';
              break;
            case 4003:
              error.message = 'token失效,请重新登录';
              localStorage.removeItem('token');
              location.reload();
              break;
            case 500:
              error.message = '服务器错误(500)';
              break;
            case 501:
              error.message = '服务未实现(501)';
              break;
            case 502:
              error.message = '网络错误(502)';
              break;
            case 503:
              error.message = '服务不可用(503)';
              break;
            case 504:
              error.message = '网络超时(504)';
              break;
            case 505:
              error.message = 'HTTP版本不受支持(505)';
              break;
            default:
              error.message = '连接出错' + (error.response.status);
          }
        } else {
          error.message = '连接服务器失败!'
        }
        message.error(error.message);
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('没有响应! 请重试.');
      } else {
        // 发送请求时出了点问题
        message.error('请求错误, 请重试.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 拦截请求配置，进行个性化处理。
      // const url = config?.url?.concat('?token=123');
      const url = config?.url;
      return {...config, url};
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      const {data} = response as unknown as ResponseStructure;

      if (data.code === 0) {
        return response;
      }
      if (data?.code === 40100) {
        message.error('请先登录');
        history.replace({
          pathname: '/user/login',
          search: stringify({
            redirect: location.pathname,
          }),
        });
      } else {
        message.error(data?.message)
      }
      return response;
    },
  ],
};
