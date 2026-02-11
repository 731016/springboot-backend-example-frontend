import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDatePicker,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormTimePicker,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Calendar, Card, message, Popconfirm, Space, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import type {
  WorkCalendar,
  WorkCalendarQueryRequest,
  WorkCalendarSaveRequest,
} from './data';
import {
  deleteWorkCalendar,
  listWorkCalendarByPage,
  saveWorkCalendar,
} from './service';

/**
 * 工作日历维护页面（带日历控件）
 */
const WorkCalendarPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<WorkCalendar | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const handleCalendarSelect = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    // 选择日期后刷新当前日期的班次列表
    actionRef.current?.reload();
  };

  const handleSubmit = async (values: any) => {
    const hide = message.loading('保存中...');
    try {
      const payload: WorkCalendarSaveRequest = {
        id: currentRecord?.id,
        workDate: values.workDate
          ? (values.workDate as Dayjs).format('YYYY-MM-DD')
          : selectedDate,
        shiftCode: values.shiftCode,
        shiftName: values.shiftName,
        shiftStartTime: values.shiftStartTime
          ? (values.shiftStartTime as Dayjs).format('HH:mm:ss')
          : '',
        shiftEndTime: values.shiftEndTime
          ? (values.shiftEndTime as Dayjs).format('HH:mm:ss')
          : '',
        status: values.status ? 1 : 0,
        remark: values.remark,
      };
      const res = await saveWorkCalendar(payload);
      if (res.code === 0) {
        message.success('保存成功');
        setModalVisible(false);
        setCurrentRecord(undefined);
        actionRef.current?.reload();
        return true;
      }
      message.error(res.message || '保存失败');
      return false;
    } catch (_e) {
      message.error('保存失败，请重试');
      return false;
    } finally {
      hide();
    }
  };

  const handleDelete = async (record: WorkCalendar) => {
    if (!record.id) {
      message.error('ID 为空，无法删除');
      return;
    }
    const hide = message.loading('删除中...');
    try {
      const res = await deleteWorkCalendar(record.id);
      if (res.code === 0 && res.data) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (_e) {
      message.error('删除失败，请重试');
    } finally {
      hide();
    }
  };

  const columns: ProColumns<WorkCalendar>[] = [
    {
      title: '班次编码',
      dataIndex: 'shiftCode',
      valueType: 'text',
    },
    {
      title: '班次名称',
      dataIndex: 'shiftName',
      valueType: 'text',
    },
    {
      title: '开始时间',
      dataIndex: 'shiftStartTime',
      valueType: 'text',
      search: false,
    },
    {
      title: '结束时间',
      dataIndex: 'shiftEndTime',
      valueType: 'text',
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '停用', status: 'Default' },
        1: { text: '启用', status: 'Success' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          <a
            onClick={() => {
              setCurrentRecord(record);
              setModalVisible(true);
            }}
          >
            编辑
          </a>
          <Popconfirm
            title="确认删除该班次？"
            onConfirm={() => handleDelete(record)}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      {/* 上半部分：日历控件，按日期管理班次 */}
      <Card
        title="工作日历"
        style={{ marginBottom: 16 }}
        extra={
          <span>
            当前选择日期：
            <Tag color="blue">{selectedDate}</Tag>
          </span>
        }
      >
        <Calendar
          fullscreen={false}
          value={dayjs(selectedDate)}
          onSelect={handleCalendarSelect}
        />
      </Card>

      {/* 下半部分：选中日期的班次列表 */}
      <ProTable<WorkCalendar, WorkCalendarQueryRequest>
        headerTitle="当日班次列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            onClick={() => {
              setCurrentRecord(undefined);
              setModalVisible(true);
            }}
          >
            新增班次
          </Button>,
        ]}
        request={async () => {
          const query: WorkCalendarQueryRequest = {
            current: 1,
            pageSize: 50,
            workDate: selectedDate,
          };
          const res = await listWorkCalendarByPage(query);
          if (res.code !== 0) {
            message.error(res.message || '查询失败');
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
          return {
            data: res.data?.records || [],
            success: true,
            total: res.data?.total || 0,
          };
        }}
        columns={columns}
        pagination={false}
      />

      {/* 新增 / 编辑班次弹窗 */}
      <ModalForm
        title={currentRecord?.id ? '编辑班次' : '新增班次'}
        open={modalVisible}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setModalVisible(false);
            setCurrentRecord(undefined);
          },
        }}
        initialValues={{
          ...currentRecord,
          workDate: currentRecord?.workDate
            ? dayjs(currentRecord.workDate)
            : dayjs(selectedDate),
          shiftStartTime: currentRecord?.shiftStartTime
            ? dayjs(currentRecord.shiftStartTime, 'HH:mm:ss')
            : undefined,
          shiftEndTime: currentRecord?.shiftEndTime
            ? dayjs(currentRecord.shiftEndTime, 'HH:mm:ss')
            : undefined,
          status: currentRecord ? currentRecord.status === 1 : true,
        }}
        onFinish={handleSubmit}
      >
        <ProFormDatePicker
          name="workDate"
          label="工作日期"
          rules={[{ required: true, message: '请选择工作日期' }]}
        />
        <ProFormText
          name="shiftCode"
          label="班次编码"
          rules={[{ required: true, message: '请输入班次编码' }]}
        />
        <ProFormText
          name="shiftName"
          label="班次名称"
          rules={[{ required: true, message: '请输入班次名称' }]}
        />
        <ProFormTimePicker
          name="shiftStartTime"
          label="开始时间"
          rules={[{ required: true, message: '请选择开始时间' }]}
        />
        <ProFormTimePicker
          name="shiftEndTime"
          label="结束时间"
          rules={[{ required: true, message: '请选择结束时间' }]}
        />
        <ProFormSwitch
          name="status"
          label="是否启用"
          fieldProps={{
            checkedChildren: '启用',
            unCheckedChildren: '停用',
            defaultChecked: true,
          }}
        />
        <ProFormTextArea name="remark" label="备注" />
      </ModalForm>
    </PageContainer>
  );
};

export default WorkCalendarPage;
