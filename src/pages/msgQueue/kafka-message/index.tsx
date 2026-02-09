// src/pages/admin/kafka-message/index.tsx
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, message } from 'antd';
import React from 'react';
import type { KafKaMsg } from './data';
import { sendKafkaMsg } from './service';

const KafkaMessagePage: React.FC = () => {
  const [form] = Form.useForm<KafKaMsg>();
  const [submitting, setSubmitting] = React.useState(false);

  const onFinish = async (values: KafKaMsg) => {
    setSubmitting(true);
    const hide = message.loading('正在发送消息');
    try {
      const res = await sendKafkaMsg(values);
      hide();
      if (res.code === 0) {
        message.success(res.data || '发送成功');
      } else {
        message.error(res.message || '发送失败');
      }
    } catch (_e) {
      hide();
      message.error('发送失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <Card title="手动发送 Kafka 消息" style={{ maxWidth: 600 }}>
        <Form<KafKaMsg>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            topic: '',
            msg: '',
          }}
        >
          <Form.Item
            label="Topic"
            name="topic"
            rules={[{ required: true, message: '请输入 Topic' }]}
          >
            <Input placeholder="请输入 Kafka Topic" />
          </Form.Item>
          <Form.Item
            label="消息内容"
            name="msg"
            rules={[{ required: true, message: '请输入消息内容' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入要发送的消息内容"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              发送
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default KafkaMessagePage;

