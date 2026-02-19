import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, List, Form, Input, Modal, Space, Typography, Tag, message, Collapse, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getProductTypes,
    createProductType,
    updateProductType,
    deleteProductType,
    getPromptParts,
    addPromptPart,
    updatePromptPart,
    deletePromptPart,
    getPromptPreview,
} from '../../services/promptService';
import { getClient } from '../../services/clientService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Sub-component for Prompt Parts
const PromptPartsList = ({ productTypeId, template }) => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [form] = Form.useForm();

    const { data: parts } = useQuery({
        queryKey: ['promptParts', productTypeId],
        queryFn: () => getPromptParts(productTypeId),
    });

    const { data: preview } = useQuery({
        queryKey: ['promptPreview', productTypeId, parts], // Refetch when parts change
        queryFn: () => getPromptPreview(productTypeId),
        enabled: !!productTypeId,
    });

    const createMutation = useMutation({
        mutationFn: (values) => addPromptPart(productTypeId, values),
        onSuccess: () => {
            queryClient.invalidateQueries(['promptParts', productTypeId]);
            setIsModalOpen(false);
            form.resetFields();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (values) => updatePromptPart(editingPart.id, values),
        onSuccess: () => {
            queryClient.invalidateQueries(['promptParts', productTypeId]);
            setIsModalOpen(false);
            setEditingPart(null);
            form.resetFields();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePromptPart,
        onSuccess: () => queryClient.invalidateQueries(['promptParts', productTypeId]),
    });

    const handleEdit = (record) => {
        setEditingPart(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    const handleSave = (values) => {
        if (editingPart) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Prompt Parts</Text>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                    Add Part
                </Button>
            </div>

            <List
                size="small"
                bordered
                dataSource={parts?.data || []}
                renderItem={(item, index) => (
                    <List.Item
                        actions={[
                            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item)} />,
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)} />,
                        ]}
                    >
                        <List.Item.Meta
                            title={<Text code>{index + 1}.</Text>}
                            description={item.content}
                        />
                    </List.Item>
                )}
            />

            {preview && (
                <Card size="small" style={{ marginTop: 16, background: '#f5f5f5' }}>
                    <Text strong>Preview: </Text>
                    <Text>{preview.data?.prompt}</Text>
                </Card>
            )}

            {template && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Template: {template}
                    </Text>
                </div>
            )}

            <Modal
                title={editingPart ? 'Edit Part' : 'Add Part'}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingPart(null);
                    form.resetFields();
                }}
                onOk={form.submit}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="content"
                        label="Content"
                        rules={[{ required: true }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="order_index" label="Order Index" initialValues={0}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

// Main Component
const PromptManagement = () => {
    const { customerId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [form] = Form.useForm();

    const { data: client } = useQuery({
        queryKey: ['client', customerId],
        queryFn: () => getClient(customerId),
    });

    const { data: productTypes } = useQuery({
        queryKey: ['productTypes', customerId],
        queryFn: () => getProductTypes(customerId),
    });

    const createMutation = useMutation({
        mutationFn: (values) => createProductType(customerId, values),
        onSuccess: () => {
            queryClient.invalidateQueries(['productTypes', customerId]);
            setIsModalOpen(false);
            form.resetFields();
            message.success('Product Type created');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (values) => updateProductType(editingType.id, values),
        onSuccess: () => {
            queryClient.invalidateQueries(['productTypes', customerId]);
            setIsModalOpen(false);
            setEditingType(null);
            form.resetFields();
            message.success('Product Type updated');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProductType,
        onSuccess: () => {
            queryClient.invalidateQueries(['productTypes', customerId]);
            message.success('Product Type deleted');
        },
    });

    const handleEdit = (record, e) => {
        e.stopPropagation();
        setEditingType(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        Modal.confirm({
            title: 'Are you sure?',
            content: 'This will delete the product type and all its prompt parts.',
            okText: 'Yes',
            cancelText: 'No',
            onOk: () => deleteMutation.mutate(id),
        });
    };

    const handleSave = (values) => {
        if (editingType) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')}>
                    Back to Clients
                </Button>
            </div>

            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Prompt Management: {client?.data?.business_name}</span>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                            Add Product Type
                        </Button>
                    </div>
                }
            >
                <Collapse accordion>
                    {productTypes?.data?.map((type) => (
                        <Panel
                            header={
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span>{type.name}</span>
                                    <Space>
                                        <EditOutlined onClick={(e) => handleEdit(type, e)} />
                                        <DeleteOutlined onClick={(e) => handleDelete(type.id, e)} style={{ color: 'red' }} />
                                    </Space>
                                </div>
                            }
                            key={type.id}
                        >
                            <PromptPartsList productTypeId={type.id} template={type.template} />
                        </Panel>
                    ))}
                </Collapse>
            </Card>

            <Modal
                title={editingType ? 'Edit Product Type' : 'Add Product Type'}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingType(null);
                    form.resetFields();
                }}
                onOk={form.submit}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please input name!' }]}
                    >
                        <Input placeholder="e.g. Clothing, Electronic" />
                    </Form.Item>
                    <Form.Item
                        name="template"
                        label="Template (Optional)"
                        extra="Use {1}, {2} etc. as placeholders for prompt parts."
                    >
                        <Input placeholder="e.g. {1} style in {2} background" />
                    </Form.Item>
                    <Form.Item name="sort_order" label="Sort Order" initialValues={0}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PromptManagement;
