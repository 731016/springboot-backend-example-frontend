import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      copyright="xiaofei.site"
      links={[
        {
          key: 'Blog',
          title: '博客',
          href: 'https://xiaofei.site',
          blankTarget: true,
        },
        {
          key: 'github',
          title: <GithubOutlined />,
          href: 'https://github.com/731016',
          blankTarget: true,
        }
      ]}
    />
  );
};

export default Footer;
