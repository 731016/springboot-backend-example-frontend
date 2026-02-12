import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDatePicker,
  ProFormSwitch,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Calendar, Card, DatePicker, message, Popconfirm, Space, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import type {
  WorkCalendar,
  WorkCalendarQueryRequest,
  WorkCalendarSaveRequest,
} from './data';
import type { ShiftGroup, ShiftGroupQueryRequest } from '../shift-group/data';
import { listShiftGroupByPage as listBaseShiftGroupByPage } from '../shift-group/service';
import {
  deleteWorkCalendar,
  listWorkCalendarByPage,
  saveWorkCalendar,
} from './service';

/**
 * 工作日历维护页面（带日历控件）
 */
const WorkCalendarPage: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<WorkCalendar | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [shiftOptions, setShiftOptions] = useState<ShiftGroup[]>([]);
  const [selectedShiftKeys, setSelectedShiftKeys] = useState<React.Key[]>([]);
  const [selectedShiftRows, setSelectedShiftRows] = useState<ShiftGroup[]>([]);

  // 日历仅用于选择要查看的日期，刷新下方当日班次列表
  const handleCalendarSelect = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    setCalendarValue(value);
    actionRef.current?.reload();
  };

  // 自定义日历头部：左侧前后月切换，右上方直接选择年份和月份
  const calendarHeaderRender = ({
    value,
    onChange,
  }: {
    value: Dayjs;
    onChange: (date: Dayjs) => void;
  }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => {
            const next = value.subtract(1, 'month');
            setCalendarValue(next);
            onChange(next);
          }}
        />
        <span style={{ fontWeight: 500, minWidth: 72, textAlign: 'center' }}>{value.format('YYYY年M月')}</span>
        <Button
          type="text"
          icon={<RightOutlined />}
          onClick={() => {
            const next = value.add(1, 'month');
            setCalendarValue(next);
            onChange(next);
          }}
        />
      </div>
      <DatePicker
        picker="month"
        value={value}
        onChange={(date) => {
          if (date) {
            setCalendarValue(date);
            onChange(date);
          }
        }}
        allowClear={false}
        placeholder="选择年月"
        style={{ width: 120 }}
      />
    </div>
  );

  /**
   * 加载班次基础数据（来自班次管理页面）
   */
  useEffect(() => {
    const query: ShiftGroupQueryRequest = {
      current: 1,
      pageSize: 1000,
      status: 1,
    };
    listBaseShiftGroupByPage(query).then((res) => {
      if (res.code !== 0) {
        message.error(res.message || '加载班次数据失败');
        return;
      }
      setShiftOptions(res.data?.records || []);
    });
  }, []);

  const handleSubmit = async (values: any) => {
    if (!selectedShiftRows.length) {
      message.error('请选择至少一个班次');
      return false;
    }

    const hide = message.loading('保存中...');
    try {
      const statusVal = values.status ? 1 : 0;

      // 编辑模式：只更新当前这一条
      if (currentRecord?.id) {
        const shift = selectedShiftRows[0];
        const workDate = values.startDate
          ? dayjs(values.startDate).format('YYYY-MM-DD')
          : selectedDate;
        const payload: WorkCalendarSaveRequest = {
          id: currentRecord.id,
          workDate,
          shiftCode: shift.shiftCode || '',
          shiftName: shift.shiftName || '',
          shiftStartTime: shift.shiftStartTime || '',
          shiftEndTime: shift.shiftEndTime || '',
          status: statusVal,
          remark: values.remark,
        };
        const res = await saveWorkCalendar(payload);
        if (res.code === 0) {
          message.success('保存成功');
          setModalVisible(false);
          setCurrentRecord(undefined);
          setSelectedShiftKeys([]);
          setSelectedShiftRows([]);
          actionRef.current?.reload();
          return true;
        }
        message.error(res.message || '保存失败');
        return false;
      }

      // 生成模式：按开始日期～结束日期区间生成
      // Ant Design Pro 默认会把日期字段在 onFinish 里格式化为字符串，这里统一用 dayjs 再包一层
      const start = values.startDate ? dayjs(values.startDate) : dayjs(selectedDate);
      const end = values.endDate ? dayjs(values.endDate) : start;
      if (end.isBefore(start, 'day')) {
        message.error('结束日期不能早于开始日期');
        return false;
      }
      const workDates: string[] = [];
      let d = start.startOf('day');
      const endDay = end.startOf('day');
      while (!d.isAfter(endDay)) {
        workDates.push(d.format('YYYY-MM-DD'));
        d = d.add(1, 'day');
      }

      for (const dateStr of workDates) {
        for (const shift of selectedShiftRows) {
          const payload: WorkCalendarSaveRequest = {
            workDate: dateStr,
            shiftCode: shift.shiftCode || '',
            shiftName: shift.shiftName || '',
            shiftStartTime: shift.shiftStartTime || '',
            shiftEndTime: shift.shiftEndTime || '',
            status: statusVal,
            remark: values.remark,
          };
          const res = await saveWorkCalendar(payload);
          if (res.code !== 0) {
            message.error(
              res.message ||
                `保存 ${dateStr} 班次 ${
                  shift.shiftName || shift.shiftCode
                } 失败`,
            );
            return false;
          }
        }
      }

      message.success('保存成功');
      setModalVisible(false);
      setCurrentRecord(undefined);
      setSelectedShiftKeys([]);
      setSelectedShiftRows([]);
      actionRef.current?.reload();
      return true;
    } catch (_e) {
      message.error('保存失败，请重试');
      console.log(_e)
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

  const shiftColumns: ProColumns<ShiftGroup>[] = [
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
    },
    {
      title: '结束时间',
      dataIndex: 'shiftEndTime',
      valueType: 'text',
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
          value={calendarValue}
          onSelect={handleCalendarSelect}
          headerRender={calendarHeaderRender}
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
              setSelectedShiftKeys([]);
              setSelectedShiftRows([]);
              setModalVisible(true);
            }}
          >
            生成班次
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

      {/* 生成班次 / 编辑班次弹窗 */}
      <ModalForm
        title={currentRecord?.id ? '编辑班次' : '生成班次'}
        open={modalVisible}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setModalVisible(false);
            setCurrentRecord(undefined);
            setSelectedShiftKeys([]);
            setSelectedShiftRows([]);
          },
        }}
        initialValues={{
          ...currentRecord,
          startDate: currentRecord?.workDate
            ? dayjs(currentRecord.workDate)
            : dayjs(selectedDate),
          endDate: currentRecord?.workDate
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
          name="startDate"
          label="开始日期"
          rules={[{ required: true, message: '请选择开始日期' }]}
        />
        <ProFormDatePicker
          name="endDate"
          label="结束日期"
          dependencies={['startDate']}
          rules={[
            { required: true, message: '请选择结束日期' },
            ({ getFieldValue }: { getFieldValue: (name: string) => Dayjs }) => ({
              validator(_: unknown, value: Dayjs) {
                const start = getFieldValue('startDate');
                if (!value || !start) return Promise.resolve();
                if (value.isBefore(start, 'day')) {
                  return Promise.reject(new Error('结束日期不能早于开始日期'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        />
        <ProTable<ShiftGroup>
          rowKey="shiftCode"
          search={false}
          options={false}
          pagination={false}
          dataSource={shiftOptions}
          columns={shiftColumns}
          rowSelection={{
            type: currentRecord?.id ? 'radio' : 'checkbox',
            selectedRowKeys: selectedShiftKeys,
            onChange: (keys, rows) => {
              setSelectedShiftKeys(keys);
              setSelectedShiftRows(rows as ShiftGroup[]);
            },
          }}
          tableAlertRender={false}
          tableAlertOptionRender={false}
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
