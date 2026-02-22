import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Descriptions, message, Modal, Popconfirm, Space, Tag, Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import type { ApiRequestRecord, ApiRequestRecordQueryRequest } from './data';
import { listApiRequestRecordByPage, replayApiRequest } from './service';
import dayjs from 'dayjs';

/** 清理 JSON 字符串中的 HTML 标签，用于解析 */
function cleanJsonString(jsonStr: string): string {
  if (!jsonStr) return '';
  let cleaned = jsonStr.replace(/<[^>]*>/g, '');
  cleaned = cleaned
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return cleaned.trim();
}

/** 转义 HTML 特殊字符 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/** 高亮 JSON 字符串（与 api-log-search 相同） */
function highlightJson(json: string): string {
  let highlighted = escapeHtml(json);
  const markers: { [key: string]: string } = {};
  let markerIndex = 0;
  highlighted = highlighted.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (_match, content) => {
    const marker = `__VAL_${markerIndex}__`;
    markers[marker] = `: <span style="color: #22863a;">"${content}"</span>`;
    markerIndex++;
    return `: ${marker}`;
  });
  highlighted = highlighted.replace(/:\s*(-?\d+\.?\d*)(?=\s*[,}\]]|$)/g, (_match, num) => {
    const marker = `__NUM_${markerIndex}__`;
    markers[marker] = `: <span style="color: #005cc5;">${num}</span>`;
    markerIndex++;
    return marker;
  });
  highlighted = highlighted.replace(/:\s*\b(true|false|null)\b(?=\s*[,}\]]|$)/g, (_match, value) => {
    const marker = `__BOOL_${markerIndex}__`;
    markers[marker] = `: <span style="color: #6f42c1; font-weight: 500;">${value}</span>`;
    markerIndex++;
    return marker;
  });
  highlighted = highlighted.replace(/(?:^|[\s,{]+)"((?:[^"\\]|\\.)*)":(?=\s*)/gm, (match, key) => {
    if (match.includes('__VAL_') || match.includes('__NUM_') || match.includes('__BOOL_') || match.includes('__KEY_')) return match;
    const marker = `__KEY_${markerIndex}__`;
    const prefix = match.replace(/"((?:[^"\\]|\\.)*)":/, '');
    markers[marker] = `${prefix}<span style="color: #0366d6; font-weight: 500;">"${key}":</span>`;
    markerIndex++;
    return prefix + marker;
  });
  highlighted = highlighted.replace(/([{}[\]])/g, '<span style="color: #6a737d; font-weight: bold;">$1</span>');
  const sortedMarkers = Object.keys(markers).sort((a, b) => b.length - a.length);
  sortedMarkers.forEach((marker) => {
    highlighted = highlighted.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), markers[marker]);
  });
  return highlighted;
}

/** 格式化并得到高亮 HTML（与 api-log-search 一致） */
function formatAndHighlight(raw: string | undefined): { text: string; html: string } {
  if (raw == null || raw === '') return { text: '', html: '' };
  const s = String(raw).trim();
  if (!s) return { text: '', html: '' };
  const clean = cleanJsonString(s);
  try {
    const parsed = JSON.parse(clean);
    const formatted = JSON.stringify(parsed, null, 2);
    return { text: formatted, html: highlightJson(formatted) };
  } catch {
    return { text: s, html: escapeHtml(s) };
  }
}

const jsonBlockStyle: React.CSSProperties = {
  maxHeight: '60vh',
  overflow: 'auto',
  background: '#f6f8fa',
  padding: 16,
  borderRadius: 4,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word',
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
  border: '1px solid #e1e4e8',
};

/**
 * 已执行接口记录：分页查询 + 重放 + 详情（headers/request_params/response_data 与 api-log-search 相同 JSON 展示）
 */
const ApiReplayPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [replayingId, setReplayingId] = useState<number | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ApiRequestRecord | null>(null);
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonModalTitle, setJsonModalTitle] = useState('');
  const [jsonModalContent, setJsonModalContent] = useState('');
  const [jsonModalHighlighted, setJsonModalHighlighted] = useState('');

  const handleReplay = async (record: ApiRequestRecord) => {
    if (record.id == null) return;
    setReplayingId(record.id);
    const hide = message.loading('重放中...');
    try {
      const res = await replayApiRequest(record.id);
      hide();
      if (res.code === 0) {
        message.success('重放成功');
        actionRef.current?.reload();
      } else {
        message.error(res.message || '重放失败');
      }
    } catch (e) {
      hide();
      message.error('重放失败，请重试');
    } finally {
      setReplayingId(null);
    }
  };

  /** 打开 JSON 查看弹窗（与 api-log-search 相同） */
  const showJsonModal = (title: string, content: string | undefined) => {
    if (content == null || content.trim() === '') {
      message.info('暂无数据');
      return;
    }
    const { text, html } = formatAndHighlight(content);
    setJsonModalTitle(title);
    setJsonModalContent(text);
    setJsonModalHighlighted(html);
    setJsonModalVisible(true);
  };

  const columns: ProColumns<ApiRequestRecord>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      search: false,
    },
    {
      title: '请求 URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      copyable: true,
    },
    {
      title: 'HTTP 方法',
      dataIndex: 'httpMethod',
      key: 'httpMethod',
      width: 100,
      valueEnum: {
        GET: { text: 'GET', status: 'Default' },
        POST: { text: 'POST', status: 'Processing' },
        PUT: { text: 'PUT', status: 'Warning' },
        DELETE: { text: 'DELETE', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.httpMethod === 'GET' ? 'blue' : record.httpMethod === 'POST' ? 'green' : 'orange'}>
          {record.httpMethod}
        </Tag>
      ),
    },
    {
      title: '状态码',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      search: false,
      render: (_, record) => {
        const status = record.status;
        const color = status >= 200 && status < 300 ? 'success' : status >= 400 ? 'error' : 'warning';
        return <Tag color={color}>{status ?? '-'}</Tag>;
      },
    },
    {
      title: '耗时(ms)',
      dataIndex: 'timeConsumed',
      key: 'timeConsumed',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      search: false,
      render: (_, record) =>
        record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'option',
      width: 140,
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDetailRecord(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          <Popconfirm title="确认重放该接口？" onConfirm={() => handleReplay(record)}>
            <Button type="link" size="small" loading={replayingId === record.id}>
              重放
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderJsonBlock = (label: string, raw: string | undefined) => {
    const { text, html } = formatAndHighlight(raw);
    return (
      <div style={{ marginBottom: 0 }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{label}</span>
          <Button
            size="small"
            onClick={() => showJsonModal(label, raw)}
            disabled={!raw || !String(raw).trim()}
          >
            弹窗查看
          </Button>
        </div>
        {/* eslint-disable-next-line react/no-danger -- 与 api-log-search 一致，展示高亮 JSON */}
        <pre style={jsonBlockStyle} dangerouslySetInnerHTML={{ __html: html || '(空)' }} />
      </div>
    );
  };

  return (
    <PageContainer title="接口重放" subTitle="分页查询已执行接口记录，可对单条记录进行重放">
      <ProTable<ApiRequestRecord, ApiRequestRecordQueryRequest>
        headerTitle="已执行接口列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        request={async (params) => {
          const query: ApiRequestRecordQueryRequest = {
            current: params.current,
            pageSize: params.pageSize,
            url: params.url,
            httpMethod: params.httpMethod,
          };
          const res = await listApiRequestRecordByPage(query);
          if (res.code !== 0) {
            message.error(res.message || '查询失败');
            return { data: [], success: false, total: 0 };
          }
          const page = res.data;
          return {
            data: page?.records ?? [],
            success: true,
            total: page?.total ?? 0,
          };
        }}
        columns={columns}
        pagination={{ defaultPageSize: 10 }}
      />

      {/* 接口详情：Headers / Request Params / Response Data，与 api-log-search 相同 JSON 展示 */}
      <Modal
        title="接口详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailRecord(null); }}
        footer={[
          <Button key="close" onClick={() => { setDetailVisible(false); setDetailRecord(null); }}>关闭</Button>,
          ...(detailRecord?.id != null
            ? [
                <Popconfirm
                  key="replay"
                  title="确认重放该接口？"
                  onConfirm={() => {
                    handleReplay(detailRecord!);
                    setDetailVisible(false);
                    setDetailRecord(null);
                  }}
                >
                  <Button type="primary" loading={replayingId === detailRecord?.id}>重放</Button>
                </Popconfirm>,
              ]
            : []),
        ]}
        width={800}
        destroyOnClose
      >
        {detailRecord && (
          <>
            <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="URL">{detailRecord.url ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="HTTP 方法">{detailRecord.httpMethod ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="状态码">
                {detailRecord.status != null ? (
                  <Tag color={detailRecord.status >= 200 && detailRecord.status < 300 ? 'success' : detailRecord.status >= 400 ? 'error' : 'warning'}>
                    {detailRecord.status}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="耗时">{detailRecord.timeConsumed != null ? `${detailRecord.timeConsumed} ms` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Content-Type">{detailRecord.contentType ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detailRecord.createTime ? dayjs(detailRecord.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Tabs
              items={[
                { key: 'headers', label: 'Headers', children: renderJsonBlock('Headers', detailRecord.headers) },
                { key: 'request_params', label: 'Request Params', children: renderJsonBlock('Request Params', detailRecord.requestParams) },
                { key: 'response_data', label: 'Response Data', children: renderJsonBlock('Response Data', detailRecord.responseData) },
              ]}
            />
          </>
        )}
      </Modal>

      {/* JSON 弹窗查看（与 api-log-search 相同样式） */}
      <Modal
        title={jsonModalTitle}
        open={jsonModalVisible}
        onCancel={() => setJsonModalVisible(false)}
        footer={[
          <Button
            key="copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(jsonModalContent);
                message.success('已复制到剪贴板');
              } catch {
                const textArea = document.createElement('textarea');
                textArea.value = jsonModalContent;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                  document.execCommand('copy');
                  message.success('已复制到剪贴板');
                } catch {
                  message.error('复制失败，请手动复制');
                }
                document.body.removeChild(textArea);
              }
            }}
          >
            复制
          </Button>,
          <Button key="close" type="primary" onClick={() => setJsonModalVisible(false)}>关闭</Button>,
        ]}
        width={800}
      >
        {/* eslint-disable-next-line react/no-danger -- 与 api-log-search 一致 */}
        <pre style={jsonBlockStyle} dangerouslySetInnerHTML={{ __html: jsonModalHighlighted }} />
      </Modal>
    </PageContainer>
  );
};

export default ApiReplayPage;
