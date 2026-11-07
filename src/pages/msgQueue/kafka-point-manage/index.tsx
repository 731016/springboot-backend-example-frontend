// src/pages/admin/kafka-point-manage/index.tsx
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  message,
  Select,
  Space,
  Table,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AddPointConfigRequest,
  DataDetail,
  DataStatistics,
  PointConfig,
  TaskStatusVO,
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
import type { SPCChartType } from './spc';
import {
  buildSPC,
  DEFAULT_SPC_RULE_KEYS,
  parseSpcRuleKeys,
  SPC_CHART_LABEL,
  SPC_CHART_ORDER,
  SPC_RULE_DEFS,
} from './spc';
import { buildSPCOption, getSPCChartHeight } from './spcChart';

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
  const [dataDetailsModalVisible, setDataDetailsModalVisible] =
    useState<boolean>(false);
  const [statisticsModalVisible, setStatisticsModalVisible] =
    useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<
    TaskStatusVO | undefined
  >();
  const [dataDetails, setDataDetails] = useState<DataDetail[]>([]);
  const [dataStatistics, setDataStatistics] = useState<DataStatistics[]>([]);
  const [chartDataDetails, setChartDataDetails] = useState<DataDetail[]>([]); // 用于图表的数据
  const [currentPointCode, setCurrentPointCode] = useState<string>(''); // 当前查看的点位编码
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingDataDetails, setLoadingDataDetails] = useState<boolean>(false);
  const [loadingStatistics, setLoadingStatistics] = useState<boolean>(false);
  const [loadingChartData, setLoadingChartData] = useState<boolean>(false);
  const [realtimeModalVisible, setRealtimeModalVisible] =
    useState<boolean>(false);
  const [realtimeData, setRealtimeData] = useState<DataDetail[]>([]);
  const [realtimePointCode, setRealtimePointCode] = useState<string>('');
  // 当前实时查看的点位配置（用于 SPC 子组大小、判异规则与上下限）
  const [realtimePointConfig, setRealtimePointConfig] = useState<
    PointConfig | undefined
  >();
  const [realtimeSpcChartType, setRealtimeSpcChartType] =
    useState<SPCChartType>('MEAN_RANGE_CHART');
  const [isRealtimeConnected, setIsRealtimeConnected] =
    useState<boolean>(false);
  const stompClientRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  // 当前查看统计的点位配置（用于 SPC 子组大小、判异规则与上下限）
  const [currentPointConfig, setCurrentPointConfig] = useState<
    PointConfig | undefined
  >();
  const [spcChartType, setSpcChartType] =
    useState<SPCChartType>('MEAN_RANGE_CHART');

  // 当前点位启用的 SPC 判异规则
  const spcRules = useMemo(
    () => parseSpcRuleKeys(currentPointConfig?.spcRuleConfig),
    [currentPointConfig],
  );

  // SPC 控制图计算结果
  const spcResult = useMemo(() => {
    const valid = chartDataDetails.filter(
      (item): item is DataDetail & { value: number; collectTime: string } =>
        item.value != null && !!item.collectTime,
    );
    return buildSPC(spcChartType, {
      values: valid.map((item) => item.value),
      times: valid.map((item) => new Date(item.collectTime).getTime()),
      groupSize:
        spcChartType === 'INDIVIDUAL_RANGE_CHART'
          ? 1
          : (currentPointConfig?.spcGroupSize ?? 5),
      ruleKeys: spcRules,
      usl: currentPointConfig?.maxLimit,
      lsl: currentPointConfig?.minLimit,
    });
  }, [chartDataDetails, spcChartType, currentPointConfig, spcRules]);

  // SPC 控制图 ECharts 配置
  const spcOption = useMemo(
    () =>
      spcResult.seriesList.length > 0
        ? buildSPCOption(
            spcResult,
            spcChartType,
            getSPCChartHeight(spcChartType),
          )
        : null,
    [spcResult, spcChartType],
  );

  const spcPrimaryLine = spcResult.seriesList[0]?.line;
  const spcHeight = getSPCChartHeight(spcChartType);
  const pChartDisabled =
    !currentPointConfig?.minLimit && !currentPointConfig?.maxLimit;
  const fmtSPC = (value?: number) =>
    value === undefined || value === null ? '-' : Number(value).toFixed(3);

  // 实时点位启用的 SPC 判异规则
  const realtimeSpcRules = useMemo(
    () => parseSpcRuleKeys(realtimePointConfig?.spcRuleConfig),
    [realtimePointConfig],
  );

  // 实时数据 SPC 控制图计算结果（按采集时间升序）
  const realtimeSpcResult = useMemo(() => {
    const valid = realtimeData
      .filter(
        (item): item is DataDetail & { value: number; collectTime: string } =>
          item.value != null && !!item.collectTime,
      )
      .slice()
      .sort(
        (a, b) =>
          new Date(a.collectTime).getTime() - new Date(b.collectTime).getTime(),
      );
    return buildSPC(realtimeSpcChartType, {
      values: valid.map((item) => item.value),
      times: valid.map((item) => new Date(item.collectTime).getTime()),
      groupSize:
        realtimeSpcChartType === 'INDIVIDUAL_RANGE_CHART'
          ? 1
          : (realtimePointConfig?.spcGroupSize ?? 5),
      ruleKeys: realtimeSpcRules,
      usl: realtimePointConfig?.maxLimit,
      lsl: realtimePointConfig?.minLimit,
    });
  }, [
    realtimeData,
    realtimeSpcChartType,
    realtimePointConfig,
    realtimeSpcRules,
  ]);

  // 实时 SPC 控制图 ECharts 配置
  const realtimeSpcOption = useMemo(
    () =>
      realtimeSpcResult.seriesList.length > 0
        ? buildSPCOption(
            realtimeSpcResult,
            realtimeSpcChartType,
            getSPCChartHeight(realtimeSpcChartType),
          )
        : null,
    [realtimeSpcResult, realtimeSpcChartType],
  );

  const realtimeSpcPrimaryLine = realtimeSpcResult.seriesList[0]?.line;
  const realtimeSpcHeight = getSPCChartHeight(realtimeSpcChartType);
  const realtimePChartDisabled =
    !realtimePointConfig?.minLimit && !realtimePointConfig?.maxLimit;

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

        console.log('WebSocket 连接配置:', { wsHost, wsTopic, pointCode });

        console.log('开始连接 WebSocket:', wsHost);
        const socket = new SockJS(wsHost);
        const stompClient = Stomp.over(socket);

        // 启用调试日志（开发时使用）
        stompClient.debug = (str: string) => {
          console.log('STOMP:', str);
        };

        stompClient.connect(
          {},
          (frame: any) => {
            console.log('实时数据 WebSocket 连接成功:', frame);
            setIsRealtimeConnected(true);
            message.success('实时数据连接成功');

            // 订阅消息
            console.log('准备订阅主题:', wsTopic);
            try {
              const subscription = stompClient.subscribe(
                wsTopic,
                (response: any) => {
                  console.log('收到 WebSocket 消息:', response.body);
                  try {
                    const data: DataDetail = JSON.parse(response.body);
                    console.log('解析后的数据:', data);
                    console.log(
                      '当前点位编码:',
                      pointCode,
                      '收到点位编码:',
                      data.pointCode,
                    );

                    // 只接收当前点位的数据
                    if (data.pointCode === pointCode) {
                      console.log('点位匹配，更新数据');
                      setRealtimeData((prev) => {
                        const now = Date.now();
                        const fiveMinutesAgo = now - 5 * 60 * 1000;
                        // 过滤出最近5分钟的数据
                        const filtered = [...prev, data].filter((item) => {
                          if (!item.collectTime) return false;
                          const collectTime = new Date(
                            item.collectTime,
                          ).getTime();
                          return collectTime >= fiveMinutesAgo;
                        });
                        // 按时间降序排序（最新的在最上面）
                        const sorted = filtered.sort((a, b) => {
                          const timeA = a.collectTime
                            ? new Date(a.collectTime).getTime()
                            : 0;
                          const timeB = b.collectTime
                            ? new Date(b.collectTime).getTime()
                            : 0;
                          return timeB - timeA; // 降序：timeB - timeA
                        });
                        console.log('更新后的数据量:', sorted.length);
                        return sorted;
                      });
                    } else {
                      console.log('点位不匹配，忽略数据');
                    }
                  } catch (error) {
                    console.error(
                      '解析 WebSocket 消息失败:',
                      error,
                      '原始消息:',
                      response.body,
                    );
                  }
                },
              );

              console.log('订阅成功，订阅对象:', subscription);
              // 保存订阅引用，以便后续取消订阅
              (stompClientRef.current as any).subscription = subscription;
            } catch (subscribeError) {
              console.error('订阅失败:', subscribeError);
              message.error('订阅主题失败: ' + wsTopic);
            }
          },
          (error: any) => {
            console.error('实时数据 WebSocket 连接错误:', error);
            message.error('实时数据连接失败: ' + (error.message || '未知错误'));
            setIsRealtimeConnected(false);
          },
        );

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
    setRealtimePointConfig(record);
    setRealtimeSpcChartType('MEAN_RANGE_CHART');
    setRealtimeModalVisible(true);
    initRealtimeWebSocket(record.pointCode);
  };

  // 关闭实时数据 Modal
  const handleCloseRealtime = () => {
    destroyRealtimeWebSocket();
    setRealtimeModalVisible(false);
    setRealtimeData([]);
    setRealtimePointCode('');
    setRealtimePointConfig(undefined);
    setRealtimeSpcChartType('MEAN_RANGE_CHART');
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
    setCurrentPointConfig(record);
    setSpcChartType('MEAN_RANGE_CHART');
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
        0: { text: '否' },
        1: { text: '是' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        0: { text: '禁用', status: 'Default' },
        1: { text: '启用', status: 'Success' },
      },
    },
    {
      title: '运行状态',
      dataIndex: 'runningStatus',
      valueEnum: {
        0: { text: '停止', status: 'Default' },
        1: { text: '运行中', status: 'Success' },
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
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
        width="560px"
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        modalProps={{ destroyOnClose: true }}
        initialValues={
          editingPoint
            ? {
                ...editingPoint,
                isMainPoint: editingPoint.isMainPoint === 1,
                status: editingPoint.status === 1,
                spcGroupSize: editingPoint.spcGroupSize ?? 5,
                spcRuleKeys: parseSpcRuleKeys(editingPoint.spcRuleConfig),
              }
            : {
                status: true,
                spcGroupSize: 5,
                spcRuleKeys: DEFAULT_SPC_RULE_KEYS,
              }
        }
        onFinish={async (value) => {
          // 将 Boolean 转换为 Integer (0/1)，并把判异规则多选序列化为 JSON
          const submitData: any = {
            ...editingPoint,
            ...value,
            isMainPoint: value.isMainPoint ? 1 : 0,
            status: value.status ? 1 : 0,
            spcGroupSize: value.spcGroupSize ?? 5,
            spcRuleConfig: JSON.stringify(
              value.spcRuleKeys ?? DEFAULT_SPC_RULE_KEYS,
            ),
          };
          delete submitData.spcRuleKeys;

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
          rules={[{ required: true, message: '请输入采集点编码' }]}
        />
        <ProFormText
          name="pointName"
          label="采集点名称"
          rules={[{ required: true, message: '请输入采集点名称' }]}
        />
        <ProFormText name="validUrl" label="校验URL" />
        <ProFormText
          name="dataUrl"
          label="数据URL"
          rules={[{ required: true, message: '请输入数据URL' }]}
        />
        <ProFormDigit
          name="minLimit"
          label="最小限值"
          fieldProps={{ min: -99999 }}
        />
        <ProFormDigit
          name="maxLimit"
          label="最大限值"
          fieldProps={{ min: -99999 }}
        />
        <ProFormDigit
          name="intervalSeconds"
          label="采集间隔(秒)"
          fieldProps={{ min: 1 }}
          rules={[{ required: true, message: '请输入采集间隔' }]}
        />
        <ProFormDigit
          name="spcGroupSize"
          label="SPC子组大小"
          tooltip="2-25，默认 5；I-MR 图型运行时按 1 处理"
          fieldProps={{ min: 2, max: 25, precision: 0 }}
          rules={[{ required: true, message: '请输入 SPC 子组大小' }]}
        />
        <ProFormSelect
          name="spcRuleKeys"
          label="SPC判异规则"
          options={SPC_RULE_DEFS.map((rule) => ({
            label: rule.label,
            value: rule.key,
          }))}
          fieldProps={{ mode: 'multiple' }}
          rules={[{ required: true, message: '请至少启用一条判异规则' }]}
        />
        <ProFormSwitch name="isMainPoint" label="是否主点" />
        <ProFormSwitch name="status" label="是否启用" initialValue={true} />
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
          <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
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
          <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
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
                  dataType != null ? (DataTypeLabel[dataType] ?? '-') : '-',
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
          setCurrentPointConfig(undefined);
          setSpcChartType('MEAN_RANGE_CHART');
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setStatisticsModalVisible(false);
              setChartDataDetails([]);
              setCurrentPointCode('');
              setCurrentPointConfig(undefined);
              setSpcChartType('MEAN_RANGE_CHART');
            }}
          >
            关闭
          </Button>,
        ]}
        width={1400}
      >
        {loadingStatistics || loadingChartData ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* SPC 控制图 */}
            <div style={{ marginBottom: 24, width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>
                  SPC 控制图 {currentPointCode ? `（${currentPointCode}）` : ''}
                </h3>
                <Space size="middle">
                  <span>图型：</span>
                  <Select
                    value={spcChartType}
                    style={{ width: 240 }}
                    onChange={(value) => setSpcChartType(value as SPCChartType)}
                    options={SPC_CHART_ORDER.map((type) => ({
                      label: SPC_CHART_LABEL[type],
                      value: type,
                      disabled:
                        type === 'FRACTION_DEFECTIVE_PARTS_CHART' &&
                        pChartDisabled,
                    }))}
                  />
                </Space>
              </div>

              <Descriptions
                bordered
                size="small"
                column={4}
                style={{ marginBottom: 12 }}
              >
                <Descriptions.Item label="子组数">
                  {spcResult.stats.groupCount}
                </Descriptions.Item>
                <Descriptions.Item label="子组大小">
                  {spcResult.stats.groupSize}
                </Descriptions.Item>
                <Descriptions.Item label="判异规则">
                  {spcRules.length > 0 ? spcRules.join('、') : '未启用'}
                </Descriptions.Item>
                <Descriptions.Item label="判异点数">
                  {spcResult.stats.violationCount}
                </Descriptions.Item>
                <Descriptions.Item label="CL">
                  {fmtSPC(spcPrimaryLine?.cl)}
                </Descriptions.Item>
                <Descriptions.Item label="UCL">
                  {fmtSPC(spcPrimaryLine?.ucl)}
                </Descriptions.Item>
                <Descriptions.Item label="LCL">
                  {fmtSPC(spcPrimaryLine?.lcl)}
                </Descriptions.Item>
                <Descriptions.Item label="超限点数">
                  {spcResult.stats.outOfSpecCount}
                </Descriptions.Item>
                <Descriptions.Item label="Cp">
                  {spcResult.capability?.cp ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Cpk">
                  {spcResult.capability?.cpk ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Pp">
                  {spcResult.capability?.pp ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ppk">
                  {spcResult.capability?.ppk ?? '-'}
                </Descriptions.Item>
              </Descriptions>

              {spcResult.warning && (
                <Alert
                  type="warning"
                  showIcon
                  message={spcResult.warning}
                  style={{ marginBottom: 12 }}
                />
              )}

              {spcOption ? (
                <ReactECharts
                  option={spcOption}
                  style={{ width: '100%', height: `${spcHeight}px` }}
                  opts={{ renderer: 'svg' }}
                />
              ) : (
                <div
                  style={{
                    padding: '40px 0',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  数据不足，无法绘制 SPC 控制图
                </div>
              )}
            </div>

            {/* 统计数据表格 */}
            {dataStatistics.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: 16 }}>统计数据列表</h3>
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
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 连接状态 */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ marginRight: 16 }}>
              连接状态:{' '}
              {isRealtimeConnected ? (
                <span style={{ color: '#52c41a' }}>已连接</span>
              ) : (
                <span style={{ color: '#ff4d4f' }}>未连接</span>
              )}
            </span>
            <span>数据量: {realtimeData.length} 条（最近5分钟）</span>
          </div>

          {/* 实时 SPC 控制图 */}
          {realtimeData.length > 0 && (
            <div style={{ marginBottom: 24, width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>实时 SPC 控制图</h3>
                <Space size="middle">
                  <span>图型：</span>
                  <Select
                    value={realtimeSpcChartType}
                    style={{ width: 240 }}
                    onChange={(value) =>
                      setRealtimeSpcChartType(value as SPCChartType)
                    }
                    options={SPC_CHART_ORDER.map((type) => ({
                      label: SPC_CHART_LABEL[type],
                      value: type,
                      disabled:
                        type === 'FRACTION_DEFECTIVE_PARTS_CHART' &&
                        realtimePChartDisabled,
                    }))}
                  />
                </Space>
              </div>

              <Descriptions
                bordered
                size="small"
                column={4}
                style={{ marginBottom: 12 }}
              >
                <Descriptions.Item label="子组数">
                  {realtimeSpcResult.stats.groupCount}
                </Descriptions.Item>
                <Descriptions.Item label="子组大小">
                  {realtimeSpcResult.stats.groupSize}
                </Descriptions.Item>
                <Descriptions.Item label="判异规则">
                  {realtimeSpcRules.length > 0
                    ? realtimeSpcRules.join('、')
                    : '未启用'}
                </Descriptions.Item>
                <Descriptions.Item label="判异点数">
                  {realtimeSpcResult.stats.violationCount}
                </Descriptions.Item>
                <Descriptions.Item label="CL">
                  {fmtSPC(realtimeSpcPrimaryLine?.cl)}
                </Descriptions.Item>
                <Descriptions.Item label="UCL">
                  {fmtSPC(realtimeSpcPrimaryLine?.ucl)}
                </Descriptions.Item>
                <Descriptions.Item label="LCL">
                  {fmtSPC(realtimeSpcPrimaryLine?.lcl)}
                </Descriptions.Item>
                <Descriptions.Item label="超限点数">
                  {realtimeSpcResult.stats.outOfSpecCount}
                </Descriptions.Item>
                <Descriptions.Item label="Cp">
                  {realtimeSpcResult.capability?.cp ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Cpk">
                  {realtimeSpcResult.capability?.cpk ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Pp">
                  {realtimeSpcResult.capability?.pp ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ppk">
                  {realtimeSpcResult.capability?.ppk ?? '-'}
                </Descriptions.Item>
              </Descriptions>

              {realtimeSpcResult.warning && (
                <Alert
                  type="warning"
                  showIcon
                  message={realtimeSpcResult.warning}
                  style={{ marginBottom: 12 }}
                />
              )}

              {realtimeSpcOption ? (
                <ReactECharts
                  option={realtimeSpcOption}
                  style={{ width: '100%', height: `${realtimeSpcHeight}px` }}
                  opts={{ renderer: 'svg' }}
                />
              ) : (
                <div
                  style={{
                    padding: '40px 0',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  数据不足，无法绘制 SPC 控制图
                </div>
              )}
            </div>
          )}

          {/* 实时数据表格 */}
          {realtimeData.length > 0 ? (
            <div>
              <h3 style={{ marginBottom: 16 }}>实时数据列表</h3>
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
                      dataType != null ? (DataTypeLabel[dataType] ?? '-') : '-',
                  },
                ]}
                dataSource={realtimeData}
                rowKey={(record, index) =>
                  record.id?.toString() || `realtime-${index}`
                }
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
                scroll={{ y: 400 }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              暂无实时数据，等待数据推送...
            </div>
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default KafkaPointManagePage;
