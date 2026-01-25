// src/pages/admin/user-manage/index.tsx
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Image } from 'antd';
import React, { useRef, useState } from 'react';
import type { User, UserAddRequest, UserUpdateRequest } from './data';
import { addUser, deleteUser, listUserByPage, updateUser, syncUserToEs } from './service';

/**
 * 添加用户
 */
const handleAdd = async (fields: UserAddRequest) => {
  const hide = message.loading('正在添加');
  try {
    const res = await addUser({ ...fields });
    hide();
    if (res.code === 0) {
      message.success('添加成功');
      return true;
    } else {
      message.error(res.message);
      return false;
    }
  } catch (error) {
    hide();
    message.error('添加失败，请重试');
    return false;
  }
};

/**
 * 更新用户
 */
const handleUpdate = async (fields: UserUpdateRequest) => {
  const hide = message.loading('正在更新');
  try {
    const res = await updateUser({ ...fields });
    hide();
    if (res.code === 0) {
      message.success('更新成功');
      return true;
    } else {
      message.error(res.message);
      return false;
    }
  } catch (error) {
    hide();
    message.error('更新失败，请重试');
    return false;
  }
};

/**
 * 删除用户
 */
const handleDelete = async (record: User) => {
  const hide = message.loading('正在删除');
  try {
    const res = await deleteUser({ id: record.id });
    hide();
    if (res.code === 0) {
      message.success('删除成功');
      return true;
    } else {
      message.error(res.message);
      return false;
    }
  } catch (error) {
    hide();
    message.error('删除失败，请重试');
    return false;
  }
};

/**
 * 同步用户到 ES
 */
const handleSyncToEs = async (record: User) => {
  const hide = message.loading('正在同步到ES');
  try {
    // 将 User 对象转换为符合 UserEsDTO 格式的数据
    const userEsData = {
      id: record.id,
      userAccount: record.userAccount,
      userName: record.userName,
      userProfile: record.userProfile,
      userRole: record.userRole,
      createTime: record.createTime,
      updateTime: record.updateTime,
      isDelete: record.isDelete || 0,
    };
    
    const res = await syncUserToEs(userEsData);
    hide();
    if (res.code === 0) {
      message.success('同步到ES成功');
      return true;
    } else {
      message.error(res.message);
      return false;
    }
  } catch (error) {
    hide();
    message.error('同步到ES失败，请重试');
    return false;
  }
};

const UserManagePage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<User>();

  const columns: ProColumns<User>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'indexBorder',
      width: 48,
    },
    {
      title: '账号',
      dataIndex: 'userAccount',
      copyable: true,
    },
    {
      title: '用户名',
      dataIndex: 'userName',
      copyable: true,
    },
    {
      title: '头像',
      dataIndex: 'userAvatar',
      render: (_, record) => (
        <div>
          {record.userAvatar ? (
            <Image src={record.userAvatar} width={50} height={50} />
          ) : (
            '无'
          )}
        </div>
      ),
      hideInSearch: true,
    },
    {
      title: '简介',
      dataIndex: 'userProfile',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      valueEnum: {
        user: { text: '普通用户', status: 'Default' },
        admin: { text: '管理员', status: 'Success' },
        ban: { text: '被封禁', status: 'Error' },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="config"
          onClick={() => {
            setCurrentRow(record);
            setUpdateModalVisible(true);
          }}
        >
          修改
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={async () => {
            const success = await handleDelete(record);
            if (success) {
              if (actionRef.current) {
                actionRef.current.reload();
              }
            }
          }}
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
        <a
          key="sync"
          onClick={async () => {
            await handleSyncToEs(record);
          }}
        >
          同步到ES
        </a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<User>
        headerTitle="用户表格"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCreateModalVisible(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          const sortField = Object.keys(sort)?.[0];
          const sortOrder = sort?.[sortField] ?? undefined;

          const res = await listUserByPage({
            ...params,
            sortField,
            sortOrder,
            ...filter,
          } as any); // 类型断言，解决 params 类型不完全匹配的问题

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

      <ModalForm
        title="新建用户"
        width="400px"
        visible={createModalVisible}
        onVisibleChange={setCreateModalVisible}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          const success = await handleAdd(value as UserAddRequest);
          if (success) {
            setCreateModalVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
        <ProFormText
          rules={[
            {
              required: true,
              message: '账号为必填项',
            },
          ]}
          width="md"
          name="userAccount"
          label="账号"
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '用户名为必填项',
            },
          ]}
          width="md"
          name="userName"
          label="用户名"
        />
        <ProFormSelect
          options={[
            {
              value: 'user',
              label: '普通用户',
            },
            {
              value: 'admin',
              label: '管理员',
            },
            {
              value: 'ban',
              label: '被封禁',
            },
          ]}
          width="md"
          name="userRole"
          label="角色"
          initialValue="user"
        />
        <ProFormTextArea width="md" name="userProfile" label="简介" />
        <ProFormText width="md" name="userAvatar" label="头像URL" />
      </ModalForm>

      <ModalForm
        title="修改用户"
        width="400px"
        visible={updateModalVisible}
        onVisibleChange={setUpdateModalVisible}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          const success = await handleUpdate({
            ...value,
            id: currentRow?.id,
          } as UserUpdateRequest);
          if (success) {
            setUpdateModalVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
        <ProFormText
          width="md"
          name="userName"
          label="用户名"
        />
        <ProFormSelect
          options={[
            {
              value: 'user',
              label: '普通用户',
            },
            {
              value: 'admin',
              label: '管理员',
            },
            {
              value: 'ban',
              label: '被封禁',
            },
          ]}
          width="md"
          name="userRole"
          label="角色"
        />
        <ProFormTextArea width="md" name="userProfile" label="简介" />
        <ProFormText width="md" name="userAvatar" label="头像URL" />
      </ModalForm>
    </PageContainer>
  );
};

export default UserManagePage;
