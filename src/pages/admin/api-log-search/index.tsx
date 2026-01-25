// src/pages/admin/api-log-search/index.tsx
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { message, Tag, Modal, Button } from 'antd';
import React, { useRef, useState } from 'react';
import type { ApiLogEs } from './data';
import { searchApiLog } from './service';
import dayjs from 'dayjs';

const ApiLogSearchPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonModalTitle, setJsonModalTitle] = useState('');
  const [jsonModalContent, setJsonModalContent] = useState('');
  const [jsonModalHighlighted, setJsonModalHighlighted] = useState('');

  /**
   * 清理 JSON 字符串中的 HTML 标签，用于解析
   */
  const cleanJsonString = (jsonStr: string): string => {
    if (!jsonStr) return '';
    // 去除所有 HTML 标签（包括嵌套标签）
    let cleaned = jsonStr.replace(/<[^>]*>/g, '');
    // 清理可能的 HTML 实体
    cleaned = cleaned
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return cleaned.trim();
  };

  /**
   * 转义 HTML 特殊字符
   */
  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  /**
   * 高亮 JSON 字符串
   */
  const highlightJson = (json: string): string => {
    let highlighted = escapeHtml(json);

    // 使用标记系统避免重复替换，按从具体到抽象的顺序处理
    const markers: { [key: string]: string } = {};
    let markerIndex = 0;

    // 1. 标记字符串值（绿色）
    highlighted = highlighted.replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (match, content) => {
      const marker = `__VAL_${markerIndex}__`;
      markers[marker] = `: <span style="color: #22863a;">"${content}"</span>`;
      markerIndex++;
      return `: ${marker}`;
    });

    // 2. 标记数字值（蓝色）
    highlighted = highlighted.replace(/:\s*(-?\d+\.?\d*)(?=\s*[,}\]]|$)/g, (match, num) => {
      const marker = `__NUM_${markerIndex}__`;
      markers[marker] = `: <span style="color: #005cc5;">${num}</span>`;
      markerIndex++;
      return marker;
    });

    // 3. 标记布尔值和 null（紫色）
    highlighted = highlighted.replace(/:\s*\b(true|false|null)\b(?=\s*[,}\]]|$)/g, (match, value) => {
      const marker = `__BOOL_${markerIndex}__`;
      markers[marker] = `: <span style="color: #6f42c1; font-weight: 500;">${value}</span>`;
      markerIndex++;
      return marker;
    });

    // 4. 标记键名（蓝色）- 匹配行首、逗号后、大括号后的 "key": 格式
    highlighted = highlighted.replace(/(?:^|[\s,{]+)"((?:[^"\\]|\\.)*)":(?=\s*)/gm, (match, key) => {
      // 检查是否已经包含标记（值已经被标记）
      if (match.includes('__VAL_') || match.includes('__NUM_') || match.includes('__BOOL_') || match.includes('__KEY_')) {
        return match;
      }
      const marker = `__KEY_${markerIndex}__`;
      // 保留前缀（空白、逗号、大括号等）
      const prefix = match.replace(/"((?:[^"\\]|\\.)*)":/, '');
      markers[marker] = `${prefix}<span style="color: #0366d6; font-weight: 500;">"${key}":</span>`;
      markerIndex++;
      return prefix + marker;
    });

    // 5. 高亮大括号和方括号（深灰色）
    highlighted = highlighted.replace(/([{}[\]])/g,
      '<span style="color: #6a737d; font-weight: bold;">$1</span>');

    // 6. 恢复所有标记（按标记名称长度倒序，避免部分匹配）
    const sortedMarkers = Object.keys(markers).sort((a, b) => b.length - a.length);
    sortedMarkers.forEach(marker => {
      highlighted = highlighted.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), markers[marker]);
    });

    return highlighted;
  };

  /**
   * 在格式化的 JSON 中重新应用搜索高亮
   * 提取原始内容中的高亮关键词，在格式化后的 JSON 中重新标记
   */
  const applySearchHighlight = (formattedJson: string, originalContent: string): string => {
    // 提取原始内容中的所有高亮关键词
    const highlightKeywords: string[] = [];
    const highlightRegex = /<em[^>]*>([^<]*)<\/em>/g;
    let match;
    
    while ((match = highlightRegex.exec(originalContent)) !== null) {
      const keyword = match[1]; // 高亮的关键词
      if (keyword && !highlightKeywords.includes(keyword)) {
        highlightKeywords.push(keyword);
      }
    }

    // 如果没有任何高亮关键词，直接返回
    if (highlightKeywords.length === 0) {
      return formattedJson;
    }

    // 在格式化后的 JSON 中查找并标记高亮关键词
    let result = formattedJson;
    highlightKeywords.forEach((keyword) => {
      // 转义关键词中的特殊字符，用于正则匹配
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 1. 先匹配键名（"key": 格式）
      const keyRegex = new RegExp(`("${escapedKeyword}"):`, 'g');
      result = result.replace(keyRegex, (match) => {
        // 检查是否已经在 HTML 标签内
        if (match.includes('<span') || match.includes('<em')) {
          return match;
        }
        // 替换键名，保持引号和冒号
        return `"<em style='color: red; font-weight: bold;'>${keyword}</em>":`;
      });
      
      // 2. 匹配字符串值（"value" 格式）
      const valueRegex = new RegExp(`: "(${escapedKeyword})"`, 'g');
      result = result.replace(valueRegex, (match, value) => {
        // 检查是否已经在 HTML 标签内
        if (match.includes('<span') || match.includes('<em')) {
          return match;
        }
        // 替换值，保持引号
        return `: "<em style='color: red; font-weight: bold;'>${value}</em>"`;
      });
      
      // 3. 匹配不在引号内的值（数字、布尔值等）
      const unquotedRegex = new RegExp(`: (${escapedKeyword})([,}\\]])`, 'g');
      result = result.replace(unquotedRegex, (match, value, suffix) => {
        // 检查是否已经在 HTML 标签内
        if (match.includes('<span') || match.includes('<em')) {
          return match;
        }
        // 替换值
        return `: <em style='color: red; font-weight: bold;'>${value}</em>${suffix}`;
      });
    });

    return result;
  };

  /**
   * 格式化并显示 JSON 数据
   */
  const showJsonModal = (title: string, content: string) => {
    if (!content || content.trim() === '') {
      message.info('暂无数据');
      return;
    }

    // 检查是否包含高亮标签
    const hasHighlight = /<em[^>]*>/.test(content);
    
    // 清理 JSON 字符串，去除 HTML 标签用于解析
    let cleanContent = cleanJsonString(content);

    try {
      // 尝试解析 JSON
      const jsonObj = JSON.parse(cleanContent);
      const formattedJson = JSON.stringify(jsonObj, null, 2);
      setJsonModalTitle(title);
      setJsonModalContent(formattedJson);
      
      // 如果原始内容包含高亮标签，先应用搜索高亮，再应用 JSON 语法高亮
      if (hasHighlight) {
        // 先在格式化后的 JSON 中重新应用搜索高亮
        const withSearchHighlight = applySearchHighlight(formattedJson, content);
        // 应用 JSON 语法高亮（这会转义所有 HTML）
        let highlighted = highlightJson(withSearchHighlight);
        // 将转义的 <em> 标签恢复，使其能够显示
        highlighted = highlighted
          .replace(/&lt;em\s+style='color:\s*red;\s*font-weight:\s*bold;'&gt;/g, '<em style="color: red; font-weight: bold;">')
          .replace(/&lt;\/em&gt;/g, '</em>');
        setJsonModalHighlighted(highlighted);
      } else {
        // 生成 JSON 语法高亮版本
        setJsonModalHighlighted(highlightJson(formattedJson));
      }
      setJsonModalVisible(true);
    } catch (e) {
      // 如果解析失败，尝试进一步处理
      try {
        // 如果内容看起来像是被转义的 JSON 字符串
        if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
          const unescaped = JSON.parse(cleanContent);
          const jsonObj = JSON.parse(unescaped);
          const formattedJson = JSON.stringify(jsonObj, null, 2);
          setJsonModalTitle(title);
          setJsonModalContent(formattedJson);
          
          if (hasHighlight) {
            const withSearchHighlight = applySearchHighlight(formattedJson, content);
            let highlighted = highlightJson(withSearchHighlight);
            highlighted = highlighted
              .replace(/&lt;em\s+style='color:\s*red;\s*font-weight:\s*bold;'&gt;/g, '<em style="color: red; font-weight: bold;">')
              .replace(/&lt;\/em&gt;/g, '</em>');
            setJsonModalHighlighted(highlighted);
          } else {
            setJsonModalHighlighted(highlightJson(formattedJson));
          }
          setJsonModalVisible(true);
        } else {
          throw new Error('Not a JSON string');
        }
      } catch (e2) {
        // 如果仍然失败，显示原始内容（保留高亮标签）
        setJsonModalTitle(title);
        setJsonModalContent(cleanContent);
        // 如果包含高亮标签，直接显示（已转义其他 HTML，但保留高亮标签）
        if (hasHighlight) {
          // 转义 HTML，但保留 <em> 标签
          let escaped = escapeHtml(content);
          // 恢复 <em> 标签
          escaped = escaped
            .replace(/&lt;em\s+style='color:\s*red;\s*font-weight:\s*bold;'&gt;/g, '<em style="color: red; font-weight: bold;">')
            .replace(/&lt;em([^&]*)&gt;/g, '<em$1>')
            .replace(/&lt;\/em&gt;/g, '</em>');
          setJsonModalHighlighted(escaped);
        } else {
          setJsonModalHighlighted(escapeHtml(cleanContent));
        }
        setJsonModalVisible(true);
      }
    }
  };

  const columns: ProColumns<ApiLogEs>[] = [
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
      fieldProps: {
        placeholder: '请输入URL、方法名、请求参数或响应数据进行搜索（可选）',
      },
    },
    {
      title: 'HTTP方法',
      dataIndex: 'httpMethod',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        GET: { text: 'GET' },
        POST: { text: 'POST' },
        PUT: { text: 'PUT' },
        DELETE: { text: 'DELETE' },
        PATCH: { text: 'PATCH' },
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      valueType: 'text',
      hideInTable: true,
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      valueType: 'text',
      hideInTable: true,
    },
    {
      title: '时间范围',
      dataIndex: 'timeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value: any) => {
          return {
            startTime: value?.[0],
            endTime: value?.[1],
          };
        },
      },
    },
    {
      title: '耗时范围(ms)',
      dataIndex: 'timeConsumedRange',
      valueType: 'digitRange',
      hideInTable: true,
      search: {
        transform: (value: any) => {
          return {
            minTimeConsumed: value?.[0],
            maxTimeConsumed: value?.[1],
          };
        },
      },
    },
    {
      title: '请求ID',
      dataIndex: 'requestId',
      copyable: true,
      hideInSearch: true,
      width: 200,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const text = record.highlightUrl || record.url;
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
      },
    },
    {
      title: 'HTTP方法',
      dataIndex: 'httpMethod',
      hideInSearch: true,
      width: 100,
      render: (_, record) => {
        const method = record.httpMethod;
        let color = 'default';
        if (method === 'GET') color = 'blue';
        else if (method === 'POST') color = 'green';
        else if (method === 'PUT') color = 'orange';
        else if (method === 'DELETE') color = 'red';
        return <Tag color={color}>{method}</Tag>;
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      copyable: true,
      hideInSearch: true,
      width: 120,
    },
    {
      title: '方法',
      dataIndex: 'classMethod',
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const text = record.highlightClassMethod || record.classMethod;
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
      },
    },
    {
      title: '请求参数',
      dataIndex: 'requestParams',
      ellipsis: true,
      hideInSearch: true,
      width: 200,
      render: (_, record) => {
        const text = record.highlightRequestParams || record.requestParams || '';
        if (!text) {
          return '-';
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span 
              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
            <Button
              type="link"
              size="small"
              onClick={() => {
                // 优先使用高亮版本，如果没有则使用原始数据
                const highlightText = record.highlightRequestParams || record.requestParams || '';
                showJsonModal('请求参数', highlightText);
              }}
            >
              查看
            </Button>
          </div>
        );
      },
    },
    {
      title: '响应数据',
      dataIndex: 'responseData',
      ellipsis: true,
      hideInSearch: true,
      width: 200,
      render: (_, record) => {
        const text = record.highlightResponseData || record.responseData || '';
        if (!text) {
          return '-';
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span 
              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
            <Button
              type="link"
              size="small"
              onClick={() => {
                // 优先使用高亮版本，如果没有则使用原始数据
                const highlightText = record.highlightResponseData || record.responseData || '';
                showJsonModal('响应数据', highlightText);
              }}
            >
              查看
            </Button>
          </div>
        );
      },
    },
    {
      title: '耗时(ms)',
      dataIndex: 'timeConsumed',
      hideInSearch: true,
      width: 100,
      render: (_, record) => {
        const time = record.timeConsumed;
        let color = 'default';
        if (time > 1000) color = 'red';
        else if (time > 500) color = 'orange';
        else if (time > 200) color = 'blue';
        return <Tag color={color}>{time}</Tag>;
      },
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      copyable: true,
      hideInSearch: true,
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: false,
      width: 180,
    },
  ];

  return (
    <PageContainer>
      <ProTable<ApiLogEs>
        headerTitle="API 日志搜索（Elasticsearch）"
        actionRef={actionRef}
        rowKey="id"
        manualRequest={true}
        scroll={{ x: 'max-content' }}
        search={{
          labelWidth: 120,
          searchText: '搜索',
          resetText: '重置',
        }}
        request={async (params) => {
          try {
            const searchText = params.searchText as string | undefined;

            // 检查是否有任何搜索条件
            // 注意：ProTable 的 search.transform 会将 timeRange 转换为 { startTime, endTime }
            // 将 timeConsumedRange 转换为 { minTimeConsumed, maxTimeConsumed }
            // 但原始字段 timeRange 和 timeConsumedRange 可能仍然存在
            const hasSearchText = searchText && searchText.trim() !== '';
            const hasHttpMethod = params.httpMethod;
            const hasIp = params.ip;
            const hasUserId = params.userId;
            
            // 检查时间范围（优先检查转换后的字段，如果没有则检查原始字段）
            const timeRange = params.timeRange as any;
            const hasTimeRange = (params.startTime && params.endTime) || 
                                 (timeRange && Array.isArray(timeRange) && timeRange.length === 2);
            
            // 检查耗时范围（优先检查转换后的字段，如果没有则检查原始字段）
            const timeConsumedRange = params.timeConsumedRange as any;
            const hasTimeConsumedRange = (params.minTimeConsumed !== undefined && params.minTimeConsumed !== null) ||
                                         (params.maxTimeConsumed !== undefined && params.maxTimeConsumed !== null) ||
                                         (timeConsumedRange && Array.isArray(timeConsumedRange) && timeConsumedRange.length === 2);

            // 如果没有任何搜索条件，提示用户输入
            if (!hasSearchText && !hasHttpMethod && !hasIp && !hasUserId && !hasTimeRange && !hasTimeConsumedRange) {
              message.warning('请至少输入一个搜索条件');
              return {
                data: [],
                success: true,
                total: 0,
              };
            }

            // 处理时间范围
            // ES 存储的格式是 yyyy-MM-dd HH:mm:ss，需要匹配这个格式
            let startTime: string | undefined;
            let endTime: string | undefined;
            if (params.startTime && params.endTime) {
              // 使用 transform 转换后的字段
              if (typeof params.startTime === 'string') {
                // 如果已经是字符串，解析后格式化为 yyyy-MM-dd HH:mm:ss
                startTime = dayjs(params.startTime).format('YYYY-MM-DD HH:mm:ss');
              } else {
                // 日期对象，格式化为 yyyy-MM-dd HH:mm:ss
                startTime = dayjs(params.startTime).format('YYYY-MM-DD HH:mm:ss');
              }
              if (typeof params.endTime === 'string') {
                endTime = dayjs(params.endTime).format('YYYY-MM-DD HH:mm:ss');
              } else {
                endTime = dayjs(params.endTime).format('YYYY-MM-DD HH:mm:ss');
              }
            } else if (timeRange && Array.isArray(timeRange) && timeRange.length === 2) {
              // 如果没有转换后的字段，使用原始字段
              startTime = dayjs(timeRange[0]).format('YYYY-MM-DD HH:mm:ss');
              endTime = dayjs(timeRange[1]).format('YYYY-MM-DD HH:mm:ss');
            }

            // 处理耗时范围
            let minTimeConsumed: number | undefined;
            let maxTimeConsumed: number | undefined;
            if (params.minTimeConsumed !== undefined && params.minTimeConsumed !== null) {
              minTimeConsumed = params.minTimeConsumed;
            } else if (timeConsumedRange && Array.isArray(timeConsumedRange) && timeConsumedRange.length >= 1) {
              minTimeConsumed = timeConsumedRange[0];
            }
            
            if (params.maxTimeConsumed !== undefined && params.maxTimeConsumed !== null) {
              maxTimeConsumed = params.maxTimeConsumed;
            } else if (timeConsumedRange && Array.isArray(timeConsumedRange) && timeConsumedRange.length >= 2) {
              maxTimeConsumed = timeConsumedRange[1];
            }

            const res = await searchApiLog({
              current: params.current ? params.current - 1 : 0, // 后端从0开始
              pageSize: params.pageSize || 10,
              searchText: hasSearchText ? searchText.trim() : undefined,
              requestId: params.requestId as string | undefined,
              httpMethod: params.httpMethod as string | undefined,
              ip: params.ip as string | undefined,
              userId: params.userId as string | undefined,
              startTime,
              endTime,
              minTimeConsumed,
              maxTimeConsumed,
            });

            if (res.code === 0) {
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

      {/* JSON 数据展示 Modal */}
      <Modal
        title={jsonModalTitle}
        open={jsonModalVisible}
        onCancel={() => setJsonModalVisible(false)}
        footer={[
          <Button key="copy" onClick={async () => {
            try {
              await navigator.clipboard.writeText(jsonModalContent);
              message.success('已复制到剪贴板');
            } catch (err) {
              // 降级方案：使用传统方法复制
              const textArea = document.createElement('textarea');
              textArea.value = jsonModalContent;
              textArea.style.position = 'fixed';
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                message.success('已复制到剪贴板');
              } catch (e) {
                message.error('复制失败，请手动复制');
              }
              document.body.removeChild(textArea);
            }
          }}>
            复制
          </Button>,
          <Button key="close" type="primary" onClick={() => setJsonModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <pre
          style={{
            maxHeight: '60vh',
            overflow: 'auto',
            background: '#f6f8fa',
            padding: '16px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
            border: '1px solid #e1e4e8',
          }}
          dangerouslySetInnerHTML={{ __html: jsonModalHighlighted }}
        />
      </Modal>
    </PageContainer>
  );
};

export default ApiLogSearchPage;
