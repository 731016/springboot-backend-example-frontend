import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  ModalForm,
  PageContainer,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Statistic,
  Switch,
  Tag,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EventQueueStatus, RequestData } from './service';
import { getEventQueueStatus, receiveEvent } from './service';

const REFRESH_INTERVAL = 5000;

/**
 * 事件队列监控：展示队列积压、工作线程数，并支持手动投递事件
 */
const EventQueuePage: React.FC = () => {
  const [status, setStatus] = useState<EventQueueStatus>({
    queueSize: 0,
    curWorkerNum: 0,
    maxWorkers: 0,
    enable: false,
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchStatus = useCallback(async (silent = true) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await getEventQueueStatus();
      if (res.code === 0 && res.data) {
        setStatus(res.data);
      } else if (!silent) {
        message.error(res.message || '获取队列状态失败');
      }
    } catch (e) {
      if (!silent) {
        message.error('获取队列状态失败，请确认后端服务已启动');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }
    timerRef.current = setInterval(() => fetchStatus(), REFRESH_INTERVAL);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRefresh, fetchStatus]);

  const handleSend = async (fields: RequestData) => {
    const hide = message.loading('正在投递事件');
    try {
      const res = await receiveEvent(fields);
      hide();
      if (res.code === 0) {
        message.success(res.data || '投递成功');
        fetchStatus(false);
        return true;
      }
      message.error(res.message || '投递失败');
      return false;
    } catch (error: any) {
      hide();
      message.error(error?.response?.data?.message || '投递失败，请重试');
      return false;
    }
  };

  return (
    <PageContainer
      title="事件队列监控"
      extra={
        <Space>
          <Space size={4}>
            <span>自动刷新</span>
            <Switch checked={autoRefresh} onChange={setAutoRefresh} />
          </Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => fetchStatus(false)}
          >
            刷新
          </Button>
          <ModalForm<RequestData>
            title="投递测试事件"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                投递事件
              </Button>
            }
            onFinish={handleSend}
          >
            <ProFormText
              name="type"
              label="事件类型"
              placeholder="例如：TEST"
              initialValue="TEST"
            />
            <ProFormTextArea
              name="data"
              label="事件内容"
              placeholder="请输入要投递的内容，例如：hello"
            />
          </ModalForm>
        </Space>
      }
    >
      {!status.enable && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="队列当前未启用，投递的事件可能不会被消费"
        />
      )}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="待处理事件数" value={status.queueSize} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="当前工作线程数" value={status.curWorkerNum} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="最大工作线程数" value={status.maxWorkers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行状态"
              value={status.enable ? '运行中' : '已停止'}
              valueStyle={{ color: status.enable ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="说明">
        <Space direction="vertical">
          <span>
            页面每 {REFRESH_INTERVAL / 1000} 秒自动刷新一次，可通过右上角开关关闭。
          </span>
          <span>
            数据来源：<Tag color="blue">GET /api/event/status</Tag>
            （springboot-backend-example，端口 8101）
          </span>
          <span>
            可点击“投递事件”调用 <Tag color="green">POST /api/event/receive</Tag>
            手动向队列写入测试数据。
          </span>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default EventQueuePage;
