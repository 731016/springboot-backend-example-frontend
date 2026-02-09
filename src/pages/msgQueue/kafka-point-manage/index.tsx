// src/pages/admin/kafka-point-manage/index.tsx
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Descriptions, message, Modal, Space, Table } from 'antd';
import React, { useRef, useState, useMemo } from 'react';
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
} from './service';

const KafkaPointManagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
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
      render: (_, record) => [
        <a
          key="start"
          onClick={() => {
            handleStart(record);
          }}
        >
          启动
        </a>,
        <a
          key="stop"
          onClick={() => {
            handleStop(record);
          }}
        >
          停止
        </a>,
        <a
          key="status"
          onClick={() => {
            handleViewStatus(record);
          }}
        >
          查看状态
        </a>,
        <a
          key="data"
          onClick={() => {
            handleViewDataDetails(record);
          }}
        >
          查看采集数据
        </a>,
        <a
          key="statistics"
          onClick={() => {
            handleViewStatistics(record);
          }}
        >
          查看统计数据
        </a>,
      ],
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
        title="新增采集点"
        width="480px"
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          // 将 Boolean 转换为 Integer (0/1)
          const submitData: AddPointConfigRequest = {
            ...value,
            isMainPoint: value.isMainPoint ? 1 : 0,
            status: value.status ? 1 : 0,
          } as AddPointConfigRequest;
          const success = await handleAdd(submitData);
          if (success) {
            setCreateModalVisible(false);
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
        <ProFormDigit name="minLimit" label="最小限值" fieldProps={{ min: -99999 }}/>
        <ProFormDigit name="maxLimit" label="最大限值" fieldProps={{ min: -99999 }}/>
        <ProFormDigit
          name="intervalSeconds"
          label="采集间隔(秒)"
          fieldProps={{ min: 1 }}
          rules={[{ required: true, message: '请输入采集间隔' }]}
        />
        <ProFormSwitch name="isMainPoint" label="是否主点" />
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
            ]}
            dataSource={dataDetails}
            rowKey="id"
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
          <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 折线图 */}
            {chartOption && chartDataDetails.length > 0 && (
              <div style={{ marginBottom: 24, width: '100%' }}>
                <h3 style={{ marginBottom: 16 }}>
                  采集数据趋势图 {currentPointCode ? `（${currentPointCode}）` : ''}
                </h3>
                <ReactECharts
                  option={chartOption}
                  style={{ width: '100%', height: '400px' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            )}

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
    </PageContainer>
  );
};

export default KafkaPointManagePage;

