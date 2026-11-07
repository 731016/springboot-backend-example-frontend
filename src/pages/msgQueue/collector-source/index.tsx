import {
  PageContainer,
  ProFormDependency,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ModalForm,
  ProTable,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Modal, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import type { CollectorSource } from './data';
import {
  addCollectorSource,
  deleteCollectorSource,
  listCollectorSourceByPage,
  testCollectorSource,
  updateCollectorSource,
} from './service';

const PROTOCOL_OPTIONS = [
  { label: 'HTTP', value: 'HTTP' },
  { label: 'Modbus TCP', value: 'MODBUS_TCP' },
  { label: 'OPC UA', value: 'OPC_UA' },
];

const DEFAULT_HTTP_CONFIG = {
  method: 'POST',
  contentType: 'application/json',
  requestTemplate:
    '{"pointCode":"${pointCode}","collectTime":"${collectTime}"}',
  responseDataPath: 'data',
  valueField: 'value',
  attributeNameField: 'attributeName',
  timeoutMillis: 5000,
};

const DEFAULT_MODBUS_CONFIG = {
  port: 502,
  slaveId: 1,
  connectTimeoutMillis: 3000,
  readTimeoutMillis: 3000,
};

const DEFAULT_OPCUA_CONFIG = {
  securityPolicy: 'None',
  requestTimeoutMillis: 5000,
};

const CollectorSourcePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<CollectorSource | undefined>();

  const openAdd = () => {
    setEditing(undefined);
    setVisible(true);
  };

  const openEdit = (record: CollectorSource) => {
    setEditing(record);
    setVisible(true);
  };

  const handleTest = async (record: CollectorSource) => {
    if (!record.id) {
      return;
    }
    const hide = message.loading('正在测试采集...', 0);
    try {
      const res = await testCollectorSource({ sourceId: record.id });
      if (res.code === 0 && res.data?.success) {
        const valueText =
          res.data.value !== undefined && res.data.value !== null
            ? `，采集值：${res.data.value}`
            : '';
        message.success(
          `${res.data.message}${valueText}（${res.data.costMillis}ms）`,
        );
      } else {
        message.error(res.data?.message || '测试失败');
      }
    } catch (e) {
      message.error('测试失败');
    } finally {
      hide();
    }
  };

  const handleDelete = (record: CollectorSource) => {
    if (!record.id) {
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定删除采集数据源「${record.sourceName}」吗？`,
      onOk: async () => {
        const res = await deleteCollectorSource(record.id!);
        if (res.code === 0) {
          message.success('删除成功');
          actionRef.current?.reload();
        } else {
          message.error(res.message || '删除失败');
        }
      },
    });
  };

  const columns: ProColumns<CollectorSource>[] = [
    {
      title: '数据源编码',
      dataIndex: 'sourceCode',
      width: 160,
    },
    {
      title: '数据源名称',
      dataIndex: 'sourceName',
      width: 160,
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      width: 130,
      valueEnum: {
        HTTP: { text: 'HTTP' },
        MODBUS_TCP: { text: 'Modbus TCP' },
        OPC_UA: { text: 'OPC UA' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        0: { text: '禁用', status: 'Default' },
        1: { text: '启用', status: 'Success' },
      },
    },
    {
      title: '引用点位数',
      dataIndex: 'pointCount',
      width: 110,
      hideInSearch: true,
      render: (_, record) => <Tag color="blue">{record.pointCount ?? 0}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <a key="edit" onClick={() => openEdit(record)}>
            编辑
          </a>
          <a key="test" onClick={() => handleTest(record)}>
            测试连接
          </a>
          <a key="delete" style={{ color: '#ff4d4f' }} onClick={() => handleDelete(record)}>
            删除
          </a>
        </Space>
      ),
    },
  ];

  const initialValues: any = editing
    ? {
        ...editing,
        status: editing.status === 1,
        httpConfig: { ...DEFAULT_HTTP_CONFIG, ...(editing.httpConfig || {}) },
        modbusConfig: {
          ...DEFAULT_MODBUS_CONFIG,
          ...(editing.modbusConfig || {}),
        },
        opcUaConfig: { ...DEFAULT_OPCUA_CONFIG, ...(editing.opcUaConfig || {}) },
      }
    : {
        protocol: 'HTTP',
        status: true,
        httpConfig: DEFAULT_HTTP_CONFIG,
        modbusConfig: DEFAULT_MODBUS_CONFIG,
        opcUaConfig: DEFAULT_OPCUA_CONFIG,
      };

  return (
    <PageContainer>
      <ProTable<CollectorSource>
        headerTitle="采集数据源"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 110 }}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ['10', '20', '50'],
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={openAdd}>
            新增数据源
          </Button>,
        ]}
        request={async (params) => {
          const res = await listCollectorSourceByPage({
            current: params.current,
            pageSize: params.pageSize,
            sourceCode: params.sourceCode,
            sourceName: params.sourceName,
            protocol: params.protocol,
            status: params.status,
          });
          return {
            data: res.data?.records || [],
            success: res.code === 0,
            total: res.data?.total || 0,
          };
        }}
        columns={columns}
      />

      <ModalForm
        title={editing ? '编辑采集数据源' : '新增采集数据源'}
        open={visible}
        width={720}
        modalProps={{ destroyOnClose: true }}
        initialValues={initialValues}
        onOpenChange={(open) => {
          setVisible(open);
          if (!open) {
            setEditing(undefined);
          }
        }}
        onFinish={async (values: any) => {
          const payload: CollectorSource = {
            ...values,
            id: editing?.id,
            status: values.status ? 1 : 0,
          };
          const res = editing?.id
            ? await updateCollectorSource(payload)
            : await addCollectorSource(payload);
          if (res.code === 0) {
            message.success('保存成功');
            setVisible(false);
            setEditing(undefined);
            actionRef.current?.reload();
            return true;
          }
          message.error(res.message || '保存失败');
          return false;
        }}
      >
        <ProFormText
          name="sourceCode"
          label="数据源编码"
          rules={[{ required: true, message: '请输入数据源编码' }]}
          disabled={!!editing}
          placeholder="如 PLC_LINE_01"
        />
        <ProFormText
          name="sourceName"
          label="数据源名称"
          rules={[{ required: true, message: '请输入数据源名称' }]}
        />
        <ProFormSelect
          name="protocol"
          label="协议"
          options={PROTOCOL_OPTIONS}
          rules={[{ required: true, message: '请选择协议' }]}
          disabled={!!editing}
        />
        <ProFormSwitch name="status" label="启用" />
        <ProFormTextArea name="remark" label="备注" />

        <ProFormDependency name={['protocol']}>
          {({ protocol }) => {
            if (protocol === 'HTTP') {
              return (
                <>
                  <ProFormText
                    name={['httpConfig', 'baseUrl']}
                    label="采集地址"
                    rules={[{ required: true, message: '请输入采集地址' }]}
                    placeholder="http://127.0.0.1:8107/api/kafka/dataQuery/queryCollectData"
                  />
                  <ProFormText
                    name={['httpConfig', 'validUrl']}
                    label="校验地址"
                    placeholder="可选，留空则使用采集地址"
                  />
                  <ProFormSelect
                    name={['httpConfig', 'method']}
                    label="请求方法"
                    options={['POST', 'GET', 'PUT']}
                  />
                  <ProFormText
                    name={['httpConfig', 'contentType']}
                    label="Content-Type"
                  />
                  <ProFormTextArea
                    name={['httpConfig', 'requestTemplate']}
                    label="请求体模板"
                    tooltip="支持 ${pointCode} 与 ${collectTime} 占位符"
                  />
                  <ProFormText
                    name={['httpConfig', 'responseDataPath']}
                    label="响应数据路径"
                    tooltip="点号分隔，如 data 或 data.result"
                  />
                  <ProFormText name={['httpConfig', 'valueField']} label="值字段名" />
                  <ProFormText
                    name={['httpConfig', 'attributeNameField']}
                    label="属性名字段名"
                  />
                  <ProFormDigit
                    name={['httpConfig', 'timeoutMillis']}
                    label="超时(ms)"
                    min={1000}
                  />
                  <ProFormTextArea
                    name={['httpConfig', 'headers']}
                    label="附加请求头"
                    tooltip='JSON 对象，如 {"Authorization":"Bearer xxx"}'
                  />
                </>
              );
            }
            if (protocol === 'MODBUS_TCP') {
              return (
                <>
                  <ProFormText
                    name={['modbusConfig', 'host']}
                    label="从站地址"
                    rules={[{ required: true, message: '请输入从站地址' }]}
                    placeholder="127.0.0.1"
                  />
                  <ProFormDigit
                    name={['modbusConfig', 'port']}
                    label="端口"
                    min={1}
                    max={65535}
                  />
                  <ProFormDigit
                    name={['modbusConfig', 'slaveId']}
                    label="从站ID"
                    min={0}
                    max={255}
                  />
                  <ProFormDigit
                    name={['modbusConfig', 'connectTimeoutMillis']}
                    label="连接超时(ms)"
                    min={1000}
                  />
                  <ProFormDigit
                    name={['modbusConfig', 'readTimeoutMillis']}
                    label="读取超时(ms)"
                    min={1000}
                  />
                </>
              );
            }
            if (protocol === 'OPC_UA') {
              return (
                <>
                  <ProFormText
                    name={['opcUaConfig', 'endpointUrl']}
                    label="Endpoint地址"
                    rules={[{ required: true, message: '请输入Endpoint地址' }]}
                    placeholder="opc.tcp://127.0.0.1:4840"
                  />
                  <ProFormText
                    name={['opcUaConfig', 'securityPolicy']}
                    label="安全策略"
                    placeholder="None"
                  />
                  <ProFormText
                    name={['opcUaConfig', 'username']}
                    label="用户名"
                    placeholder="可选，留空为匿名登录"
                  />
                  <ProFormText.Password
                    name={['opcUaConfig', 'password']}
                    label="密码"
                  />
                  <ProFormDigit
                    name={['opcUaConfig', 'requestTimeoutMillis']}
                    label="请求超时(ms)"
                    min={1000}
                  />
                </>
              );
            }
            return null;
          }}
        </ProFormDependency>
      </ModalForm>
    </PageContainer>
  );
};

export default CollectorSourcePage;
