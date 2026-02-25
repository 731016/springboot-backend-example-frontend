// src/pages/admin/kafka-point-manage/index.tsx
import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {Button, Descriptions, message, Modal, Space, Table} from 'antd';
import React, {useRef, useState, useMemo, useEffect} from 'react';
import ReactECharts from 'echarts-for-react';
import type {
  PointConfig,
  AddPointConfigRequest,
  TaskStatusVO,
  DataDetail,
  DataStatistics,
} from './data';
import {
  addPointConfig,
  getAllCollectionStatus,
  getCollectionStatus,
  getDataDetailsByPointCode,
  getDataStatisticsByPointCode,
  listPointConfigByPage,
  startCollection,
  stopCollection,
  updatePointConfig,
} from './service';

/** 数据类型展示文案：1-正常数据，2-非统计数据，3-超过上下限制数据 */
const DataTypeLabel: Record<number, string> = {
  1: '正常数据',
  2: '非统计数据',
  3: '超过上下限制数据',
};

const KafkaPointManagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [editingPoint, setEditingPoint] = useState<PointConfig | undefined>();
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [dataDetailsModalVisible, setDataDetailsModalVisible] = useState<boolean>(false);
  const [statisticsModalVisible, setStatisticsModalVisible] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<TaskStatusVO | undefined>();
  const [dataDetails, setDataDetails] = useState<DataDetail[]>([]);
  const [dataStatistics, setDataStatistics] = useState<DataStatistics[]>([]);
  const [chartDataDetails, setChartDataDetails] = useState<DataDetail[]>([]); // 用于图表的数据
  const [currentPointCode, setCurrentPointCode] = useState<string>(''); // 当前查看的点位编码
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingDataDetails, setLoadingDataDetails] = useState<boolean>(false);
  const [loadingStatistics, setLoadingStatistics] = useState<boolean>(false);
  const [loadingChartData, setLoadingChartData] = useState<boolean>(false);
  const [realtimeModalVisible, setRealtimeModalVisible] = useState<boolean>(false);
  const [realtimeData, setRealtimeData] = useState<DataDetail[]>([]);
  const [realtimePointCode, setRealtimePointCode] = useState<string>('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const stompClientRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // 计算 ECharts 配置选项（必须在组件顶层）
  const chartOption = useMemo(() => {
    if (chartDataDetails.length === 0) {
      return null;
    }

    const filteredData = chartDataDetails
      .filter((item) => item.value != null && item.collectTime)
      .map((item) => {
        if (!item.collectTime) return null;
        return [
          new Date(item.collectTime).getTime(),
          Number(item.value) || 0,
        ];
      })
      .filter((item): item is [number, number] => item !== null)
      .sort((a, b) => a[0] - b[0]);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0];
          const date = new Date(param.value[0]);
          const dateStr = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          return `${dateStr}<br/>采集值: ${param.value[1].toFixed(2)}`;
        },
        axisPointer: {
          type: 'cross',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          },
          rotate: 45,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
        },
      ],
      series: [
        {
          name: '采集值',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: filteredData,
          lineStyle: {
            width: 2,
          },
          areaStyle: {
            opacity: 0.3,
          },
          animation: true,
          animationDuration: 1000,
        },
      ],
    };
  }, [chartDataDetails]);

  // 实时数据折线图配置
  const realtimeChartOption = useMemo(() => {
    if (realtimeData.length === 0) {
      return null;
    }

    const filteredData = realtimeData
      .filter((item) => item.value != null && item.collectTime)
      .map((item) => {
        if (!item.collectTime) return null;
        return [
          new Date(item.collectTime).getTime(),
          Number(item.value) || 0,
        ];
      })
      .filter((item): item is [number, number] => item !== null)
      .sort((a, b) => a[0] - b[0]);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0];
          const date = new Date(param.value[0]);
          const dateStr = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          return `${dateStr}<br/>采集值: ${param.value[1].toFixed(2)}`;
        },
        axisPointer: {
          type: 'cross',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
          },
          rotate: 45,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
        },
      ],
      series: [
        {
          name: '采集值',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: filteredData,
          lineStyle: {
            width: 2,
            color: '#1890ff',
          },
          areaStyle: {
            opacity: 0.3,
            color: '#1890ff',
          },
          animation: true,
          animationDuration: 500,
        },
      ],
    };
  }, [realtimeData]);

  const handleAdd = async (fields: AddPointConfigRequest) => {
    const hide = message.loading('正在添加采集点');
    try {
      const res = await addPointConfig(fields);
      hide();
      if (res.code === 0) {
        message.success('添加成功');
        return true;
      }
      message.error(res.message);
      return false;
    } catch (_e) {
      hide();
      message.error('添加失败，请重试');
      return false;
    }
  };

  const handleStart = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    const hide = message.loading('正在启动采集任务');
    try {
      const res = await startCollection(record.pointCode);
      hide();
      if (res.code === 0) {
        message.success(res.data || '启动成功');
        if (actionRef.current) {
          actionRef.current.reload();
        }
      } else {
        message.error(res.message || '启动失败');
      }
    } catch (_e) {
      hide();
      message.error('启动失败，请重试');
    }
  };

  const handleStop = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    const hide = message.loading('正在停止采集任务');
    try {
      const res = await stopCollection(record.pointCode);
      hide();
      if (res.code === 0) {
        message.success(res.data || '停止成功');
        if (actionRef.current) {
          actionRef.current.reload();
        }
      } else {
        message.error(res.message || '停止失败');
      }
    } catch (_e) {
      hide();
      message.error('停止失败，请重试');
    }
  };

  const handleViewStatus = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    setLoadingStatus(true);
    try {
      const res = await getCollectionStatus(record.pointCode);
      if (res.code === 0) {
        setCurrentStatus(res.data);
        setStatusModalVisible(true);
      } else {
        message.error(res.message || '获取状态失败');
      }
    } catch (_e) {
      message.error('获取状态失败，请重试');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleViewDataDetails = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    setLoadingDataDetails(true);
    try {
      const res = await getDataDetailsByPointCode(record.pointCode);
      if (res.code === 0) {
        setDataDetails(res.data || []);
        setDataDetailsModalVisible(true);
      } else {
        message.error(res.message || '获取采集数据失败');
      }
    } catch (_e) {
      message.error('获取采集数据失败，请重试');
    } finally {
      setLoadingDataDetails(false);
    }
  };

  // 初始化 WebSocket 连接
  const initRealtimeWebSocket = (pointCode: string) => {
    try {
      const loadScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
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

        // WebSocket 连接地址
        // Kafka 应用运行在 8107 端口，context-path 是 /api，所以 WebSocket 端点是 /api/notification
        // 注意：WebSocket 连接通常无法通过 HTTP 代理，需要直接连接到 Kafka 应用
        // 如果使用代理失败，可以尝试直接使用完整地址: 'http://localhost:8107/api/notification'
        const wsHost = 'http://localhost:8107/api/notification';
        const wsTopic = '/topic/kafka/data';

        console.log('WebSocket 连接配置:', {wsHost, wsTopic, pointCode});

        console.log('开始连接 WebSocket:', wsHost);
        const socket = new SockJS(wsHost);
        const stompClient = Stomp.over(socket);

        // 启用调试日志（开发时使用）
        stompClient.debug = (str: string) => {
          console.log('STOMP:', str);
        };

        stompClient.connect({}, (frame: any) => {
          console.log('实时数据 WebSocket 连接成功:', frame);
          setIsRealtimeConnected(true);
          message.success('实时数据连接成功');

          // 订阅消息
          console.log('准备订阅主题:', wsTopic);
          try {
            const subscription = stompClient.subscribe(wsTopic, (response: any) => {
              console.log('收到 WebSocket 消息:', response.body);
              try {
                const data: DataDetail = JSON.parse(response.body);
                console.log('解析后的数据:', data);
                console.log('当前点位编码:', pointCode, '收到点位编码:', data.pointCode);

                // 只接收当前点位的数据
                if (data.pointCode === pointCode) {
                  console.log('点位匹配，更新数据');
                  setRealtimeData((prev) => {
                    const now = Date.now();
                    const fiveMinutesAgo = now - 5 * 60 * 1000;
                    // 过滤出最近5分钟的数据
                    const filtered = [
                      ...prev,
                      data,
                    ].filter((item) => {
                      if (!item.collectTime) return false;
                      const collectTime = new Date(item.collectTime).getTime();
                      return collectTime >= fiveMinutesAgo;
                    });
                    // 按时间降序排序（最新的在最上面）
                    const sorted = filtered.sort((a, b) => {
                      const timeA = a.collectTime ? new Date(a.collectTime).getTime() : 0;
                      const timeB = b.collectTime ? new Date(b.collectTime).getTime() : 0;
                      return timeB - timeA; // 降序：timeB - timeA
                    });
                    console.log('更新后的数据量:', sorted.length);
                    return sorted;
                  });
                } else {
                  console.log('点位不匹配，忽略数据');
                }
              } catch (error) {
                console.error('解析 WebSocket 消息失败:', error, '原始消息:', response.body);
              }
            });

            console.log('订阅成功，订阅对象:', subscription);
            // 保存订阅引用，以便后续取消订阅
            (stompClientRef.current as any).subscription = subscription;
          } catch (subscribeError) {
            console.error('订阅失败:', subscribeError);
            message.error('订阅主题失败: ' + wsTopic);
          }
        }, (error: any) => {
          console.error('实时数据 WebSocket 连接错误:', error);
          message.error('实时数据连接失败: ' + (error.message || '未知错误'));
          setIsRealtimeConnected(false);
        });

        stompClientRef.current = stompClient;
        socketRef.current = socket;
      };

      if ((window as any).SockJS && (window as any).Stomp) {
        initConnection();
      } else {
        Promise.all([
          loadScript('/scripts/sockjs.min.js'),
          loadScript('/scripts/stomp.js'),
        ])
          .then(() => {
            if ((window as any).SockJS && (window as any).Stomp) {
              initConnection();
            } else {
              message.error('WebSocket 库加载失败，请检查文件是否存在');
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
  const destroyRealtimeWebSocket = () => {
    if (stompClientRef.current) {
      try {
        // 取消订阅
        if ((stompClientRef.current as any).subscription) {
          (stompClientRef.current as any).subscription.unsubscribe();
          console.log('已取消 WebSocket 订阅');
        }
        stompClientRef.current.disconnect();
        console.log('已断开 WebSocket 连接');
      } catch (_e) {
        console.error('断开连接失败:', _e);
      }
      stompClientRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (_e) {
        console.error('关闭 socket 失败:', _e);
      }
      socketRef.current = null;
    }
    setIsRealtimeConnected(false);
  };

  // 打开实时数据 Modal
  const handleViewRealtime = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }

    // 先获取最近5分钟的历史数据
    try {
      const res = await getDataDetailsByPointCode(record.pointCode);
      if (res.code === 0) {
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;
        const recentData = (res.data || [])
          .filter((item) => {
            if (!item.collectTime) return false;
            const collectTime = new Date(item.collectTime).getTime();
            return collectTime >= fiveMinutesAgo;
          })
          .sort((a, b) => {
            const timeA = a.collectTime ? new Date(a.collectTime).getTime() : 0;
            const timeB = b.collectTime ? new Date(b.collectTime).getTime() : 0;
            return timeB - timeA; // 降序：最新的在最上面
          });
        setRealtimeData(recentData);
      }
    } catch (_e) {
      console.error('获取历史数据失败:', _e);
    }

    setRealtimePointCode(record.pointCode);
    setRealtimeModalVisible(true);
    initRealtimeWebSocket(record.pointCode);
  };

  // 关闭实时数据 Modal
  const handleCloseRealtime = () => {
    destroyRealtimeWebSocket();
    setRealtimeModalVisible(false);
    setRealtimeData([]);
    setRealtimePointCode('');
  };

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      destroyRealtimeWebSocket();
    };
  }, []);

  const handleViewStatistics = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    setCurrentPointCode(record.pointCode);
    setLoadingStatistics(true);
    setLoadingChartData(true);
    try {
      // 同时获取统计数据和采集数据
      const [statisticsRes, chartDataRes] = await Promise.all([
        getDataStatisticsByPointCode(record.pointCode),
        getDataDetailsByPointCode(record.pointCode),
      ]);

      if (statisticsRes.code === 0) {
        setDataStatistics(statisticsRes.data || []);
      } else {
        message.error(statisticsRes.message || '获取统计数据失败');
      }

      if (chartDataRes.code === 0) {
        // 对采集数据按时间排序，用于绘制折线图
        const sortedData = (chartDataRes.data || []).sort((a, b) => {
          const timeA = a.collectTime ? new Date(a.collectTime).getTime() : 0;
          const timeB = b.collectTime ? new Date(b.collectTime).getTime() : 0;
          return timeA - timeB;
        });
        setChartDataDetails(sortedData);
        setStatisticsModalVisible(true);
      } else {
        message.error(chartDataRes.message || '获取采集数据失败');
      }
    } catch (_e) {
      message.error('获取数据失败，请重试');
    } finally {
      setLoadingStatistics(false);
      setLoadingChartData(false);
    }
  };

  const columns: ProColumns<PointConfig>[] = [
    {
      title: '采集点编码',
      dataIndex: 'pointCode',
    },
    {
      title: '采集点名称',
      dataIndex: 'pointName',
    },
    {
      title: '校验URL',
      dataIndex: 'validUrl',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '数据URL',
      dataIndex: 'dataUrl',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '最小限值',
      dataIndex: 'minLimit',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '最大限值',
      dataIndex: 'maxLimit',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '采集间隔(秒)',
      dataIndex: 'intervalSeconds',
      valueType: 'digit',
    },
    {
      title: '是否主点',
      dataIndex: 'isMainPoint',
      valueEnum: {
        0: {text: '否'},
        1: {text: '是'},
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        0: {text: '禁用', status: 'Default'},
        1: {text: '启用', status: 'Success'},
      },
    },
    {
      title: '运行状态',
      dataIndex: 'runningStatus',
      valueEnum: {
        0: {text: '停止', status: 'Default'},
        1: {text: '运行中', status: 'Success'},
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => (
        <Space size="small" wrap>
          <a
            key="edit"
            onClick={() => {
              setEditingPoint(record);
              setCreateModalVisible(true);
            }}
          >
            编辑
          </a>
          <a
            key="start"
            onClick={() => {
              handleStart(record);
            }}
          >
            启动
          </a>
          <a
            key="stop"
            onClick={() => {
              handleStop(record);
            }}
          >
            停止
          </a>
          <a
            key="status"
            onClick={() => {
              handleViewStatus(record);
            }}
          >
            查看状态
          </a>
          <a
            key="data"
            onClick={() => {
              handleViewDataDetails(record);
            }}
          >
            查看采集数据
          </a>
          <a
            key="statistics"
            onClick={() => {
              handleViewStatistics(record);
            }}
          >
            查看统计数据
          </a>
          <a
            key="realtime"
            onClick={() => {
              handleViewRealtime(record);
            }}
          >
            实时数据
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Space direction="vertical" size="middle" style={{width: '100%'}}>
        <ProTable<PointConfig>
          headerTitle="采集点管理"
          actionRef={actionRef}
          rowKey="pointCode"
          search={{
            labelWidth: 100,
          }}
          pagination={{
            defaultPageSize: 10,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          toolBarRender={() => [
            <Button
              type="primary"
              key="primary"
              onClick={() => {
                setCreateModalVisible(true);
              }}
            >
              新增采集点
            </Button>,
            <Button
              key="refreshStatus"
              onClick={async () => {
                const res = await getAllCollectionStatus();
                if (res.code === 0) {
                  message.success('刷新任务状态成功');
                } else {
                  message.error(res.message || '刷新任务状态失败');
                }
              }}
            >
              刷新任务状态
            </Button>,
          ]}
          request={async (params, sort, filter) => {
            const sortField = Object.keys(sort)?.[0];
            const sortOrder = sort?.[sortField] ?? undefined;

            const res = await listPointConfigByPage({
              ...params,
              sortField,
              sortOrder,
              ...filter,
            } as any);

            if (res.code === 0) {
              return {
                data: res.data.records,
                success: true,
                total: res.data.total,
              };
            }
            return {
              data: [],
              success: false,
            };
          }}
          columns={columns}
        />
      </Space>

      <ModalForm
        title={editingPoint ? '编辑采集点' : '新增采集点'}
        width="480px"
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        modalProps={{destroyOnClose: true}}
        initialValues={
          editingPoint
            ? {
              ...editingPoint,
              isMainPoint: editingPoint.isMainPoint === 1,
              status: editingPoint.status === 1,
            }
            : {
              status: true,
            }
        }
        onFinish={async (value) => {
          // 将 Boolean 转换为 Integer (0/1)
          const submitData: any = {
            ...editingPoint,
            ...value,
            isMainPoint: value.isMainPoint ? 1 : 0,
            status: value.status ? 1 : 0,
          };

          let success = false;
          if (editingPoint && editingPoint.id) {
            const hide = message.loading('正在更新采集点');
            try {
              const res = await updatePointConfig(submitData as PointConfig);
              hide();
              if (res.code === 0 && res.data) {
                message.success('更新成功');
                success = true;
              } else {
                message.error(res.message || '更新失败');
              }
            } catch (_e) {
              hide();
              message.error('更新失败，请重试');
            }
          } else {
            success = await handleAdd(submitData as AddPointConfigRequest);
          }

          if (success) {
            setCreateModalVisible(false);
            setEditingPoint(undefined);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
        <ProFormText
          name="pointCode"
          label="采集点编码"
          rules={[{required: true, message: '请输入采集点编码'}]}
        />
        <ProFormText
          name="pointName"
          label="采集点名称"
          rules={[{required: true, message: '请输入采集点名称'}]}
        />
        <ProFormText name="validUrl" label="校验URL"/>
        <ProFormText
          name="dataUrl"
          label="数据URL"
          rules={[{required: true, message: '请输入数据URL'}]}
        />
        <ProFormDigit name="minLimit" label="最小限值" fieldProps={{min: -99999}}/>
        <ProFormDigit name="maxLimit" label="最大限值" fieldProps={{min: -99999}}/>
        <ProFormDigit
          name="intervalSeconds"
          label="采集间隔(秒)"
          fieldProps={{min: 1}}
          rules={[{required: true, message: '请输入采集间隔'}]}
        />
        <ProFormSwitch name="isMainPoint" label="是否主点"/>
        <ProFormSwitch
          name="status"
          label="是否启用"
          initialValue={true}
        />
      </ModalForm>

      {/* 采集任务状态 Modal */}
      <Modal
        title="当前采集任务状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatusModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {loadingStatus ? (
          <div style={{textAlign: 'center', padding: '20px'}}>加载中...</div>
        ) : currentStatus ? (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="运行中">
              {currentStatus.running ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="上次采集时间">
              {currentStatus.lastCollectTime || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="下次采集时间">
              {currentStatus.nextCollectTime || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注信息">
              {currentStatus.message || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div>暂无数据</div>
        )}
      </Modal>

      {/* 采集数据明细 Modal */}
      <Modal
        title="采集数据明细"
        open={dataDetailsModalVisible}
        onCancel={() => setDataDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDataDetailsModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {loadingDataDetails ? (
          <div style={{textAlign: 'center', padding: '20px'}}>加载中...</div>
        ) : dataDetails.length > 0 ? (
          <Table
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 80,
              },
              {
                title: '采集点编码',
                dataIndex: 'pointCode',
                key: 'pointCode',
              },
              {
                title: '采集时间',
                dataIndex: 'collectTime',
                key: 'collectTime',
              },
              {
                title: '采集值',
                dataIndex: 'value',
                key: 'value',
                render: (value: number) => value?.toFixed(2) || '-',
              },
              {
                title: '属性名称',
                dataIndex: 'attributeName',
                key: 'attributeName',
              },
              {
                title: '数据类型',
                dataIndex: 'dataType',
                key: 'dataType',
                render: (dataType: number) =>
                  dataType != null ? DataTypeLabel[dataType] ?? '-' : '-',
              },
            ]}
            dataSource={dataDetails}
            rowKey="id"
            onRow={(record) => {
              let backgroundColor: string | undefined;
              if (record.dataType === 2) {
                // 非统计数据 - 红色
                backgroundColor = '#fff1f0';
              } else if (record.dataType === 3) {
                // 超过上下限制数据 - 黄色
                backgroundColor = '#fffbe6';
              } else if (record.dataType === 1) {
                // 正常数据 - 绿色
                backgroundColor = '#f6ffed';
              }
              return {
                style: {
                  backgroundColor,
                },
              };
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            size="small"
          />
        ) : (
          <div>暂无数据</div>
        )}
      </Modal>

      {/* 统计数据 Modal */}
      <Modal
        title="统计数据"
        open={statisticsModalVisible}
        onCancel={() => {
          setStatisticsModalVisible(false);
          setChartDataDetails([]);
          setCurrentPointCode('');
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setStatisticsModalVisible(false);
              setChartDataDetails([]);
              setCurrentPointCode('');
            }}
          >
            关闭
          </Button>,
        ]}
        width={1400}
      >
        {loadingStatistics || loadingChartData ? (
          <div style={{textAlign: 'center', padding: '20px'}}>加载中...</div>
        ) : (
          <Space direction="vertical" size="large" style={{width: '100%'}}>
            {/* 折线图 */}
            {chartOption && chartDataDetails.length > 0 && (
              <div style={{marginBottom: 24, width: '100%'}}>
                <h3 style={{marginBottom: 16}}>
                  采集数据趋势图 {currentPointCode ? `（${currentPointCode}）` : ''}
                </h3>
                <ReactECharts
                  option={chartOption}
                  style={{width: '100%', height: '400px'}}
                  opts={{renderer: 'svg'}}
                />
              </div>
            )}

            {/* 统计数据表格 */}
            {dataStatistics.length > 0 ? (
              <div>
                <h3 style={{marginBottom: 16}}>统计数据列表</h3>
                <Table
                  columns={[
                    {
                      title: 'ID',
                      dataIndex: 'id',
                      key: 'id',
                      width: 80,
                    },
                    {
                      title: '采集点编码',
                      dataIndex: 'pointCode',
                      key: 'pointCode',
                    },
                    {
                      title: '开始时间',
                      dataIndex: 'startTime',
                      key: 'startTime',
                    },
                    {
                      title: '结束时间',
                      dataIndex: 'endTime',
                      key: 'endTime',
                    },
                    {
                      title: '最大值',
                      dataIndex: 'maximumValue',
                      key: 'maximumValue',
                      render: (value: number) => value?.toFixed(2) || '-',
                    },
                    {
                      title: '最小值',
                      dataIndex: 'minimumValue',
                      key: 'minimumValue',
                      render: (value: number) => value?.toFixed(2) || '-',
                    },
                    {
                      title: '平均值',
                      dataIndex: 'averageValue',
                      key: 'averageValue',
                      render: (value: number) => value?.toFixed(2) || '-',
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: number) => {
                        const statusMap: Record<number, string> = {
                          0: '未开始',
                          1: '进行中',
                          2: '已完成',
                        };
                        return statusMap[status] || '-';
                      },
                    },
                  ]}
                  dataSource={dataStatistics}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                  }}
                  size="small"
                />
              </div>
            ) : (
              <div>暂无统计数据</div>
            )}
          </Space>
        )}
      </Modal>

      {/* 实时数据 Modal */}
      <Modal
        title={`实时采集数据 - ${realtimePointCode}`}
        open={realtimeModalVisible}
        onCancel={handleCloseRealtime}
        footer={[
          <Button key="close" onClick={handleCloseRealtime}>
            关闭
          </Button>,
        ]}
        width={1400}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{width: '100%'}}>
          {/* 连接状态 */}
          <div style={{textAlign: 'right'}}>
            <span style={{marginRight: 16}}>
              连接状态: {isRealtimeConnected ? (
              <span style={{color: '#52c41a'}}>已连接</span>
            ) : (
              <span style={{color: '#ff4d4f'}}>未连接</span>
            )}
            </span>
            <span>数据量: {realtimeData.length} 条（最近5分钟）</span>
          </div>

          {/* 实时折线图 */}
          {realtimeChartOption && realtimeData.length > 0 && (
            <div style={{marginBottom: 24, width: '100%'}}>
              <h3 style={{marginBottom: 16}}>实时数据趋势图</h3>
              <ReactECharts
                option={realtimeChartOption}
                style={{width: '100%', height: '400px'}}
                opts={{renderer: 'svg'}}
              />
            </div>
          )}

          {/* 实时数据表格 */}
          {realtimeData.length > 0 ? (
            <div>
              <h3 style={{marginBottom: 16}}>实时数据列表</h3>
              <Table
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'id',
                    key: 'id',
                    width: 80,
                  },
                  {
                    title: '采集点编码',
                    dataIndex: 'pointCode',
                    key: 'pointCode',
                  },
                  {
                    title: '采集时间',
                    dataIndex: 'collectTime',
                    key: 'collectTime',
                    render: (time: string) => {
                      if (!time) return '-';
                      return new Date(time).toLocaleString('zh-CN');
                    },
                  },
                  {
                    title: '采集值',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: number) => value?.toFixed(2) || '-',
                  },
                  {
                    title: '属性名称',
                    dataIndex: 'attributeName',
                    key: 'attributeName',
                  },
                  {
                    title: '数据类型',
                    dataIndex: 'dataType',
                    key: 'dataType',
                    render: (dataType: number) =>
                      dataType != null ? DataTypeLabel[dataType] ?? '-' : '-',
                  },
                ]}
                dataSource={realtimeData}
                rowKey={(record, index) => record.id?.toString() || `realtime-${index}`}
                onRow={(record) => {
                  let backgroundColor: string | undefined;
                  if (record.dataType === 2) {
                    backgroundColor = '#fff1f0';
                  } else if (record.dataType === 3) {
                    backgroundColor = '#fffbe6';
                  } else if (record.dataType === 1) {
                    backgroundColor = '#f6ffed';
                  }
                  return {
                    style: {
                      backgroundColor,
                    },
                  };
                }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }}
                size="small"
                scroll={{y: 400}}
              />
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '40px'}}>
              暂无实时数据，等待数据推送...
            </div>
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default KafkaPointManagePage;

