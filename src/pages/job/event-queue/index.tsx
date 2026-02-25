import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Col, Form, Input, message, Row, Statistic } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import type { EventQueueStatusVO, EventReceiveRequest } from './data';
import { getEventQueueStatus, receiveEvent } from './service';

const REFRESH_INTERVAL = 3000;

const EventQueuePage: React.FC = () => {
  const [status, setStatus] = useState<EventQueueStatusVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ type: string; data: string }>();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getEventQueueStatus();
      if (res.code === 0 && res.data) {
        setStatus(res.data);
      }
    } catch (_e) {
      message.error('获取队列状态失败');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStatus().finally(() => setLoading(false));
  }, [fetchStatus]);

  useEffect(() => {
    const timer = setInterval(fetchStatus, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const onFinish = async (values: { type: string; data: string }) => {
    setSubmitting(true);
    const hide = message.loading('正在投递事件');
    try {
      let payload: EventReceiveRequest = { type: values.type || '' };
      if (values.data?.trim()) {
        try {
          payload.data = JSON.parse(values.data.trim());
        } catch {
          payload.data = values.data;
        }
      }
      const res = await receiveEvent(payload);
      hide();
      if (res.code === 0) {
        message.success(res.data || '投递成功');
        // form.resetFields();
        fetchStatus();
      } else {
        message.error(res.message || '投递失败');
      }
    } catch (_e) {
      hide();
      message.error('投递失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="事件队列监控">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="队列执行情况"
            loading={loading}
            extra={
              <Button onClick={() => fetchStatus()} type="primary" size="small">
                刷新
              </Button>
            }
          >
            <Row gutter={24}>
              <Col span={6}>
                <Statistic
                  title="队列中待处理数量"
                  value={status?.queueSize ?? '-'}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="当前工作线程数"
                  value={status?.curWorkerNum ?? '-'}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="最大工作线程数"
                  value={status?.maxWorkers ?? '-'}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="是否启用"
                  value={status?.enable === true ? '是' : '否'}
                  valueStyle={{
                    color: status?.enable ? '#3f8600' : '#cf1322',
                  }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
              状态每 {REFRESH_INTERVAL / 1000} 秒自动刷新
            </div>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="手动投递事件">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ type: '', data: '' }}
              style={{ maxWidth: 560 }}
            >
              <Form.Item
                label="类型 (type)"
                name="type"
                rules={[{ required: true, message: '请输入 type' }]}
              >
                <Input placeholder="例如: default" />
              </Form.Item>
              <Form.Item
                label="数据 (data，可选，支持 JSON 字符串)"
                name="data"
              >
                <Input.TextArea
                  rows={4}
                  placeholder='例如: {"key": "value"} 或任意字符串'
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  投递到队列
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default EventQueuePage;
