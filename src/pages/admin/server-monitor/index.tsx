// src/pages/admin/server-monitor/index.tsx
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Table, message, Space } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { getServerInfo } from './service';
import type { ServerInfo } from './data';

const ServerMonitorPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo>({
    cpu: [],
    mem: [],
    jvm: [],
    sys: [],
    sysFile: [],
  });
  const stompClientRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // WebSocket 连接地址
  const wsHost = 'http://127.0.0.1:8105/api/notification';
  const wsTopic = '/topic/server';

  // 获取服务器信息
  const fetchServerInfo = async () => {
    try {
      const res = await getServerInfo();
      if (res.code === 0) {
        setServerInfo(res.data);
      }
    } catch (error) {
      console.error('获取服务器信息失败:', error);
    }
  };

  // 初始化 WebSocket 连接
  const initWebSocket = () => {
    try {
      // 动态加载 SockJS 和 STOMP（从 public/js 目录）
      const loadScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          // 检查脚本是否已经加载
          const existingScript = document.querySelector(`script[src="${src}"]`);
          if (existingScript) {
            resolve();
            return;
          }

          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => {
            console.log(`成功加载脚本: ${src}`);
            resolve();
          };
          script.onerror = (error) => {
            console.error(`加载脚本失败: ${src}`, error);
            reject(new Error(`Failed to load script: ${src}`));
          };
          document.head.appendChild(script);
        });
      };

      const initConnection = () => {
        const SockJS = (window as any).SockJS;
        const Stomp = (window as any).Stomp;

        if (!SockJS || !Stomp) {
          message.error('WebSocket 库加载失败，请刷新页面重试');
          return;
        }

        fetchServerInfo();

        const socket = new SockJS(wsHost);
        const stompClient = Stomp.over(socket);

        // 禁用调试日志
        stompClient.debug = () => {};

        stompClient.connect({}, (frame: any) => {
          console.log('WebSocket 连接成功:', frame);
          setIsConnected(true);
          message.success('WebSocket 服务器连接成功');

          // 订阅消息
          stompClient.subscribe(wsTopic, (response: any) => {
            const data = JSON.parse(response.body);
            setServerInfo(data);
          });
        }, (error: any) => {
          console.error('WebSocket 连接错误:', error);
          message.error('WebSocket 连接失败');
        });

        stompClientRef.current = stompClient;
        socketRef.current = socket;
      };

      // 检查是否已加载
      if ((window as any).SockJS && (window as any).Stomp) {
        initConnection();
      } else {
        // 加载脚本
        Promise.all([
          loadScript('/scripts/sockjs.min.js'),
          loadScript('/scripts/stomp.js'),
        ])
          .then(() => {
            // 再次检查库是否已加载
            if ((window as any).SockJS && (window as any).Stomp) {
              initConnection();
            } else {
              message.error('WebSocket 库加载失败，请检查文件是否存在');
              console.error('SockJS 或 Stomp 未正确加载到 window 对象');
            }
          })
          .catch((error) => {
            console.error('加载 WebSocket 库失败:', error);
            message.error(`加载 WebSocket 库失败: ${error.message}`);
          });
      }
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      message.error('WebSocket 连接失败');
    }
  };

  // 断开 WebSocket 连接
  const destroyWebSocket = () => {
    if (stompClientRef.current) {
      try {
        stompClientRef.current.disconnect();
      } catch (e) {
        console.error('断开连接失败:', e);
      }
      stompClientRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.error('关闭 socket 失败:', e);
      }
      socketRef.current = null;
    }
    setIsConnected(false);
    setServerInfo({
      cpu: [],
      mem: [],
      jvm: [],
      sys: [],
      sysFile: [],
    });
    message.success('WebSocket 断开成功');
  };

  useEffect(() => {
    // 组件挂载时自动连接
    initWebSocket();

    // 组件卸载时断开连接
    return () => {
      destroyWebSocket();
    };
  }, []);

  const columns = [
    {
      title: '属性',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
    },
  ];

  return (
    <PageContainer
      title="服务器监控"
      extra={
        <Space>
          <Button type="primary" onClick={initWebSocket} disabled={isConnected}>
            手动连接
          </Button>
          <Button type="primary" danger onClick={destroyWebSocket} disabled={!isConnected}>
            断开连接
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Card title="CPU信息" style={{ flex: 1 }}>
            <Table
              columns={columns}
              dataSource={serverInfo.cpu}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>
          <Card title="内存信息" style={{ flex: 1 }}>
            <Table
              columns={columns}
              dataSource={serverInfo.mem}
              rowKey="key"
              pagination={false}
              size="small"
            />
          </Card>
        </div>

        <Card title="服务器信息">
          <Table
            columns={columns}
            dataSource={serverInfo.sys}
            rowKey="key"
            pagination={false}
            size="small"
          />
        </Card>

        <Card title="Java虚拟机信息">
          <Table
            columns={columns}
            dataSource={serverInfo.jvm}
            rowKey="key"
            pagination={false}
            size="small"
          />
        </Card>

        <Card title="磁盘状态">
          {serverInfo.sysFile.map((file, index) => (
            <div key={index} style={{ marginBottom: 16 }}>
              <Table
                columns={columns}
                dataSource={file}
                rowKey="key"
                pagination={false}
                size="small"
              />
            </div>
          ))}
        </Card>
      </Space>
    </PageContainer>
  );
};

export default ServerMonitorPage;
