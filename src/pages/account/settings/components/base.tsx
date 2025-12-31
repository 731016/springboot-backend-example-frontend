import {UploadOutlined} from '@ant-design/icons';
import {
  ProForm,
  ProFormDependency,
  ProFormFieldSet,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {useRequest} from '@umijs/max';
import {Button, Input, message, Upload, UploadProps} from 'antd';
import React, {useEffect} from 'react';
import {queryCity, queryCurrent, queryProvince, updateCurrentUser} from '../service';
import useStyles from './index.style';
import {useState} from "react";

const validatorPhone = (
  _rule: any,
  value: string[],
  callback: (message?: string) => void,
) => {
  if (!value[0]) {
    callback('Please input your area code!');
  }
  if (!value[1]) {
    callback('Please input your phone number!');
  }
  callback();
};

const BaseView: React.FC = () => {
  const {styles} = useStyles();
  const {data: currentUser, loading} = useRequest(() => {
    return queryCurrent();
  });

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  // currentUser 加载完成后把初始头像写进去
  useEffect(() => {
    setAvatarUrl(currentUser?.userAvatar || '');
  }, [currentUser]);

  // 头像组件 方便以后独立，增加裁剪之类的功能
  const AvatarView = ({
                        userAvatar,
                        onAvatarChange
                      }: {
    userAvatar: string;
    onAvatarChange: (url: string) => void;
  }) => {
    const handleChange = (info) => {
      if (info.file.status === 'done') {
        // 假设后端返回 { code:0 , data:"http://xxx.jpg" }
        const res = info.file.response;
        if (res?.code === 0 && res.data) {
          message.success('头像更新成功');
          onAvatarChange(res.data);
        } else {
          message.error(res?.message || '上传失败');
        }
      } else if (info.file.status === 'error') {
        message.error('上传失败');
      }
    };

    return (
      <>
        <div className={styles.avatar_title}>头像</div>
        <div className={styles.avatar}>
          <img src={userAvatar} alt="avatar"/>
        </div>
        <Upload showUploadList={false} action="/api/file/upload?biz=user_avatar" name="file" onChange={handleChange}>
          <div className={styles.button_view}>
            <Button>
              <UploadOutlined/>
              更换头像
            </Button>
          </div>
        </Upload>
      </>
    )
  };
  const getAvatarURL = () => {
    if (currentUser) {
      if (currentUser.userAvatar) {
        return currentUser.userAvatar;
      }
      return '';
    }
    return '';
  };
  const handleFinish = async (formData: API.CurrentUser) => {
    const data = await updateCurrentUser({...formData, id: currentUser?.id, userAvatar: avatarUrl,})
    if (data?.code === 0) {
      message.success('更新基本信息成功');
    }
  };

  function updateAvatarUrl(newUrl: string) {
    setAvatarUrl(newUrl);      // 立即刷新头像
  };
  return (
    <div className={styles.baseView}>
      {loading ? null : (
        <>
          <div className={styles.left}>
            <ProForm
              layout="vertical"
              onFinish={handleFinish}
              submitter={{
                searchConfig: {
                  submitText: '更新基本信息',
                },
                render: (_, dom) => dom[1],
              }}
              initialValues={{
                ...currentUser,
              }}
              hideRequiredMark
            >
              <ProFormText
                width="md"
                name="userName"
                label="昵称"
                rules={[
                  {
                    required: true,
                    message: '请输入您的昵称!',
                  },
                ]}
              />
              <ProFormTextArea
                name="userProfile"
                label="个人简介"
                rules={[
                  {
                    required: true,
                    message: '请输入个人简介!',
                  },
                ]}
                placeholder="个人简介"
              />
            </ProForm>
          </div>
          <div className={styles.right}>
            <AvatarView userAvatar={getAvatarURL()} onAvatarChange={updateAvatarUrl}/>
          </div>
        </>
      )}
    </div>
  );
};
export default BaseView;
