import React from 'react';
import {InboxOutlined} from '@ant-design/icons';
import type {UploadProps} from 'antd';
import {message, Upload} from 'antd';
import type {UploadFileResult} from './data';
import {uploadToRemote} from './service';

const {Dragger} = Upload;

const props: UploadProps = {
  multiple: true,
  customRequest: async ({ file, onSuccess, onError }) => {
    try {
      const uploadFileRequest = {
        biz: "user_avatar",
      };

      // 构造 FormData
      const formData = new FormData();
      formData.append('file', file);   // 后端字段名保持一致即可
      formData.append(
        'uploadFileRequest',
        new Blob([JSON.stringify(uploadFileRequest)], { type: 'application/json' })
      );

      // 调你自己的接口
      const res: UploadFileResult = await uploadToRemote(formData);

      // 通知 Upload 组件“上传完成”，它会自动把状态改成 done
      onSuccess?.(res);
      message.success(`${file.name} 上传成功`);
    } catch (err: any) {
      onError?.(err);
      message.error(`${file.name} 上传失败`);
    }
  },
  onChange(info) {
    const {status} = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
  onDrop(e) {
    console.log('Dropped files', e.dataTransfer.files);
  },
};

const FileRemoteUpload: React.FC = () => (
  <Dragger {...props}>
    <p className="ant-upload-drag-icon">
      <InboxOutlined/>
    </p>
    <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
    <p className="ant-upload-hint">
      远程文件上传，
      支持单个或批量上传。严禁上传公司数据或其他被禁止的文件。
    </p>
  </Dragger>
);

export default FileRemoteUpload;
