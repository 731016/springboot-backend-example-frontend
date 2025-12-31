import {ArrowLeftOutlined, CopyOutlined, PlusOutlined} from '@ant-design/icons';
import type {ActionType, ProColumns, ProDescriptionsItemProps,} from '@ant-design/pro-components';
import {PageContainer, ProDescriptions, ProTable,} from '@ant-design/pro-components';
import {Breadcrumb, Button, Drawer, Input, message, Popconfirm, Tabs, Tag, Tooltip} from 'antd';
import React, {useRef, useState} from 'react';
import type {FileTableListItem, FileTableListPagination} from '../data';
import {
  deleteLocalUserAvatar,
  deleteRemoteUserAvatar,
  downloadUserAvatar,
  listAllUserAvatarByRemote, listCurrentDirLocalUserAvatar,
  queryCurrentRemoteUserAvatarTags,
} from '../service';
import {DIR} from '../constants';
import {history} from 'umi';

const FilePath: React.FC<{
  dirPath: string;
  onJump: (index: number) => void;
  onBack: () => void;
}> = ({dirPath, onJump, onBack}) => (
  <Breadcrumb style={{marginBottom: 16}}>
<Breadcrumb.Item onClick={() => onJump(-1)} style={{cursor: 'pointer'}}>
根目录
</Breadcrumb.Item>
{dirPath.split('/').filter(Boolean).map((name, i) => (
  <Breadcrumb.Item key={i} onClick={() => onJump(i)} style={{cursor: 'pointer'}}>
  {name}
  </Breadcrumb.Item>
))}
{dirPath && (
  <Button size="small" type="link" onClick={onBack} style={{marginLeft: 8}}>
  <ArrowLeftOutlined/> 返回上级
  </Button>
)}
</Breadcrumb>
);


const Manage: React.FC = () => {
  /** 新建窗口的弹窗 */
  const [createModalVisible, handleModalVisible] = useState<boolean>(false);
  /** 分布更新窗口的弹窗 */

  const [updateModalVisible, handleUpdateModalVisible] =
    useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const actionRef = useRef<ActionType>(null);
  /**
   * 记录当前游标
   */
  const [cursorRef, setCursorRef] = useState<string>('');
  /**
   * 下一页有游标
   */
  const [nextCursorRef, setNextCursorRef] = useState<string>('');
  /**
   * 游标栈：每一页起始游标
   */
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  /**
   * 是否还有下一页
   */
  const [hasNext, setHasNext] = useState<boolean>(true);
  /**
   * 初始根目录
   */
  const [dirPath, setDirPath] = useState<string>('');
  const [currentRow, setCurrentRow] = useState<FileTableListItem>();
  const [selectedRowsState, setSelectedRows] = useState<FileTableListItem[]>([]);
  /** 国际化配置 */

  const columns: ProColumns<FileTableListItem>[] = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      valueType: 'text',
      renderFormItem: (_, {fieldProps}) => (
        <Input
          {...fieldProps}
      placeholder="文件名前缀搜索"
      />
),
  render: (dom, entity) => {
    if (entity.fileType === DIR) {
      return (
        <a
          onClick={() => {
        setCurrentRow(entity);
        // 2. 如果是“文件夹”就往下钻
        if (entity.fileType === DIR) {
          setCursorRef('') // 新目录 reset 游标
          setNextCursorRef('')
          setCursorStack([])
          setHasNext(true);
          setDirPath(entity.key); // 关键：换目录
          actionRef.current?.reload(); // 立即触发 request
        }
      }}
    >
      {dom}
      </a>
    )
    } else {
      return (
        <>
          <a
            onClick={async () => {
        //查询key的tags
        const {data} = await queryCurrentRemoteUserAvatarTags({
          key: entity.key
        });
        entity.tags = data.tags;
        setCurrentRow(entity);
        setShowDetail(true);
      }}
    >
      {dom}
      </a>
      <Tooltip placement="top" title="复制文件链接">
      <CopyOutlined style={{marginLeft: 8}} onClick={
        async () => {
        const url = entity.userAvatar; // 你的文件访问地址
        try {
          await navigator.clipboard.writeText(url);
          message.success('文件链接已复制到剪贴板');
        } catch (e) {
          message.error('复制失败，请手动复制');
        }
      }}></CopyOutlined>
      </Tooltip>
      </>
    );
    }
  },
},
  {
    title: '文件路径',
      dataIndex: 'path',
    valueType: 'text',
    hideInForm: true,
    hideInSearch: true,
  },
  {
    title: '头像',
      dataIndex: 'userAvatar',
    key: 'userAvatar',
    valueType: 'image',
    hideInSearch: true
  },
  {
    title: '实体标签',
      tip: '对象的实体标签（Entity Tag），是对象被创建时标识对象内容的信息标签，可用于检查对象的内容是否发生变化。例如“8e0b617ca298a564c3331da28dcb50df”，此头部并不一定返回对象的 MD5值，而是根据对象上传和加密方式而有所不同。',
    dataIndex: 'etag',
    valueType: 'text',
    hideInForm: true,
    hideInSearch: true,
  },
  {
    title: '标签',
      dataIndex: 'tags',
    hidden: true,
    hideInSearch: true,          // 需要搜索就打开
    // 表格单元格渲染
    render: (_, record) =>
    record.tags?.length ? (
      <>
        {record.tags.map((t) => (
            <Tag color="geekblue" key={t.key}>{`${t.value}`}</Tag>
    ))}
    </>
  ) : (
    <span style={{color: '#bfbfbf'}}>无</span>
  ),
  },
  {
    title: '文件大小',
      dataIndex: 'fileSize',
    sorter: true,
    hideInForm: true,
    hideInSearch: true,
    renderText: (val: string) => {
    if (val) {
      return `${val}KB`
    }
    return ''
  },
  },
  {
    title: '文件类型',
      dataIndex: 'storageClasses',
    hideInForm: true,
    hideInSearch: true,
    valueEnum: {
    'STANDARD': {
      text: '标准存储',
        status: 'Success',
    },
    'STANDARD_IA': {
      text: '低频存储',
        status: 'Success',
    },
    'ARCHIVE': {
      text: '归档存储',
        status: 'Success',
    },
    'DEEP_ARCHIVE': {
      text: '深度归档存储',
        status: 'Success',
    },
    'MAZ_STANDARD': {
      text: '标准存储（多 AZ）',
        status: 'Success',
    },
    'MAZ_STANDARD_IA': {
      text: '低频存储（多 AZ）',
        status: 'Success',
    },
    'MAZ_ARCHIVE': {
      text: '归档存储（多 AZ）',
        status: 'Success',
    },
    'MAZ_INTELLIGENT_TIERING': {
      text: '智能分层存储（多 AZ）',
        status: 'Success',
    },
    'INTELLIGENT_TIERING': {
      text: '智能分层存储',
        status: 'Success',
    },
  },
  },
  {
    title: '修改时间',
      sorter: true,
    dataIndex: 'lastModified',
    valueType: 'dateTime',
    hideInForm: true,
    hideInSearch: true,
  },
  {
    title: '操作',
      dataIndex: 'option',
    valueType: 'option',
    render: (_, record) => {
    // 文件夹不显示任何操作
    if (record.fileType === DIR) return [];

    return [
      <a
        key="down"
      onClick={() => {
      setCurrentRow(record);
      handleDown(record);
    }}
  >
    下载
    </a>,

    <Popconfirm
    key="delete"
    title="确定要删除该文件吗？"
    okText="确定"
    cancelText="取消"
    onConfirm={async () => {
      await handleRemove(record);
    }}
  >
    <a style={{color: '#ff4d4f'}}>删除</a>
    </Popconfirm>,
  ];
  }
  },
];

  const localColumns: ProColumns<FileTableListItem>[] = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      valueType: 'text',
      hideInForm: true,
      hideInSearch: true,
      render: (dom, entity) => {
        if (entity.fileType === DIR) {
          return (
            <a
              onClick={() => {
            setCurrentRow(entity);
            // 2. 如果是“文件夹”就往下钻
            if (entity.fileType === DIR) {
              setCursorRef('') // 新目录 reset 游标
              setNextCursorRef('')
              setCursorStack([])
              setHasNext(true);
              setDirPath(entity.key); // 关键：换目录
              actionRef.current?.reload(); // 立即触发 request
            }
          }}
        >
          {dom}
          </a>
        )
        } else {
          return (
            <>
              <a
                onClick={async () => {
            setCurrentRow(entity);
            setShowDetail(true);
          }}
        >
          {dom}
          </a>
          <Tooltip placement="top" title="复制文件链接">
          <CopyOutlined style={{marginLeft: 8}} onClick={
            async () => {
            const url = entity.name; // 你的文件访问地址
            try {
              await navigator.clipboard.writeText(url);
              message.success('文件链接已复制到剪贴板');
            } catch (e) {
              message.error('复制失败，请手动复制');
            }
          }}></CopyOutlined>
          </Tooltip>
          </>
        );
        }
      },
    },
    {
      title: '文件路径',
      dataIndex: 'path',
      valueType: 'text',
      hideInForm: true,
      hideInSearch: true,
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      sorter: true,
      hideInForm: true,
      hideInSearch: true,
      renderText: (val: string) => {
        if (val) {
          return `${val}KB`
        }
        return ''
      },
    },
    {
      title: '修改时间',
      sorter: true,
      dataIndex: 'lastModified',
      valueType: 'dateTime',
      hideInForm: true,
      hideInSearch: true,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => {
        // 文件夹不显示任何操作
        if (record.fileType === DIR) return [];

        return [
          <a
            key="down"
          onClick={() => {
          setCurrentRow(record);
          handleLocalDown(record);
        }}
      >
        下载
        </a>,

        <Popconfirm
        key="delete"
        title="确定要删除该文件吗？"
        okText="确定"
        cancelText="取消"
        onConfirm={async () => {
          await handleLocalRemove(record);
        }}
      >
        <a style={{color: '#ff4d4f'}}>删除</a>
        </Popconfirm>,
      ];
      }
    },
  ];

  const firstPage = () => {
    setCursorStack([]);
    setCursorRef('');
    setNextCursorRef('');
    actionRef.current?.reload();
  };

  const prevPage = () => {
    //获取栈最后一个元素，这个是在下一页时存储的那个页的当前页游标
    const prevCursor = cursorStack[cursorStack.length - 1];
    //删除栈的最后一个元素，
    setCursorStack((s) => s.slice(0, -1));
    setCursorRef(prevCursor);
    actionRef.current?.reload();
  };

  const nextPage = () => {
    //把当前页的游标入栈
    setCursorStack((s) => [...s, cursorRef]);
    //使用下一页的游标去查询下一页
    setCursorRef(nextCursorRef);
    actionRef.current?.reload();
  };

  /**
   * 删除节点
   *
   * @param selectedRows
   */

  const handleRemove = async (selectedRow: FileTableListItem) => {
    const hide = message.loading('正在删除');
    if (!selectedRow) return true;

    try {
      await deleteRemoteUserAvatar({
        key: selectedRow.key
      });
      hide();
      message.success('删除成功，即将刷新');
      setTimeout(() => {
        actionRef.current.reload();
      }, 500)
      return true;
    } catch (_error) {
      hide();
      message.error('删除失败，请重试');
      return false;
    }
  };

  const handleLocalRemove = async (selectedRow: FileTableListItem) => {
    const hide = message.loading('正在删除');
    if (!selectedRow) return true;

    try {
      await deleteLocalUserAvatar({
        key: selectedRow.key
      });
      hide();
      message.success('删除成功，即将刷新');
      setTimeout(() => {
        actionRef.current.reload();
      }, 500)
      return true;
    } catch (_error) {
      hide();
      message.error('删除失败，请重试');
      return false;
    }
  };

  /**
   * 下载文件
   * @param selectedRow
   */
  const handleDown = async (selectedRow) => {
    const hide = message.loading('正在下载');
    if (!selectedRow) return true;
    try {
      await downloadUserAvatar({
        reqUrl: '/api/file/downloadRemoteUserAvatar',
        fileKey: selectedRow.key, fileName: selectedRow.name
      });
      hide();
      return true;
    } catch (_error) {
      hide();
      message.error('下载失败，请重试');
      return false;
    }
  }

  const handleLocalDown = async (selectedRow) => {
    const hide = message.loading('正在下载');
    if (!selectedRow) return true;
    try {
      await downloadUserAvatar({
        reqUrl: '/api/file/downloadLocalUserAvatar',
        fileKey: selectedRow.key, fileName: selectedRow.name
      });
      hide();
      return true;
    } catch (_error) {
      hide();
      message.error('下载失败，请重试');
      return false;
    }
  }

  const items = [
  {
    key: 'local', label: '本地文件', children: (
    <>
      <FilePath
        dirPath={dirPath}
    onJump={(idx) => {
    const arr = dirPath.split('/').filter(Boolean);
    const newDir = idx === -1 ? '' : arr.slice(0, idx + 1).join('/') + '/';
    setDirPath(newDir);
    setCursorRef('')
    setNextCursorRef('')
    setCursorStack([])
    setHasNext(true);
    actionRef.current?.reload();
  }}
    onBack={() => {
    const arr = dirPath.split('/').filter(Boolean);
    arr.pop();
    const newDir = arr.length ? arr.join('/') + '/' : '';
    setDirPath(newDir);
    setCursorRef('')
    setNextCursorRef('')
    actionRef.current?.reload();
  }}
    />
    <ProTable<FileTableListItem, FileTableListPagination>
    headerTitle="本地存储文件"
    actionRef={actionRef}
    rowKey="key"
    search={{
    labelWidth: 120,
  }}
    toolBarRender={() => [
    <Button
      type="primary"
    key="primary"
    onClick={() => {
    history.push('/file/file-local-upload')
  }}
  >
    <PlusOutlined/> 新建
    </Button>,
  ]}
    request={async ({pageSize = 20, name}, sort, filter) => {
    let queryDirPath = dirPath
    if (name) {
      queryDirPath += name
    }
    // 调接口
    const {data} = await listCurrentDirLocalUserAvatar({
      preFix: queryDirPath,
      maxKeys: pageSize,
      nextMarker: cursorRef,
    });


    // 保存游标
    setCursorRef(data.currentMarker)
    setNextCursorRef(data.nextMarker)
    setHasNext(data.hasNext); // 后端告诉还有没有下一页


    // ProTable 要求的格式
    return {
      data: data.files,
      success: true,
      // total: Infinity
    };
  }}
    pagination={{
    pageSize: 20,
      showSizeChanger: false,
      showQuickJumper: false,
      showTotal: () => null, // 去掉“第 x-x 条”文字
      current: cursorStack.length + 1, // 让 ProTable 认为当前页码 = 栈深度 + 1
      total: Infinity, // 永远有“下一页”
      itemRender: (_, type, original) => {
      // 只在第一次调用时渲染整排按钮，其余全部隐藏
      if (type === 'prev') {
        return (
          <div style={{display: 'flex', gap: 8}}>
        <Button size="small" onClick={firstPage}>第一页</Button>
          <Button size="small" onClick={prevPage} disabled={cursorStack.length === 0}>前一页</Button>
          <Button size="small" onClick={nextPage} disabled={!hasNext}>后一页</Button>
        <span style={{marginLeft: 8}}>当前第 {cursorStack.length + 1} 页</span>
        </div>
      );
      }
      return null; // 其他 type 一律不渲染
    },
  }}
    columns={localColumns}
    rowSelection={{
    onChange: (_, selectedRows) => {
      setSelectedRows(selectedRows);
    },
  }}
    />
    <Drawer
    width={600}
    open={showDetail}
    onClose={() => {
    setCurrentRow(undefined);
    setShowDetail(false);
  }}
    closable={false}
      >
      {currentRow?.name && (
        <ProDescriptions<FileTableListItem>
          column={2}
    title={currentRow?.name}
    request={async () => ({
    data: currentRow || {},
  })}
    params={{
    id: currentRow?.name,
  }}
    columns={columns as ProDescriptionsItemProps<FileTableListItem>[]}
    />
  )}
    </Drawer>
    </>
  )
  },
];

  return (
    <PageContainer>
      <Tabs
        defaultActiveKey="remote"
  items={items}
  onChange={(key) => console.log('当前标签：', key)}
  />

  </PageContainer>
)

};


export default Manage;
