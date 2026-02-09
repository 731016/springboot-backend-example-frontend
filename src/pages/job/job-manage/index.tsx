// src/pages/job-manage/index.tsx
import { PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormText,
  ProTable,
  DrawerForm,
  ProDescriptions,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal } from 'antd';
import React, { useRef, useState } from 'react';
import type { JobAndTrigger, JobForm } from './data';
import {
  addJob,
  deleteJob,
  pauseJob,
  resumeJob,
  updateCronJob,
  getJobList,
  queryJobNextFireTimes,
} from './service';

/**
 * 添加任务
 */
const handleAdd = async (fields: JobForm) => {
  const hide = message.loading('正在添加');
  try {
    const res = await addJob({ ...fields });
    hide();
    if (res.code === 0) {
      message.success('添加成功');
      return true;
    } else {
      message.error(res.message || '添加失败');
      return false;
    }
  } catch (error: any) {
    hide();
    const errorMsg = error?.response?.data?.message || error?.message || '添加失败，请重试';
    message.error(errorMsg);
    console.error('添加任务失败:', error);
    return false;
  }
};

/**
 * 删除任务
 */
const handleDelete = async (record: JobAndTrigger) => {
  if (!record.jobClassName || !record.jobGroup) {
    message.error('任务信息不完整，无法删除');
    return false;
  }
  const hide = message.loading('正在删除');
  try {
    const res = await deleteJob({
      jobClassName: record.jobClassName,
      jobGroupName: record.jobGroup,
      cronExpression: record.cronExpression || '',
    });
    hide();
    if (res.code === 0) {
      message.success('删除成功');
      return true;
    } else {
      message.error(res.message || '删除失败');
      return false;
    }
  } catch (error: any) {
    hide();
    const errorMsg = error?.response?.data?.message || error?.message || '删除失败，请重试';
    message.error(errorMsg);
    console.error('删除任务失败:', error);
    return false;
  }
};

/**
 * 暂停任务
 */
const handlePause = async (record: JobAndTrigger) => {
  const hide = message.loading('正在暂停');
  try {
    const res = await pauseJob({
      jobClassName: record.jobClassName || '',
      jobGroupName: record.jobGroup || '',
      cronExpression: record.cronExpression || '',
    });
    hide();
    if (res.code === 0) {
      message.success('暂停成功');
      return true;
    } else {
      message.error(res.message || '暂停失败');
      return false;
    }
  } catch (_error) {
    hide();
    message.error('暂停失败，请重试');
    return false;
  }
};

/**
 * 恢复任务
 */
const handleResume = async (record: JobAndTrigger) => {
  const hide = message.loading('正在恢复');
  try {
    const res = await resumeJob({
      jobClassName: record.jobClassName || '',
      jobGroupName: record.jobGroup || '',
      cronExpression: record.cronExpression || '',
    });
    hide();
    if (res.code === 0) {
      message.success('恢复成功');
      return true;
    } else {
      message.error(res.message || '恢复失败');
      return false;
    }
  } catch (_error) {
    hide();
    message.error('恢复失败，请重试');
    return false;
  }
};

/**
 * 修改cron表达式
 */
const handleUpdateCron = async (fields: JobForm) => {
  const hide = message.loading('正在修改');
  try {
    const res = await updateCronJob({ ...fields });
    hide();
    if (res.code === 0) {
      message.success('修改成功');
      return true;
    } else {
      message.error(res.message || '修改失败');
      return false;
    }
  } catch (_error) {
    hide();
    message.error('修改失败，请重试');
    return false;
  }
};

/**
 * 查询下次执行时间
 */
const handleQueryNextFireTimes = async (record: JobAndTrigger) => {
  try {
    const res = await queryJobNextFireTimes({
      jobClassName: record.jobClassName || '',
      jobGroupName: record.jobGroup || '',
      cronExpression: record.cronExpression,
    });
    if (res.code === 0 && res.data && res.data.length > 0) {
      Modal.info({
        title: '下次执行时间',
        width: 600,
        content: (
          <div>
            {res.data.map((time: string, index: number) => (
              <p key={index} style={{ marginBottom: 8 }}>
                {new Date(time).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            ))}
          </div>
        ),
      });
    } else {
      message.warning('暂无执行时间信息');
    }
  } catch (error) {
    message.error('查询失败，请重试');
  }
};

const JobManagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [updateCronModalVisible, setUpdateCronModalVisible] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<JobAndTrigger>();
  const [detailDrawerVisible, setDetailDrawerVisible] = useState<boolean>(false);

  const columns: ProColumns<JobAndTrigger>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      valueType: 'index',
      width: 60,
      render: (_, __, index) => {
        const id = _ || index + 1;
        return id;
      },
    },
    {
      title: '任务名称',
      dataIndex: 'jobName',
      copyable: true,
      ellipsis: true,
    },
    {
      title: '任务组',
      dataIndex: 'jobGroup',
      copyable: true,
    },
    {
      title: '任务类名',
      dataIndex: 'jobClassName',
      copyable: true,
      ellipsis: true,
      width: 200,
    },
    {
      title: '触发器名称',
      dataIndex: 'triggerName',
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '触发器组',
      dataIndex: 'triggerGroup',
      hideInSearch: true,
    },
    {
      title: 'Cron表达式',
      dataIndex: 'cronExpression',
      copyable: true,
      width: 150,
    },
    {
      title: '触发次数',
      dataIndex: 'timesTriggered',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '任务状态',
      dataIndex: 'triggerState',
      valueEnum: {
        WAITING: {
          text: '等待中',
          status: 'Default',
        },
        ACQUIRED: {
          text: '已获取',
          status: 'Processing',
        },
        EXECUTING: {
          text: '执行中',
          status: 'Processing',
        },
        COMPLETE: {
          text: '已完成',
          status: 'Success',
        },
        BLOCKED: {
          text: '阻塞',
          status: 'Error',
        },
        ERROR: {
          text: '错误',
          status: 'Error',
        },
        PAUSED: {
          text: '已暂停',
          status: 'Warning',
        },
        PAUSED_BLOCKED: {
          text: '暂停阻塞',
          status: 'Warning',
        },
      },
      render: (_, record) => {
        const state = record.triggerState || '';
        const stateMap: Record<string, { text: string; color: string }> = {
          WAITING: { text: '等待中', color: 'default' },
          ACQUIRED: { text: '已获取', color: 'processing' },
          EXECUTING: { text: '执行中', color: 'processing' },
          COMPLETE: { text: '已完成', color: 'success' },
          BLOCKED: { text: '阻塞', color: 'error' },
          ERROR: { text: '错误', color: 'error' },
          PAUSED: { text: '已暂停', color: 'warning' },
          PAUSED_BLOCKED: { text: '暂停阻塞', color: 'warning' },
        };
        const stateInfo = stateMap[state] || { text: state, color: 'default' };
        return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
      },
    },
    {
      title: '时区',
      dataIndex: 'timeZoneId',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      render: (_, record) => [
        <a
          key="detail"
          onClick={() => {
            setCurrentRow(record);
            setDetailDrawerVisible(true);
          }}
        >
          详情
        </a>,
        <a
          key="updateCron"
          onClick={() => {
            setCurrentRow(record);
            setUpdateCronModalVisible(true);
          }}
        >
          修改Cron
        </a>,
        record.triggerState === 'PAUSED' || record.triggerState === 'PAUSED_BLOCKED' ? (
          <a
            key="resume"
            onClick={async () => {
              const success = await handleResume(record);
              if (success && actionRef.current) {
                actionRef.current.reload();
              }
            }}
          >
            恢复
          </a>
        ) : (
          <a
            key="pause"
            onClick={async () => {
              const success = await handlePause(record);
              if (success && actionRef.current) {
                actionRef.current.reload();
              }
            }}
          >
            暂停
          </a>
        ),
        <a
          key="nextFireTimes"
          onClick={() => {
            handleQueryNextFireTimes(record);
          }}
        >
          <ClockCircleOutlined /> 下次执行
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除该任务吗？"
          onConfirm={async () => {
            const success = await handleDelete(record);
            if (success && actionRef.current) {
              actionRef.current.reload();
            }
          }}
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<JobAndTrigger>
        headerTitle="定时任务管理"
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
            <PlusOutlined /> 新建任务
          </Button>,
        ]}
        request={async (params) => {
          const res = await getJobList({
            currentPage: params.current,
            pageSize: params.pageSize,
          });
          if (res.code === 0) {
            return {
              data: res.data || [],
              success: true,
              total: res.data?.length || 0,
            };
          }
          return {
            data: [],
            success: false,
          };
        }}
        columns={columns}
      />

      {/* 添加任务表单 */}
      <ModalForm
        title="新建定时任务"
        width="500px"
        visible={createModalVisible}
        onVisibleChange={setCreateModalVisible}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          const success = await handleAdd(value as JobForm);
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
              message: '任务类名为必填项',
            },
          ]}
          width="md"
          name="jobClassName"
          label="任务类名"
          placeholder="请输入完整的任务类名，如：com.example.job.MyJob"
          tooltip="定时任务的全限定类名，该类必须实现Job接口"
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '任务组名为必填项',
            },
          ]}
          width="md"
          name="jobGroupName"
          label="任务组名"
          placeholder="请输入任务组名"
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: 'Cron表达式为必填项',
            },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                // Quartz Cron表达式格式：秒 分 时 日 月 周 [年]
                // 基本格式检查：6或7个字段，用空格分隔
                const trimmed = value.trim();
                const fields = trimmed.split(/\s+/);
                
                if (fields.length < 6 || fields.length > 7) {
                  return Promise.reject(new Error('Cron表达式必须包含6或7个字段（秒 分 时 日 月 周 [年]）'));
                }
                
                // 检查每个字段是否包含有效的字符
                // 允许的字符：*, ?, 数字, -, /, ,, L, W, #, C
                const fieldPattern = /^[\*\?0-9\-\/\,\#LW]+$/;
                
                for (let i = 0; i < fields.length; i++) {
                  const field = fields[i];
                  if (!fieldPattern.test(field)) {
                    return Promise.reject(new Error(`字段${i + 1}包含无效字符，允许的字符：*, ?, 数字, -, /, ,, L, W, #, C`));
                  }
                }
                
                // 检查日和周的互斥性（日和周不能同时指定值，必须有一个是?）
                if (fields.length >= 6) {
                  const dayField = fields[3]; // 日字段
                  const weekField = fields[5]; // 周字段
                  if (dayField !== '?' && dayField !== '*' && weekField !== '?' && weekField !== '*') {
                    return Promise.reject(new Error('日和周字段不能同时指定值，其中一个必须是 ? 或 *'));
                  }
                }
                
                return Promise.resolve();
              },
            },
          ]}
          width="md"
          name="cronExpression"
          label="Cron表达式"
          placeholder="0 0/5 * * * ?"
          tooltip="Cron表达式格式：秒 分 时 日 月 周，例如：0 0/5 * * * ? 表示每5分钟执行一次"
        />
      </ModalForm>

      {/* 修改Cron表达式表单 */}
      <ModalForm
        title="修改Cron表达式"
        width="500px"
        visible={updateCronModalVisible}
        onVisibleChange={setUpdateCronModalVisible}
        initialValues={{
          jobClassName: currentRow?.jobClassName,
          jobGroupName: currentRow?.jobGroup,
          cronExpression: currentRow?.cronExpression,
        }}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (value) => {
          const success = await handleUpdateCron(value as JobForm);
          if (success) {
            setUpdateCronModalVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }
        }}
      >
        <ProFormText
          width="md"
          name="jobClassName"
          label="任务类名"
          disabled
        />
        <ProFormText
          width="md"
          name="jobGroupName"
          label="任务组名"
          disabled
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: 'Cron表达式为必填项',
            },
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }
                // Quartz Cron表达式格式：秒 分 时 日 月 周 [年]
                // 基本格式检查：6或7个字段，用空格分隔
                const trimmed = value.trim();
                const fields = trimmed.split(/\s+/);
                
                if (fields.length < 6 || fields.length > 7) {
                  return Promise.reject(new Error('Cron表达式必须包含6或7个字段（秒 分 时 日 月 周 [年]）'));
                }
                
                // 检查每个字段是否包含有效的字符
                // 允许的字符：*, ?, 数字, -, /, ,, L, W, #, C
                const fieldPattern = /^[\*\?0-9\-\/\,\#LW]+$/;
                
                for (let i = 0; i < fields.length; i++) {
                  const field = fields[i];
                  if (!fieldPattern.test(field)) {
                    return Promise.reject(new Error(`字段${i + 1}包含无效字符，允许的字符：*, ?, 数字, -, /, ,, L, W, #, C`));
                  }
                }
                
                // 检查日和周的互斥性（日和周不能同时指定值，必须有一个是?）
                if (fields.length >= 6) {
                  const dayField = fields[3]; // 日字段
                  const weekField = fields[5]; // 周字段
                  if (dayField !== '?' && dayField !== '*' && weekField !== '?' && weekField !== '*') {
                    return Promise.reject(new Error('日和周字段不能同时指定值，其中一个必须是 ? 或 *'));
                  }
                }
                
                return Promise.resolve();
              },
            },
          ]}
          width="md"
          name="cronExpression"
          label="Cron表达式"
          placeholder="0 0/5 * * * ?"
          tooltip="Cron表达式格式：秒 分 时 日 月 周，例如：0 0/5 * * * ? 表示每5分钟执行一次"
        />
      </ModalForm>

      {/* 任务详情抽屉 */}
      <DrawerForm
        title="任务详情"
        width={600}
        visible={detailDrawerVisible}
        onVisibleChange={setDetailDrawerVisible}
        submitter={false}
      >
        {currentRow && (
          <ProDescriptions<JobAndTrigger>
            column={2}
            dataSource={currentRow}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
              },
              {
                title: '任务名称',
                dataIndex: 'jobName',
              },
              {
                title: '任务组',
                dataIndex: 'jobGroup',
              },
              {
                title: '任务类名',
                dataIndex: 'jobClassName',
                copyable: true,
              },
              {
                title: '触发器名称',
                dataIndex: 'triggerName',
              },
              {
                title: '触发器组',
                dataIndex: 'triggerGroup',
              },
              {
                title: 'Cron表达式',
                dataIndex: 'cronExpression',
                copyable: true,
              },
              {
                title: '触发次数',
                dataIndex: 'timesTriggered',
              },
              {
                title: '重复间隔',
                dataIndex: 'repeatInterval',
              },
              {
                title: '任务状态',
                dataIndex: 'triggerState',
                render: (text) => {
                  const stateMap: Record<string, { text: string; color: string }> = {
                    WAITING: { text: '等待中', color: 'default' },
                    ACQUIRED: { text: '已获取', color: 'processing' },
                    EXECUTING: { text: '执行中', color: 'processing' },
                    COMPLETE: { text: '已完成', color: 'success' },
                    BLOCKED: { text: '阻塞', color: 'error' },
                    ERROR: { text: '错误', color: 'error' },
                    PAUSED: { text: '已暂停', color: 'warning' },
                    PAUSED_BLOCKED: { text: '暂停阻塞', color: 'warning' },
                  };
                  const stateInfo = stateMap[text as string] || { text: text as string, color: 'default' };
                  return <Tag color={stateInfo.color}>{stateInfo.text}</Tag>;
                },
              },
              {
                title: '时区',
                dataIndex: 'timeZoneId',
              },
            ]}
          />
        )}
      </DrawerForm>
    </PageContainer>
  );
};

export default JobManagePage;
