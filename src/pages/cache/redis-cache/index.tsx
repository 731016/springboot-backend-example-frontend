// src/pages/cache/redis-cache/index.tsx
import {PlusOutlined, ReloadOutlined, StopOutlined, SearchOutlined} from '@ant-design/icons';
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
import {Button, Drawer, Form, Input, message, Space} from 'antd';
import React, {useRef, useState} from 'react';
import type {
  CodeDictionary,
  CodeDictionaryCreateParams,
  CodeDictionaryListParams,
  TableListPagination,
} from './data';
import {
  addCodeDictionary,
  clearCache,
  loadCache,
  queryByType,
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

  const sourceTypeEnum = {
    'db': {text: '数据库', status: 'Success'},
    'redis': {text: '缓存', status: 'Processing'}
  };

  const columns: ProColumns<CodeDictionary>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
      valueType: 'indexBorder',
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      valueType: 'select',
      search: false,
      valueEnum: sourceTypeEnum
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
      valueType: 'indexBorder',
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      valueType: 'select',
      valueEnum: sourceTypeEnum
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
              icon={<ReloadOutlined/>}
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
              icon={<StopOutlined/>}
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
              icon={<PlusOutlined/>}
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
          const res = await queryByType(params);
          const list = res.data || [];
          return {
            data: list,
            success: res.code === 0,
            total: list.length,
          };
        }}
        columns={columns}
      />

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
            {required: true, message: '请输入类型'},
          ]}
        />
        <ProFormText
          name="code"
          label="编码"
          rules={[
            {required: true, message: '请输入编码'},
          ]}
        />
        <ProFormText
          name="name"
          label="名称"
          rules={[
            {required: true, message: '请输入名称'},
          ]}
        />
        <ProFormText name="attr1" label="扩展属性1"/>
        <ProFormText name="attr2" label="扩展属性2"/>
        <ProFormText name="attr3" label="扩展属性3"/>
        <ProFormText name="attr4" label="扩展属性4"/>
        <ProFormText name="attr5" label="扩展属性5"/>
        <ProFormText name="attr6" label="扩展属性6"/>
        <ProFormText name="attr7" label="扩展属性7"/>
        <ProFormText name="attr8" label="扩展属性8"/>
        <ProFormText name="attr9" label="扩展属性9"/>
        <ProFormText name="attr10" label="扩展属性10"/>
        <ProFormText name="attr11" label="扩展属性11"/>
        <ProFormText name="attr12" label="扩展属性12"/>
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
