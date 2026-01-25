// src/pages/admin/user-search/index.tsx
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { message } from 'antd';
import React, { useRef } from 'react';
import type { UserEs } from './data';
import { searchUser } from './service';

const UserSearchPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const columns: ProColumns<UserEs>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'indexBorder',
      width: 48,
      hideInSearch: true,
    },
    {
      title: '搜索关键词',
      dataIndex: 'searchText',
      valueType: 'text',
      hideInTable: true,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '请输入搜索关键词',
          },
        ],
      },
      fieldProps: {
        placeholder: '请输入用户名或简介进行搜索',
      },
    },
    {
      title: '账号',
      dataIndex: 'userAccount',
      copyable: true,
      hideInSearch: true,
      render: (_, record) => {
        // 如果有高亮字段，使用高亮字段，否则使用原字段
        const text = record.highlightUserAccount || record.userAccount;
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
      },
    },
    {
      title: '用户名',
      dataIndex: 'userName',
      copyable: true,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        // 如果有高亮字段，使用高亮字段，否则使用原字段
        const text = record.highlightUserName || record.userName || '';
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
      },
    },
    {
      title: '简介',
      dataIndex: 'userProfile',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        // 如果有高亮字段，使用高亮字段，否则使用原字段
        const text = record.highlightUserProfile || record.userProfile || '';
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
      },
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      valueEnum: {
        user: { text: '普通用户', status: 'Default' },
        admin: { text: '管理员', status: 'Success' },
        ban: { text: '被封禁', status: 'Error' },
      },
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: false,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: false,
    },
  ];

  return (
    <PageContainer>
      <ProTable<UserEs>
        headerTitle="用户搜索（Elasticsearch）"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
          searchText: '搜索',
          resetText: '重置',
        }}
        request={async (params) => {
          try {
            const searchText = params.searchText as string | undefined;
            
            // 如果没有搜索关键词，提示用户输入
            if (!searchText || searchText.trim() === '') {
              return {
                data: [],
                success: true,
                total: 0,
              };
            }

            const res = await searchUser({
              current: params.current ? params.current - 1 : 0, // 后端从0开始
              pageSize: params.pageSize || 10,
              searchText: searchText.trim(),
            });

            if (res.code === 0) {
              // 注意：后端返回的是 List，不包含总数
              // 如果返回的数据量等于 pageSize，可能还有更多数据
              const data = res.data || [];
              const pageSize = params.pageSize || 10;
              const current = params.current || 1;
              const hasMore = data.length === pageSize;

              // 计算总数：如果还有更多数据，使用估算值；否则使用实际总数
              let total: number;
              if (hasMore) {
                // 如果还有更多数据，估算总数（当前页数 * 每页数量 + 1，表示至少还有一页）
                // 这样可以让分页器继续显示"下一页"按钮
                total = current * pageSize + 1;
              } else {
                // 如果没有更多数据（返回的数据少于 pageSize），说明这是最后一页
                // 计算实际总数：前面所有页的数据 + 当前页的数据
                total = (current - 1) * pageSize + data.length;
              }

              return {
                data: data,
                success: true,
                total: total,
              };
            } else {
              message.error(res.message || '搜索失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          } catch (error: any) {
            message.error(error.message || '搜索失败，请重试');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        toolBarRender={false}
        options={{
          reload: true,
          density: true,
          fullScreen: true,
        }}
      />
    </PageContainer>
  );
};

export default UserSearchPage;
