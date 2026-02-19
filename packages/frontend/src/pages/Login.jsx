import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.scss';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      login(
        { identifier: values.identifier, password: values.password },
        {
          onSuccess: () => {
            message.success('Login successful!');
            navigate('/dashboard');
          },
          onError: (error) => {
            message.error(error.response?.data?.error || 'Login failed');
          },
        }
      );
    } catch (error) {
      message.error('An error occurred');
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="Login">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="Email or Username"
            name="identifier"
            rules={[{ required: true, message: 'Please input your email or username!' }]}
          >
            <Input placeholder="Enter email or username" size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password placeholder="Enter password" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={isLoading}>
              Login
            </Button>
          </Form.Item>

        </Form>
      </Card>
    </div>
  );
};

export default Login;
