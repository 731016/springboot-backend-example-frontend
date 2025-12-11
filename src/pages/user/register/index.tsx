import {history, Link, useRequest} from '@umijs/max';
import {
  Button,
  Col,
  Form,
  Input,
  message,
  Popover,
  Progress,
  Row,
  Select,
  Card,
  Space,
} from 'antd';
import type {Store} from 'antd/es/form/interface';
import type {FC} from 'react';
import {useEffect, useState} from 'react';
import type {StateType} from './service';
import {fakeRegister} from './service';
import useStyles from './styles';
import {login} from "@/services/ant-design-pro/api";

const FormItem = Form.Item;
const {Option} = Select;

const passwordProgressMap: {
  ok: 'success';
  pass: 'normal';
  poor: 'exception';
} = {
  ok: 'success',
  pass: 'normal',
  poor: 'exception',
};
const Register: FC = () => {
  const {styles} = useStyles();
  const [count, setCount]: [number, any] = useState(0);
  const [open, setVisible]: [boolean, any] = useState(false);
  const [prefix, setPrefix]: [string, any] = useState('86');
  const [popover, setPopover]: [boolean, any] = useState(false);
  const confirmDirty = false;
  let interval: number | undefined;

  const passwordStatusMap = {
    ok: (
      <div className={styles.success}>
        <span>强度：强</span>
      </div>
    ),
    pass: (
      <div className={styles.warning}>
        <span>强度：中</span>
      </div>
    ),
    poor: (
      <div className={styles.error}>
        <span>强度：太短</span>
      </div>
    ),
  };

  const [form] = Form.useForm();
  useEffect(
    () => () => {
      clearInterval(interval);
    },
    [interval],
  );
  const onGetCaptcha = () => {
    let counts = 59;
    setCount(counts);
    interval = window.setInterval(() => {
      counts -= 1;
      setCount(counts);
      if (counts === 0) {
        clearInterval(interval);
      }
    }, 1000);
  };
  const getPasswordStatus = () => {
    const value = form.getFieldValue('userPassword');
    if (value && value.length > 9) {
      return 'ok';
    }
    if (value && value.length > 5) {
      return 'pass';
    }
    return 'poor';
  };
  const {loading: submitting, run: register} = useRequest(fakeRegister, {
    manual: true,
    onSuccess: (data, params) => {
      if (data) {
        message.success('注册成功！');
        history.push({
          pathname: `/user/register-result?userAccount=${params[0].userAccount}`,
        });
      }
    },
  });
  const onFinish = (values: Store) => {
    register(values);
  };
  const checkConfirm = (_: any, value: string) => {
    const promise = Promise;
    if (value && value !== form.getFieldValue('userPassword')) {
      return promise.reject('两次输入的密码不匹配!');
    }
    return promise.resolve();
  };
  const checkPassword = (_: any, value: string) => {
    const promise = Promise;
    // 没有值的情况
    if (!value) {
      setVisible(!!value);
      return promise.reject('请输入密码!');
    }
    // 有值的情况
    if (!open) {
      setVisible(!!value);
    }
    setPopover(!popover);
    if (value.length < 8) {
      return promise.reject('');
    }
    if (value && confirmDirty) {
      form.validateFields(['checkPassword']);
    }
    return promise.resolve();
  };
  const changePrefix = (value: string) => {
    setPrefix(value);
  };
  const renderPasswordProgress = () => {
    const value = form.getFieldValue('userPassword');
    const passwordStatus = getPasswordStatus();
    return value?.length ? (
      <div
        className={styles[`progress-${passwordStatus}` as keyof typeof styles]}
      >
        <Progress
          status={passwordProgressMap[passwordStatus]}
          strokeWidth={6}
          percent={value.length * 10 > 100 ? 100 : value.length * 10}
          showInfo={false}
        />
      </div>
    ) : null;
  };
  return (
    <Card title="注册" className={styles.main}>
      <Form form={form} name="UserRegister" onFinish={onFinish}>
        <FormItem
          name="userAccount"
          rules={[
            {
              required: true,
              message: '请输入邮箱地址!',
            },
            {
              type: 'string',
              message: '账号格式错误!',
            },
          ]}
        >
          <Input size="large" placeholder="账号"/>
        </FormItem>
        <Popover
          getPopupContainer={(node) => {
            if (node?.parentNode) {
              return node.parentNode as HTMLElement;
            }
            return node;
          }}
          content={
            open && (
              <div
                style={{
                  padding: '4px 0',
                }}
              >
                {passwordStatusMap[getPasswordStatus()]}
                {renderPasswordProgress()}
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <span>请至少输入 8 个字符。请不要使用容易被猜到的密码。</span>
                </div>
              </div>
            )
          }
          overlayStyle={{
            width: 240,
          }}
          placement="right"
          open={open}
        >
          <FormItem
            name="userPassword"
            className={
              form.getFieldValue('userPassword') &&
              form.getFieldValue('userPassword').length > 0 &&
              styles.password
            }
            rules={[
              {
                validator: checkPassword,
              },
            ]}
          >
            <Input
              size="large"
              type="password"
              placeholder="至少8位密码，区分大小写"
            />
          </FormItem>
        </Popover>
        <FormItem
          name="checkPassword"
          rules={[
            {
              required: true,
              message: '确认密码',
            },
            {
              validator: checkConfirm,
            },
          ]}
        >
          <Input size="large" type="password" placeholder="确认密码"/>
        </FormItem>
        <FormItem>
          <div className={styles.footer}>
            <Button
              size="large"
              loading={submitting}
              className={styles.submit}
              type="primary"
              htmlType="submit"
            >
              <span>注册</span>
            </Button>
            <Link to="/user/login">
              <span>使用已有账户登录</span>
            </Link>
          </div>
        </FormItem>
      </Form>
    </Card>
  );
};
export default Register;
