import { useState } from 'react';
import { Table, Button, Input, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getClients, deleteClient } from '../../services/clientService';
import dayjs from 'dayjs';

const ClientList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [searchText, setSearchText] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['clients', pagination.current, pagination.pageSize, searchText],
        queryFn: () => getClients({
            page: pagination.current,
            limit: pagination.pageSize,
            search: searchText
        }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            message.success('Client deleted successfully');
            queryClient.invalidateQueries(['clients']);
        },
        onError: (error) => {
            message.error(error.response?.data?.error || 'Failed to delete client');
        },
    });

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    const columns = [
        {
            title: 'Business Name',
            dataIndex: 'business_name',
            key: 'business_name',
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Contact',
            dataIndex: 'contact_number',
            key: 'contact_number',
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => dayjs(text).format('YYYY-MM-DD'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        onClick={() => navigate(`/clients/${record.id}/prompts`)}
                    >
                        Prompts
                    </Button>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/clients/${record.id}`)}
                    />
                    <Popconfirm
                        title="Delete this client?"
                        description="This action will soft-delete the client."
                        onConfirm={() => deleteMutation.mutate(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="client-list">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Input
                    placeholder="Search by name, email, or business"
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                />
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/clients/new')}
                >
                    Create Client
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data?.data || []}
                rowKey="id"
                pagination={{
                    ...pagination,
                    total: data?.meta?.total || 0,
                }}
                loading={isLoading}
                onChange={handleTableChange}
            />
        </div>
    );
};

export default ClientList;
