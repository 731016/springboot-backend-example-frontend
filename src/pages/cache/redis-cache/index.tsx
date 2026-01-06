// src/pages/cache/redis-cache/index.tsx
import { PlusOutlined, ReloadOutlined, StopOutlined, SearchOutlined } from '@ant-design/icons';
import type {
  ActionType,
  ProColumns,
  ProDescriptionsItemProps,
} from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProDescriptions,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, message, Space } from 'antd';
import React, { useRef, useState } from 'react';
import type {
  CodeDictionary,
  CodeDictionaryCreateParams,
  CodeDictionaryKeyQuery,
  CodeDictionaryListParams,
  TableListPagination,
} from './data';
import {
  addCodeDictionary,
  clearCache,
  loadCache,
  queryByType,
  queryByTypeAndCode,
} from './service';

/**
 * 新增字典项
 */
const handleAdd = async (fields: CodeDictionaryCreateParams) => {
  const hide = message.loading('正在新增字典项');
  try {
    const res = await addCodeDictionary(fields);
    hide();
    if (res.code === 0) {
      message.success(res.message || '新增成功');
      return true;
    }
    message.error(res.message || '新增失败');
    return false;
  } catch (error) {
    hide();
    message.error('新增失败，请稍后重试');
    return false;
  }
};

/**
 * 加载缓存
 */
const handleLoadCache = async () => {
  const hide = message.loading('正在加载缓存');
  try {
    const res = await loadCache();
    hide();
    if (res.code === 0) {
      message.success(res.message || '加载缓存成功');
      return true;
    }
    message.error(res.message || '加载缓存失败');
    return false;
  } catch (error) {
    hide();
    message.error('加载缓存失败，请稍后重试');
    return false;
  }
};

/**
 * 清除缓存
 */
const handleClearCache = async () => {
  const hide = message.loading('正在清除缓存');
  try {
    const res = await clearCache();
    hide();
    if (res.code === 0) {
      message.success(res.message || '清除缓存成功');
      return true;
    }
    message.error(res.message || '清除缓存失败');
    return false;
  } catch (error) {
    hide();
    message.error('清除缓存失败，请稍后重试');
    return false;
  }
};

const RedisCachePage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<CodeDictionary>();
  const [singleQueryForm] = Form.useForm<CodeDictionaryKeyQuery>();

  const columns: ProColumns<CodeDictionary>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
    },
    {
      title: '编码',
      dataIndex: 'code',
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '扩展属性1',
      dataIndex: 'attr1',
      ellipsis: true,
      search: false,
    },
    {
      title: '扩展属性2',
      dataIndex: 'attr2',
      ellipsis: true,
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="detail"
          onClick={() => {
            setCurrentRow(record);
            setShowDetail(true);
          }}
        >
          详情
        </a>,
      ],
    },
  ];

  const descriptionsColumns: ProDescriptionsItemProps<CodeDictionary>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: '类型',
      dataIndex: 'type',
    },
    {
      title: '编码',
      dataIndex: 'code',
    },
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '扩展属性1',
      dataIndex: 'attr1',
    },
    {
      title: '扩展属性2',
      dataIndex: 'attr2',
    },
    {
      title: '扩展属性3',
      dataIndex: 'attr3',
    },
    {
      title: '扩展属性4',
      dataIndex: 'attr4',
    },
    {
      title: '扩展属性5',
      dataIndex: 'attr5',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
    },
  ];

  /**
   * 单条查询（根据 type + code）
   */
  const handleSingleQuery = async () => {
    try {
      const values = await singleQueryForm.validateFields();
      const hide = message.loading('正在查询单条记录');
      const res = await queryByTypeAndCode(values);
      hide();
      if (res.code === 0 && res.data) {
        setCurrentRow(res.data);
        setShowDetail(true);
      } else {
        message.warning(res.message || '未查询到数据');
      }
    } catch (error) {
      // 校验失败或请求异常
    }
  };

  return (
    <PageContainer>
      <ProTable<CodeDictionary, CodeDictionaryListParams & TableListPagination>
        headerTitle="Redis 缓存字典列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 80,
        }}
        toolBarRender={() => [
          <Space key="toolbar">
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                const success = await handleLoadCache();
                if (success) {
                  actionRef.current?.reload();
                }
              }}
            >
              加载缓存
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={async () => {
                const success = await handleClearCache();
                if (success) {
                  actionRef.current?.reload();
                }
              }}
            >
              清除缓存
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCreateModalVisible(true);
              }}
            >
              新增字典项
            </Button>
          </Space>,
        ]}
        request={async (params) => {
          // ProTable 的分页参数暂时只在前端使用，后端当前接口返回全量列表
          const { type } = params;
          const res = await queryByType({ type });
          const list = res.data || [];
          return {
            data: list,
            success: res.code === 0,
            total: list.length,
          };
        }}
        columns={columns}
      />

      {/* 单条查询区域，可以放在表格下方，也可以放在 PageContainer 的 extra 中 */}
      {/*<Form*/}
      {/*  form={singleQueryForm}*/}
      {/*  layout="inline"*/}
      {/*  style={{ marginTop: 16, marginBottom: 16 }}*/}
      {/*>*/}
      {/*  <Form.Item*/}
      {/*    label="类型"*/}
      {/*    name="type"*/}
      {/*    rules={[{ required: true, message: '请输入类型' }]}*/}
      {/*  >*/}
      {/*    <Input placeholder="例如：USER" style={{ width: 200 }} />*/}
      {/*  </Form.Item>*/}
      {/*  <Form.Item*/}
      {/*    label="编码"*/}
      {/*    name="code"*/}
      {/*    rules={[{ required: true, message: '请输入编码' }]}*/}
      {/*  >*/}
      {/*    <Input placeholder="例如：TUAOFEI" style={{ width: 200 }} />*/}
      {/*  </Form.Item>*/}
      {/*  <Form.Item>*/}
      {/*    <Button type="primary" icon={<SearchOutlined />} onClick={handleSingleQuery}>*/}
      {/*      查询单条*/}
      {/*    </Button>*/}
      {/*  </Form.Item>*/}
      {/*</Form>*/}

      {/* 新增字典项弹窗 */}
      <ModalForm<CodeDictionaryCreateParams>
        title="新增字典项"
        width={520}
        open={createModalVisible}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setCreateModalVisible(false),
        }}
        onOpenChange={setCreateModalVisible}
        onFinish={async (value) => {
          const success = await handleAdd(value);
          if (success) {
            setCreateModalVisible(false);
            actionRef.current?.reload();
          }
          return success;
        }}
      >
        <ProFormText
          name="type"
          label="类型"
          rules={[
            { required: true, message: '请输入类型' },
          ]}
        />
        <ProFormText
          name="code"
          label="编码"
          rules={[
            { required: true, message: '请输入编码' },
          ]}
        />
        <ProFormText
          name="name"
          label="名称"
          rules={[
            { required: true, message: '请输入名称' },
          ]}
        />
        <ProFormText name="attr1" label="扩展属性1" />
        <ProFormText name="attr2" label="扩展属性2" />
        <ProFormText name="attr3" label="扩展属性3" />
        <ProFormText name="attr4" label="扩展属性4" />
      </ModalForm>

      {/* 详情抽屉 */}
      <Drawer
        width={600}
        open={showDetail}
        onClose={() => {
          setCurrentRow(undefined);
          setShowDetail(false);
        }}
        closable
      >
        {currentRow && (
          <ProDescriptions<CodeDictionary>
            column={1}
            title="字典详情"
            request={async () => ({
              data: currentRow,
            })}
            columns={descriptionsColumns}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default RedisCachePage;
