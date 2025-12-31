import RemoteFile from './components/RemoteFile';
import LocalFile  from './components/LocalFile';
import { Tabs } from 'antd';

const Manage: React.FC = () => {
  const items = [
    { key: 'remote', label: '远程文件', children: <RemoteFile /> },
    { key: 'local',  label: '本地文件', children: <LocalFile /> },
  ];
  return <Tabs defaultActiveKey="remote" items={items} />;
};
export default Manage;
