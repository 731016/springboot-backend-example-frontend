/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
export default {
  // 如果需要自定义本地开发服务器  请取消注释按需调整
  dev: {
    '/api/job': {
      // 要代理的地址
      target: 'http://localhost:8106/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/es': '/api/job'}, // 保持路径一致，不要瞎删
    },
    '/api/websocket': {
      // 要代理的地址
      target: 'http://localhost:8105/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/es': '/api/websocket'}, // 保持路径一致，不要瞎删
    },
    '/api/es': {
      // 要代理的地址
      target: 'http://localhost:8104/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/es': '/api/es'}, // 保持路径一致，不要瞎删
    },
    '/api/cache': {
      // 要代理的地址
      target: 'http://localhost:8103/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/cache': '/api/cache'}, // 保持路径一致，不要瞎删
    },
    '/api/file': {
      // 要代理的地址
      target: 'http://localhost:8102/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/file': '/api/file'}, // 保持路径一致，不要瞎删
    },
    '/api/': {
      // 要代理的地址
      target: 'http://localhost:8101/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api': '/api'}, // 保持路径一致，不要瞎删
    },

  },
  /**
   * @name 详细的代理配置
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    '/api/es': {
      // 要代理的地址
      target: 'http://localhost:8104/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/es': '/api/es'}, // 保持路径一致，不要瞎删
    },
    '/api/cache': {
      // 要代理的地址
      target: 'http://localhost:8103/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/cache': '/api/cache'}, // 保持路径一致，不要瞎删
    },
    '/api/file': {
      // 要代理的地址
      target: 'http://localhost:8102/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/file': '/api/file'}, // 保持路径一致，不要瞎删
    },
    '/api/': {
      // 要代理的地址
      target: 'http://localhost:8101/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api': '/api'}, // 保持路径一致，不要瞎删
    },
  },
  pre: {
    '/api/es': {
      // 要代理的地址
      target: 'http://localhost:8104/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/es': '/api/es'}, // 保持路径一致，不要瞎删
    },
    '/api/cache': {
      // 要代理的地址
      target: 'http://localhost:8103/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/cache': '/api/cache'}, // 保持路径一致，不要瞎删
    },
    '/api/file': {
      // 要代理的地址
      target: 'http://localhost:8102/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api/file': '/api/file'}, // 保持路径一致，不要瞎删
    },
    '/api/': {
      // 要代理的地址
      target: 'http://localhost:8101/',
      changeOrigin: true,           // 必须
      pathRewrite: {'^/api': '/api'}, // 保持路径一致，不要瞎删
    },
  },
};
