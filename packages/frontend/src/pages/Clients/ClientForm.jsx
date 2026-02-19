import { useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, updateClient, getClient } from '../../services/clientService';

const ClientForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: client, isLoading: isLoadingClient } = useQuery({
        queryKey: ['client', id],
        queryFn: () => getClient(id),
        enabled: isEditMode,
    });

    useEffect(() => {
        if (client && client.data) {
            form.setFieldsValue(client.data);
        }
    }, [client, form]);

    const mutation = useMutation({
        mutationFn: (values) => {
            if (isEditMode) {
                return updateClient(id, values);
            }
            return createClient(values);
        },
        onSuccess: () => {
            message.success(`Client ${isEditMode ? 'updated' : 'created'} successfully`);
            queryClient.invalidateQueries(['clients']);
            navigate('/clients');
        },
        onError: (error) => {
            message.error(error.response?.data?.error || 'Operation failed');
        },
    });

    const onFinish = (values) => {
        mutation.mutate(values);
    };

    return (
        <Card title={isEditMode ? 'Edit Client' : 'Create Client'}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{}}
                disabled={isLoadingClient}
            >
                <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                        { required: true, message: 'Please input email!' },
                        { type: 'email', message: 'Invalid email!' },
                    ]}
                >
                    <Input disabled={isEditMode} />
                </Form.Item>

                {!isEditMode && (
                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, message: 'Please input password!' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                )}

                <Form.Item
                    label="Username"
                    name="username"
                    rules={[{ required: true, message: 'Please input username!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Business Name"
                    name="business_name"
                    rules={[{ required: true, message: 'Please input business name!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Contact Number"
                    name="contact_number"
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Address"
                    name="address"
                >
                    <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item
                    label="Logo URL"
                    name="logo"
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                        {isEditMode ? 'Update Client' : 'Create Client'}
                    </Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => navigate('/clients')}>
                        Cancel
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default ClientForm;
