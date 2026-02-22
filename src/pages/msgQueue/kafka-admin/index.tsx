import { PageContainer } from '@ant-design/pro-components';
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Descriptions, message, Row, Space, Statistic, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useState } from 'react';
import type {
  TopicInfo,
  ConsumerGroupSummary,
  ConsumerGroupDetail,
  PartitionOffsetInfo,
} from './data';
import {
  listKafkaTopics,
  listKafkaConsumerGroups,
  getKafkaConsumerGroupDetail,
} from './service';

/**
 * Kafka 运行情况可视化：Topic 与分区、消费者组、Offset 与 Lag
 */
const KafkaAdminPage: React.FC = () => {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [consumerGroups, setConsumerGroups] = useState<ConsumerGroupSummary[]>([]);
  const [groupDetail, setGroupDetail] = useState<ConsumerGroupDetail | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await listKafkaTopics();
      if (res.code === 0 && res.data) {
        setTopics(res.data);
      } else {
        message.error(res.message || '获取 Topic 列表失败');
      }
    } catch (e) {
      message.error('获取 Topic 列表失败');
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  const loadConsumerGroups = useCallback(async () => {
    setLoadingGroups(true);
    setGroupDetail(null);
    try {
      const res = await listKafkaConsumerGroups();
      if (res.code === 0 && res.data) {
        setConsumerGroups(res.data);
      } else {
        message.error(res.message || '获取消费者组列表失败');
      }
    } catch (e) {
      message.error('获取消费者组列表失败');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadGroupDetail = useCallback(async (groupId: string) => {
    setLoadingDetail(true);
    try {
      const res = await getKafkaConsumerGroupDetail(groupId);
      if (res.code === 0 && res.data) {
        setGroupDetail(res.data);
      } else {
        message.error(res.message || '获取消费者组详情失败');
        setGroupDetail(null);
      }
    } catch (e) {
      message.error('获取消费者组详情失败');
      setGroupDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadTopics();
    loadConsumerGroups();
    setGroupDetail(null);
  }, [loadTopics, loadConsumerGroups]);

  React.useEffect(() => {
    loadTopics();
    loadConsumerGroups();
  }, [loadTopics, loadConsumerGroups]);

  const topicColumns: ColumnsType<TopicInfo> = [
    { title: 'Topic', dataIndex: 'topic', key: 'topic', ellipsis: true },
    {
      title: '分区数',
      dataIndex: 'partitionCount',
      key: 'partitionCount',
      width: 100,
      align: 'center',
    },
    {
      title: '分区详情',
      key: 'partitions',
      render: (_, record) =>
        record.partitions?.length ? (
          <Space size="small" wrap>
            {record.partitions.map((p) => (
              <Tag key={p.partition}>
                P{p.partition} (leader: {p.leaderId})
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
  ];

  const groupColumns: ColumnsType<ConsumerGroupSummary> = [
    { title: '消费者组 ID', dataIndex: 'groupId', key: 'groupId', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state: string) => {
        const color =
          state === 'Stable'
            ? 'green'
            : state === 'Dead' || state === 'Empty'
              ? 'default'
              : 'blue';
        return <Tag color={color}>{state}</Tag>;
      },
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 90,
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          loading={loadingDetail && groupDetail?.groupId === record.groupId}
          onClick={() => loadGroupDetail(record.groupId)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const detailOffsetColumns: ColumnsType<PartitionOffsetInfo> = [
    { title: 'Topic', dataIndex: 'topic', key: 'topic', width: 140 },
    {
      title: '分区',
      dataIndex: 'partition',
      key: 'partition',
      width: 80,
      align: 'center',
    },
    {
      title: '当前 Offset',
      dataIndex: 'currentOffset',
      key: 'currentOffset',
      width: 120,
      align: 'right',
    },
    {
      title: '末尾 Offset',
      dataIndex: 'endOffset',
      key: 'endOffset',
      width: 120,
      align: 'right',
    },
    {
      title: '未消费条数 (Lag)',
      dataIndex: 'lag',
      key: 'lag',
      width: 140,
      align: 'right',
      render: (lag: number) => (
        <span style={{ color: lag > 0 ? '#cf1322' : undefined }}>{lag}</span>
      ),
    },
  ];

  return (
    <PageContainer
      title="Kafka 运行情况"
      subTitle="查看 Topic 分区、消费者组及 Offset/Lag"
      extra={
        <Button type="primary" icon={<ReloadOutlined />} onClick={refreshAll}>
          刷新全部
        </Button>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          title="Topic 与分区"
          extra={
            <Button size="small" onClick={loadTopics} loading={loadingTopics}>
              刷新
            </Button>
          }
        >
          <Table<TopicInfo>
            rowKey="topic"
            size="small"
            loading={loadingTopics}
            dataSource={topics}
            columns={topicColumns}
            pagination={false}
          />
        </Card>

        <Card
          title="消费者组"
          extra={
            <Button size="small" onClick={loadConsumerGroups} loading={loadingGroups}>
              刷新
            </Button>
          }
        >
          <Table<ConsumerGroupSummary>
            rowKey="groupId"
            size="small"
            loading={loadingGroups}
            dataSource={consumerGroups}
            columns={groupColumns}
            pagination={false}
          />
        </Card>

        {groupDetail && (
          <Card
            title={`消费者组详情：${groupDetail.groupId}`}
            extra={
              <Button size="small" onClick={() => setGroupDetail(null)}>
                关闭
              </Button>
            }
          >
            {/* 当前未消费消息数：醒目展示 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={24} align="middle">
                <Col>
                  <Statistic
                    title="当前未消费消息数"
                    value={groupDetail.totalLag}
                    valueStyle={{
                      color: groupDetail.totalLag > 0 ? '#cf1322' : undefined,
                      fontWeight: groupDetail.totalLag > 0 ? 600 : undefined,
                    }}
                  />
                </Col>
                <Col>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>状态</div>
                  <Tag
                    color={
                      groupDetail.state === 'Stable'
                        ? 'green'
                        : groupDetail.state === 'Dead' || groupDetail.state === 'Empty'
                          ? 'default'
                          : 'blue'
                    }
                  >
                    {groupDetail.state}
                  </Tag>
                </Col>
                <Col>
                  <Statistic title="成员数" value={groupDetail.members?.length ?? 0} />
                </Col>
              </Row>
              {groupDetail.totalLag > 0 && (
                <Alert
                  type="warning"
                  message="存在未消费消息"
                  description="该消费者组当前有未消费的消息，请关注消费进度或扩容消费者。"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>
            {groupDetail.members && groupDetail.members.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>成员</div>
                <Row gutter={[8, 8]}>
                  {groupDetail.members.map((m, i) => (
                    <Col key={i} xs={24} sm={12} md={8} lg={6}>
                      <Card size="small" style={{ wordBreak: 'break-all' }}>
                        <Tooltip title={m.consumerId}>
                          <div style={{ fontSize: 12, marginBottom: 4 }} title={m.consumerId}>
                            {m.consumerId.length > 24 ? `${m.consumerId.slice(0, 24)}...` : m.consumerId}
                          </div>
                        </Tooltip>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>{m.host}</div>
                        <Tag style={{ marginTop: 4 }}>分区数: {m.assignedPartitions}</Tag>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
              各分区当前 offset、末尾 offset 及未消费条数（Lag = 末尾 offset − 当前 offset）
            </div>
            <Table<PartitionOffsetInfo>
              rowKey={(r) => `${r.topic}-${r.partition}`}
              size="small"
              dataSource={groupDetail.partitionOffsets || []}
              columns={detailOffsetColumns}
              pagination={false}
            />
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default KafkaAdminPage;
