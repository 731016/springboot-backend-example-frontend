// src/pages/admin/kafka-point-manage/index.tsx
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDependency,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Form,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
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
import type { CollectorSource, PointBinding } from '../collector-source/data';
import {
  getPointBinding,
  listAllCollectorSources,
} from '../collector-source/service';
import {
  buildSPC,
  DEFAULT_SPC_RULE_KEYS,
  parseSpcRuleConfig,
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

const PROTOCOL_LABEL: Record<string, string> = {
  HTTP: 'HTTP',
  MODBUS_TCP: 'Modbus TCP',
  OPC_UA: 'OPC UA',
};

/** 触发浏览器下载 */
const downloadFile = (
  content: string | Blob,
  filename: string,
  mime = 'text/plain;charset=utf-8;',
) => {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** 导出 ECharts 图表为图片（SVG 渲染器会导出 svg，Canvas 渲染器导出 png） */
const exportChartImage = (instance: any, filename: string) => {
  const url: string | undefined = instance?.getDataURL?.({
    pixelRatio: 2,
    backgroundColor: '#fff',
  });
  if (!url) {
    message.warning('图表尚未渲染完成，无法导出');
    return;
  }
  const ext = url.startsWith('data:image/svg') ? 'svg' : 'png';
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const csvEscape = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** 导出采集明细 CSV（带 BOM，避免 Excel 中文乱码） */
const exportDetailsCsv = (rows: DataDetail[], filename: string) => {
  const header = ['点位编码', '采集时间', '采集值', '属性', '数据类型'];
  const lines = rows.map((row) =>
    [
      csvEscape(row.pointCode),
      csvEscape(row.collectTime),
      csvEscape(row.value),
      csvEscape(row.attributeName),
      csvEscape(
        row.dataType != null
          ? DataTypeLabel[row.dataType] ?? row.dataType
          : '',
      ),
    ].join(','),
  );
  downloadFile(
    `\uFEFF${[header.join(','), ...lines].join('\r\n')}`,
    filename,
    'text/csv;charset=utf-8;',
  );
};

const protocolLabel = (protocol?: string) =>
  protocol ? PROTOCOL_LABEL[protocol] || protocol : '-';

const MODBUS_REGISTER_OPTIONS = [
  { label: '线圈 (COIL)', value: 'COIL' },
  { label: '离散输入 (DISCRETE_INPUT)', value: 'DISCRETE_INPUT' },
  { label: '保持寄存器 (HOLDING_REGISTER)', value: 'HOLDING_REGISTER' },
  { label: '输入寄存器 (INPUT_REGISTER)', value: 'INPUT_REGISTER' },
];

const MODBUS_DATA_TYPE_OPTIONS = [
  'BOOLEAN',
  'INT16',
  'UINT16',
  'INT32',
  'UINT32',
  'FLOAT32',
];

const KafkaPointManagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  // 图表实例引用，用于导出图片
  const spcChartRef = useRef<any>(null);
  const realtimeSpcChartRef = useRef<any>(null);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [editingPoint, setEditingPoint] = useState<PointConfig | undefined>();
  const [editingBinding, setEditingBinding] = useState<
    PointBinding | undefined
  >();
  const [collectorSources, setCollectorSources] = useState<CollectorSource[]>(
    [],
  );
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
  // SPC 重算时段：spcRange 为选择器当前值，spcCalcRange 为点击“重算 SPC”后实际生效的时段
  const [spcRange, setSpcRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [spcCalcRange, setSpcCalcRange] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    listAllCollectorSources()
      .then((res) => {
        if (res.code === 0) {
          setCollectorSources(res.data || []);
        }
      })
      .catch(() => {
        // 数据源加载失败时不影响点位列表展示
      });
  }, []);

  const getSource = (sourceId?: number) =>
    collectorSources.find((item) => item.id === sourceId);

  // 当前点位启用的 SPC 判异规则与参数
  const spcRuleConfig = useMemo(
    () => parseSpcRuleConfig(currentPointConfig?.spcRuleConfig),
    [currentPointConfig],
  );
  const spcRules = spcRuleConfig.keys;

  // SPC 控制图计算结果（按“重算 SPC”时确定的时段过滤）
  const spcResult = useMemo(() => {
    const valid = chartDataDetails.filter(
      (item): item is DataDetail & { value: number; collectTime: string } => {
        // 非统计数据（如班外数据）不参与 SPC 计算
        if (item.dataType === 2) return false;
        if (item.value == null || !item.collectTime) return false;
        if (!spcCalcRange) return true;
        const time = new Date(item.collectTime).getTime();
        return time >= spcCalcRange[0] && time <= spcCalcRange[1];
      },
    );
    return buildSPC(spcChartType, {
      values: valid.map((item) => item.value),
      times: valid.map((item) => new Date(item.collectTime).getTime()),
      groupSize:
        spcChartType === 'INDIVIDUAL_RANGE_CHART'
          ? 1
          : (currentPointConfig?.spcGroupSize ?? 5),
      ruleKeys: spcRules,
      ruleParams: spcRuleConfig.params,
      usl: currentPointConfig?.maxLimit,
      lsl: currentPointConfig?.minLimit,
    });
  }, [
    chartDataDetails,
    spcChartType,
    currentPointConfig,
    spcRuleConfig,
    spcCalcRange,
  ]);

  // SPC 控制图 ECharts 配置
  const spcOption = useMemo(
    () =>
      spcResult.seriesList.length > 0
        ? buildSPCOption(
            spcResult,
            spcChartType,
            getSPCChartHeight(spcChartType),
            currentPointConfig?.unit,
          )
        : null,
    [spcResult, spcChartType, currentPointConfig],
  );

  // 导出 CSV 的数据：统计时段内且排除非统计数据
  const spcExportData = useMemo(
    () =>
      chartDataDetails.filter((item) => {
        if (item.dataType === 2) return false;
        if (!spcCalcRange || !item.collectTime) return true;
        const time = new Date(item.collectTime).getTime();
        return time >= spcCalcRange[0] && time <= spcCalcRange[1];
      }),
    [chartDataDetails, spcCalcRange],
  );

  const spcPrimaryLine = spcResult.seriesList[0]?.line;
  const spcHeight = getSPCChartHeight(spcChartType);
  const pChartDisabled =
    !currentPointConfig?.minLimit && !currentPointConfig?.maxLimit;
  const fmtSPC = (value?: number) =>
    value === undefined || value === null ? '-' : Number(value).toFixed(3);

  // 实时点位启用的 SPC 判异规则与参数
  const realtimeSpcRuleConfig = useMemo(
    () => parseSpcRuleConfig(realtimePointConfig?.spcRuleConfig),
    [realtimePointConfig],
  );
  const realtimeSpcRules = realtimeSpcRuleConfig.keys;

  // 实时数据 SPC 控制图计算结果（按采集时间升序）
  const realtimeSpcResult = useMemo(() => {
    const valid = realtimeData
      .filter(
        (item): item is DataDetail & { value: number; collectTime: string } =>
          // 非统计数据（如班外数据）不参与 SPC 计算
          item.dataType !== 2 && item.value != null && !!item.collectTime,
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
      ruleParams: realtimeSpcRuleConfig.params,
      usl: realtimePointConfig?.maxLimit,
      lsl: realtimePointConfig?.minLimit,
    });
  }, [
    realtimeData,
    realtimeSpcChartType,
    realtimePointConfig,
    realtimeSpcRuleConfig,
  ]);

  // 实时 SPC 控制图 ECharts 配置
  const realtimeSpcOption = useMemo(
    () =>
      realtimeSpcResult.seriesList.length > 0
        ? buildSPCOption(
            realtimeSpcResult,
            realtimeSpcChartType,
            getSPCChartHeight(realtimeSpcChartType),
            realtimePointConfig?.unit,
          )
        : null,
    [realtimeSpcResult, realtimeSpcChartType, realtimePointConfig],
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
        // 统一走同源，由 dev 代理 / OpenResty 反向代理转发到 8107，
        // 避免打包后写死 localhost 导致浏览器去连访问者自己的电脑
        const wsHost = `${window.location.origin}/api/notification`;
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

  // 按选择器中的时段重算 SPC（未选择时段则使用全部数据）
  const handleRecalcSpc = () => {
    if (spcRange) {
      setSpcCalcRange([spcRange[0].valueOf(), spcRange[1].valueOf()]);
      message.success('SPC 已按所选时段重算');
    } else {
      setSpcCalcRange(null);
      message.success('已使用全部数据重算 SPC');
    }
  };

  const handleViewStatistics = async (record: PointConfig) => {
    if (!record.pointCode) {
      message.error('pointCode 为空');
      return;
    }
    setCurrentPointCode(record.pointCode);
    setCurrentPointConfig(record);
    setSpcChartType('MEAN_RANGE_CHART');
    setSpcRange(null);
    setSpcCalcRange(null);
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
        // 默认带上数据的时间范围
        const timeRange = sortedData.reduce<[number, number] | null>(
          (range, item) => {
            if (!item.collectTime) return range;
            const time = new Date(item.collectTime).getTime();
            if (Number.isNaN(time)) return range;
            if (!range) return [time, time];
            return [Math.min(range[0], time), Math.max(range[1], time)];
          },
          null,
        );
        if (timeRange) {
          setSpcRange([dayjs(timeRange[0]), dayjs(timeRange[1])]);
          setSpcCalcRange(timeRange);
        }
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
      title: '单位',
      dataIndex: 'unit',
      hideInSearch: true,
      render: (_, record) => record.unit || '-',
    },
    {
      title: '采集数据源',
      dataIndex: 'sourceId',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => {
        const source = getSource(record.sourceId);
        return source
          ? `${source.sourceName}（${protocolLabel(source.protocol)}）`
          : '-';
      },
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
            onClick={async () => {
              let binding: PointBinding | undefined;
              if (record.id) {
                try {
                  const res = await getPointBinding(record.id);
                  if (res.code === 0) {
                    binding = res.data;
                  }
                } catch (_e) {
                  binding = undefined;
                }
              }
              setEditingBinding(binding);
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
                setEditingPoint(undefined);
                setEditingBinding(undefined);
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
        width="680px"
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
                spcRuleKeys: parseSpcRuleConfig(editingPoint.spcRuleConfig)
                  .keys,
                spcRuleParams: parseSpcRuleConfig(editingPoint.spcRuleConfig)
                  .params,
                binding: editingBinding ?? {},
              }
            : {
                status: true,
                spcGroupSize: 5,
                spcRuleKeys: DEFAULT_SPC_RULE_KEYS,
                spcRuleParams: {},
                binding: {},
              }
        }
        onFinish={async (value) => {
          // 将 Boolean 转换为 Integer (0/1)，并把判异规则及其参数序列化为 JSON
          const ruleParams = value.spcRuleParams ?? {};
          const ruleConfigJson = JSON.stringify(
            (value.spcRuleKeys ?? DEFAULT_SPC_RULE_KEYS).map(
              (key: string) => {
                const def = SPC_RULE_DEFS.find((rule) => rule.key === key);
                const param1 = ruleParams[key]?.param1 ?? def?.param1;
                const param2 = ruleParams[key]?.param2 ?? def?.param2;
                const item: { key: string; param1?: number; param2?: number } =
                  { key };
                if (param1 !== undefined) item.param1 = param1;
                if (param2 !== undefined) item.param2 = param2;
                return item;
              },
            ),
          );
          const submitData: any = {
            ...editingPoint,
            ...value,
            isMainPoint: value.isMainPoint ? 1 : 0,
            status: value.status ? 1 : 0,
            spcGroupSize: value.spcGroupSize ?? 5,
            spcRuleConfig: ruleConfigJson,
          };
          delete submitData.spcRuleKeys;
          delete submitData.spcRuleParams;
          // HTTP 协议由数据源统一配置，不需要点位绑定；Modbus/OPC UA 保留绑定字段
          const protocol = getSource(value.sourceId)?.protocol;
          if (protocol !== 'MODBUS_TCP' && protocol !== 'OPC_UA') {
            delete submitData.binding;
          }

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
        <ProFormText
          name="unit"
          label="单位"
          placeholder="例如 ℃、MPa、mm，可不填"
        />
        <ProFormSelect
          name="sourceId"
          label="采集数据源"
          showSearch
          options={collectorSources.map((item) => ({
            label: `${item.sourceName}（${protocolLabel(item.protocol)}）`,
            value: item.id,
          }))}
          rules={[{ required: true, message: '请选择采集数据源' }]}
        />
        <ProFormDependency name={['sourceId']}>
          {({ sourceId }) => {
            const protocol = getSource(sourceId)?.protocol;
            if (protocol === 'MODBUS_TCP') {
              return (
                <>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Modbus TCP 点位绑定"
                  />
                  <ProFormSelect
                    name={['binding', 'registerType']}
                    label="寄存器类型"
                    options={MODBUS_REGISTER_OPTIONS}
                    rules={[{ required: true, message: '请选择寄存器类型' }]}
                  />
                  <ProFormDigit
                    name={['binding', 'address']}
                    label="起始地址"
                    fieldProps={{ min: 0, precision: 0 }}
                    rules={[{ required: true, message: '请输入起始地址' }]}
                  />
                  <ProFormDigit
                    name={['binding', 'quantity']}
                    label="读取数量"
                    tooltip="线圈/离散输入单位为位，寄存器单位为字；32 位数据至少 2"
                    fieldProps={{ min: 1, precision: 0 }}
                    initialValue={1}
                    rules={[{ required: true, message: '请输入读取数量' }]}
                  />
                  <ProFormSelect
                    name={['binding', 'dataType']}
                    label="数据类型"
                    options={MODBUS_DATA_TYPE_OPTIONS}
                    initialValue="UINT16"
                    rules={[{ required: true, message: '请选择数据类型' }]}
                  />
                  <ProFormSelect
                    name={['binding', 'byteOrder']}
                    label="字节序"
                    options={['ABCD', 'CDAB', 'BADC', 'DCBA']}
                    initialValue="ABCD"
                  />
                  <ProFormDigit
                    name={['binding', 'scale']}
                    label="换算系数"
                    tooltip="采集值 = 原始值 × 换算系数"
                    fieldProps={{ min: -99999, step: 0.001 }}
                    initialValue={1}
                  />
                </>
              );
            }
            if (protocol === 'OPC_UA') {
              return (
                <>
                  <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="OPC UA 点位绑定"
                  />
                  <ProFormText
                    name={['binding', 'nodeId']}
                    label="节点 NodeId"
                    placeholder="例如 ns=2;s=Demo.Value"
                    rules={[{ required: true, message: '请输入节点 NodeId' }]}
                  />
                  <ProFormText
                    name={['binding', 'attributeName']}
                    label="属性名称"
                    placeholder="不填则默认使用采集点编码"
                  />
                </>
              );
            }
            if (protocol === 'HTTP') {
              return (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="HTTP 协议由数据源统一定义请求模板与响应解析，无需额外点位绑定"
                />
              );
            }
            return null;
          }}
        </ProFormDependency>
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
        <ProFormDependency name={['spcRuleKeys']}>
          {({ spcRuleKeys }) => {
            const rules = SPC_RULE_DEFS.filter(
              (rule) =>
                (spcRuleKeys ?? []).includes(rule.key) &&
                (rule.param1 !== undefined || rule.param2 !== undefined),
            );
            if (rules.length === 0) return null;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, color: '#666' }}>
                  判异规则参数
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {rules.map((rule) => (
                    <div
                      key={rule.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {rule.param1 !== undefined && (
                        <>
                          <span>{`${rule.key} 参数1`}</span>
                          <Form.Item
                            name={['spcRuleParams', rule.key, 'param1']}
                            noStyle
                            initialValue={rule.param1}
                          >
                            <InputNumber
                              min={1}
                              precision={0}
                              style={{ width: 72 }}
                            />
                          </Form.Item>
                        </>
                      )}
                      {rule.param2 !== undefined && (
                        <>
                          <span>{`${rule.key} 参数2`}</span>
                          <Form.Item
                            name={['spcRuleParams', rule.key, 'param2']}
                            noStyle
                            initialValue={rule.param2}
                          >
                            <InputNumber
                              min={1}
                              precision={0}
                              style={{ width: 72 }}
                            />
                          </Form.Item>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        </ProFormDependency>
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
          setSpcRange(null);
          setSpcCalcRange(null);
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
              setSpcRange(null);
              setSpcCalcRange(null);
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
                <Space size="middle" wrap>
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
                  <span>统计时段：</span>
                  <DatePicker.RangePicker
                    showTime
                    allowClear
                    value={spcRange}
                    format="YYYY-MM-DD HH:mm:ss"
                    placeholder={['开始时间', '结束时间']}
                    style={{ width: 380 }}
                    onChange={(values) => {
                      if (values && values[0] && values[1]) {
                        setSpcRange([values[0], values[1]]);
                      } else {
                        setSpcRange(null);
                      }
                    }}
                  />
                  <Button type="primary" onClick={handleRecalcSpc}>
                    重算 SPC
                  </Button>
                  <Button
                    disabled={!spcOption}
                    onClick={() =>
                      exportChartImage(
                        spcChartRef.current?.getEchartsInstance?.(),
                        `${currentPointCode || 'SPC'}-SPC图-${dayjs().format(
                          'YYYYMMDDHHmmss',
                        )}`,
                      )
                    }
                  >
                    导出图片
                  </Button>
                  <Button
                    disabled={spcExportData.length === 0}
                    onClick={() =>
                      exportDetailsCsv(
                        spcExportData,
                        `${currentPointCode || 'SPC'}-SPC数据-${dayjs().format(
                          'YYYYMMDDHHmmss',
                        )}.csv`,
                      )
                    }
                  >
                    导出 CSV
                  </Button>
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
                <Descriptions.Item label="USL（规格上限）">
                  {fmtSPC(spcResult.spec?.usl)}
                </Descriptions.Item>
                <Descriptions.Item label="LSL（规格下限）">
                  {fmtSPC(spcResult.spec?.lsl)}
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
                  ref={spcChartRef}
                  option={spcOption}
                  notMerge
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
                      title: '标准差',
                      dataIndex: 'standardDeviation',
                      key: 'standardDeviation',
                      render: (value?: number) =>
                        value == null ? '-' : value.toFixed(4),
                    },
                    {
                      title: '样本数',
                      dataIndex: 'sampleCount',
                      key: 'sampleCount',
                      render: (value?: number) => value ?? '-',
                    },
                    {
                      title: '超限次数',
                      dataIndex: 'outOfLimitCount',
                      key: 'outOfLimitCount',
                      render: (value?: number) => value ?? '-',
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
                  <Button
                    disabled={!realtimeSpcOption}
                    onClick={() =>
                      exportChartImage(
                        realtimeSpcChartRef.current?.getEchartsInstance?.(),
                        `${realtimePointCode || '实时'}-SPC图-${dayjs().format(
                          'YYYYMMDDHHmmss',
                        )}`,
                      )
                    }
                  >
                    导出图片
                  </Button>
                  <Button
                    disabled={realtimeData.length === 0}
                    onClick={() =>
                      exportDetailsCsv(
                        realtimeData,
                        `${
                          realtimePointCode || '实时'
                        }-实时数据-${dayjs().format('YYYYMMDDHHmmss')}.csv`,
                      )
                    }
                  >
                    导出 CSV
                  </Button>
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
                <Descriptions.Item label="USL（规格上限）">
                  {fmtSPC(realtimeSpcResult.spec?.usl)}
                </Descriptions.Item>
                <Descriptions.Item label="LSL（规格下限）">
                  {fmtSPC(realtimeSpcResult.spec?.lsl)}
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
                  ref={realtimeSpcChartRef}
                  option={realtimeSpcOption}
                  notMerge
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
