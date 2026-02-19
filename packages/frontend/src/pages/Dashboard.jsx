import { Card, Typography } from 'antd';
import { useAuth } from '../hooks/useAuth';
import './Dashboard.scss';

const { Title } = Typography;

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <Title level={2}>Welcome, {user?.full_name || user?.email}!</Title>
      <Card title="User Information" bordered={false}>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        {user?.business_name && <p><strong>Business:</strong> {user.business_name}</p>}
      </Card>
    </div>
  );
};

export default Dashboard;
