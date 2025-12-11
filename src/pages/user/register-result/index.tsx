import { Link, useSearchParams } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';
import useStyles from './style.style';

const RegisterResult: React.FC<Record<string, unknown>> = () => {
  const { styles } = useStyles();
  const [params] = useSearchParams();

  const actions = (
    <div className={styles.actions}>
      <Link to="/">
        <Button size="large">返回首页</Button>
      </Link>
    </div>
  );

  const userAccount = params?.get('userAccount') || 'AntDesign@example.com';
  return (
    <Result
      className={styles.registerResult}
      status="success"
      title={
        <div className={styles.title}>
          <span>你的账户：{userAccount} 注册成功</span>
        </div>
      }
      subTitle="恭喜您注册成功，祝你开心。"
      extra={actions}
    />
  );
};
export default RegisterResult;
