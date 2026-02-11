import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormTimePicker,
  ProTable,
} from '@ant-design/pro-components';
import {Button, message, Popconfirm, Space, Tag} from 'antd';
import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import React, {useRef, useState} from 'react';
import type {
  ShiftGroup,
  ShiftGroupQueryRequest,
  ShiftGroupSaveRequest,
} from './data';
import {
  deleteShiftGroup,
  listShiftGroupByPage,
  saveShiftGroup,
} from './service';

/**
 * 班次基础维护页面
 */
const ShiftGroupPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<ShiftGroup | undefined>();

  const handleSubmit = async (values: any) => {
    const hide = message.loading('保存中...');
    try {
      const startVal = values.shiftStartTime;
      const endVal = values.shiftEndTime;
      const payload: ShiftGroupSaveRequest = {
        id: currentRecord?.id,
        shiftCode: values.shiftCode,
        shiftName: values.shiftName,
        // 统一格式化为字符串（兼容 Dayjs / 'HH:mm:ss' 字符串）
        shiftStartTime: startVal
          ? dayjs(startVal, 'HH:mm:ss').format('HH:mm:ss')
          : '',
        shiftEndTime: endVal
          ? dayjs(endVal, 'HH:mm:ss').format('HH:mm:ss')
          : '',
        status: values.status ? 1 : 0,
        remark: values.remark,
      };
      const res = await saveShiftGroup(payload);
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
      console.log(_e)
      return false;
    } finally {
      hide();
    }
  };

  const handleDelete = async (record: ShiftGroup) => {
    if (!record.id) {
      message.error('ID 为空，无法删除');
      return;
    }
    const hide = message.loading('删除中...');
    try {
      const res = await deleteShiftGroup(record.id);
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

  const columns: ProColumns<ShiftGroup>[] = [
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
        0: {text: '停用', status: 'Default'},
        1: {text: '启用', status: 'Success'},
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
      width: 200,
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
            title="确认删除该记录？"
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
      <ProTable<ShiftGroup, ShiftGroupQueryRequest>
        headerTitle="班次基础维护"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            onClick={() => {
              setCurrentRecord(undefined);
              setModalVisible(true);
            }}
          >
            新增
          </Button>,
        ]}
        request={async (params) => {
          const query: ShiftGroupQueryRequest = {
            current: params.current,
            pageSize: params.pageSize,
            shiftCode: params.shiftCode as string,
            shiftName: params.shiftName as string,
            status: params.status as number,
          };
          const res = await listShiftGroupByPage(query);
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
        pagination={{
          defaultPageSize: 10,
        }}
      />

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
        <ProFormText
          name="shiftCode"
          label="班次编码"
          rules={[{required: true, message: '请输入班次编码'}]}
        />
        <ProFormText
          name="shiftName"
          label="班次名称"
          rules={[{required: true, message: '请输入班次名称'}]}
        />
        <ProFormTimePicker
          name="shiftStartTime"
          label="开始时间"
          dependencies={['shiftEndTime']}
          rules={[
            {required: true, message: '请选择开始时间'},
            ({getFieldValue}) => ({
              validator(_, value: any) {
                const start = value ? dayjs(value, 'HH:mm:ss') : null;
                const endRaw = getFieldValue('shiftEndTime');
                const end = endRaw ? dayjs(endRaw, 'HH:mm:ss') : null;
                if (!start || !end) {
                  return Promise.resolve();
                }
                if (start.isAfter(end)) {
                  return Promise.reject(
                    new Error('开始时间不能晚于结束时间'),
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
        />
        <ProFormTimePicker
          name="shiftEndTime"
          label="结束时间"
          dependencies={['shiftStartTime']}
          rules={[
            {required: true, message: '请选择结束时间'},
            ({getFieldValue}) => ({
              validator(_, value: any) {
                const end = value ? dayjs(value, 'HH:mm:ss') : null;
                const startRaw = getFieldValue('shiftStartTime');
                const start = startRaw ? dayjs(startRaw, 'HH:mm:ss') : null;
                if (!end || !start) {
                  return Promise.resolve();
                }
                if (end.isBefore(start)) {
                  return Promise.reject(
                    new Error('结束时间不能早于开始时间'),
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
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
        <ProFormTextArea name="remark" label="备注"/>
      </ModalForm>
    </PageContainer>
  );
};

export default ShiftGroupPage;

