import { useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Select, Popconfirm,
  Modal, Form, Input, Switch, InputNumber, message, Tabs, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
  previewOptions,
} from '../../services/campaignOptionsService';

const { Option } = Select;

const OPTION_TYPE_LABELS = {
  visual_style: 'Visual Style',
  aspect_ratio: 'Aspect Ratio',
  mood: 'Mood',
  gender_focus: 'Gender Focus',
};

const OPTION_TYPE_COLORS = {
  visual_style: 'blue',
  aspect_ratio: 'green',
  mood: 'purple',
  gender_focus: 'orange',
};

const PROMPT_WEIGHT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// ─── Option Form Modal ───────────────────────────────────────────────
const OptionFormModal = ({ open, onClose, editingOption, productTypes }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = Boolean(editingOption);

  const createMutation = useMutation({
    mutationFn: createOption,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaign-options']);
      message.success('Option created');
      onClose();
      form.resetFields();
    },
    onError: (err) => message.error(err.response?.data?.error || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (values) => updateOption(editingOption.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaign-options']);
      message.success('Option updated');
      onClose();
    },
    onError: (err) => message.error(err.response?.data?.error || 'Update failed'),
  });

  const handleOpen = () => {
    if (editingOption) {
      form.setFieldsValue({
        productTypeId: editingOption.product_type_id || 'global',
        optionType: editingOption.option_type,
        value: editingOption.value,
        label: editingOption.label,
        description: editingOption.description,
        icon: editingOption.icon,
        gradientFrom: editingOption.gradient_from,
        gradientTo: editingOption.gradient_to,
        isActive: editingOption.is_active,
        sortOrder: editingOption.sort_order,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, sortOrder: 0, productTypeId: 'global' });
    }
  };

  const handleFinish = (values) => {
    const payload = {
      ...values,
      productTypeId: values.productTypeId === 'global' ? null : values.productTypeId,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEdit ? 'Edit Option' : 'New Option'}
      open={open}
      onCancel={onClose}
      afterOpenChange={(o) => o && handleOpen()}
      footer={null}
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="productTypeId"
          label={
            <Tooltip title="'Global' options are the fallback when no product-type override exists.">
              Scope
            </Tooltip>
          }
          rules={[{ required: true }]}
        >
          <Select placeholder="Select scope">
            <Option value="global">Global (platform default)</Option>
            {(productTypes || []).map((pt) => (
              <Option key={pt.id} value={pt.id}>{pt.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="optionType" label="Option Type" rules={[{ required: true }]}>
          <Select placeholder="Select type">
            {Object.entries(OPTION_TYPE_LABELS).map(([val, lbl]) => (
              <Option key={val} value={val}>{lbl}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="value" label="Value (stored in DB)" rules={[{ required: true }]}
          extra="Machine-readable key, e.g. 'golden_hour', '3d_render'"
        >
          <Input placeholder="e.g. golden_hour" />
        </Form.Item>

        <Form.Item name="label" label="Label (shown in UI)" rules={[{ required: true }]}>
          <Input placeholder="e.g. Golden Hour" />
        </Form.Item>

        <Form.Item name="description" label="Description / Hint">
          <Input placeholder="Short description shown as tooltip" />
        </Form.Item>

        <Form.Item name="icon" label="Material Symbol Icon" extra="Icon name from Material Symbols, e.g. 'photo_camera'">
          <Input placeholder="photo_camera" />
        </Form.Item>

        <Form.Item name="gradientFrom" label="Gradient From (Tailwind class)" extra="Used for mood swatches, e.g. 'from-orange-400'">
          <Input placeholder="from-orange-400" />
        </Form.Item>

        <Form.Item name="gradientTo" label="Gradient To (Tailwind class)">
          <Input placeholder="to-red-500" />
        </Form.Item>

        <Form.Item name="sortOrder" label="Sort Order">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Create Option'}
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ─── Preview Modal ───────────────────────────────────────────────────
const PreviewModal = ({ open, onClose, productTypeId, productTypeName }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-options-preview', productTypeId],
    queryFn: () => previewOptions(productTypeId === 'global' ? null : productTypeId),
    enabled: open,
  });

  const groups = data?.data || {};

  const renderGroup = (title, items) => (
    <div style={{ marginBottom: 16 }}>
      <strong>{title}</strong>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(items || []).map((item) => (
          <Tag key={item.id} color={item.product_type_id ? 'blue' : 'default'}>
            {item.icon && <span style={{ marginRight: 4 }}>•</span>}
            {item.label}
            {item.product_type_id ? ' (override)' : ' (global)'}
          </Tag>
        ))}
        {(!items || items.length === 0) && <Tag color="red">Hidden (no active options)</Tag>}
      </div>
    </div>
  );

  return (
    <Modal
      title={`Preview: ${productTypeName || 'Global Defaults'}`}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width={600}
    >
      {isLoading ? <p>Loading…</p> : (
        <>
          <p style={{ color: '#666', marginBottom: 16 }}>
            This is exactly what customers with{' '}
            <strong>{productTypeName || 'no product type'}</strong>{' '}
            will see in the campaign builder.
          </p>
          {renderGroup('Visual Styles', groups.visual_styles)}
          {renderGroup('Aspect Ratios', groups.aspect_ratios)}
          {renderGroup('Moods', groups.moods)}
          {renderGroup('Gender Focus', groups.gender_focus)}
        </>
      )}
    </Modal>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────
const CampaignOptionsList = () => {
  const queryClient = useQueryClient();
  const [filterProductType, setFilterProductType] = useState('global');
  const [filterOptionType, setFilterOptionType] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState('global');

  const { data: optionsData, isLoading } = useQuery({
    queryKey: ['campaign-options', filterProductType, filterOptionType],
    queryFn: () => getOptions({
      product_type_id: filterProductType,
      option_type: filterOptionType,
      include_global: 'false',
    }),
  });

  const { data: productTypesData } = useQuery({
    queryKey: ['admin-product-types-for-options'],
    queryFn: () =>
      import('../../lib/api').then(({ default: api }) =>
        api.get('/prompts/product-types').then((r) => r.data)
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOption,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaign-options']);
      message.success('Option deleted');
    },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const productTypes = productTypesData?.data || [];
  const options = optionsData?.data || [];

  const columns = [
    {
      title: 'Type',
      dataIndex: 'option_type',
      key: 'option_type',
      render: (v) => (
        <Tag color={OPTION_TYPE_COLORS[v]}>{OPTION_TYPE_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (v) => <code>{v}</code>,
    },
    { title: 'Label', dataIndex: 'label', key: 'label' },
    {
      title: 'Scope',
      dataIndex: 'product_type_id',
      key: 'scope',
      render: (v) => v
        ? <Tag color="blue">{productTypes.find((p) => p.id === v)?.name || v}</Tag>
        : <Tag>Global Default</Tag>,
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      render: (v) => v ? <code>{v}</code> : '—',
    },
    {
      title: 'Sort',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 60,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => { setEditingOption(row); setModalOpen(true); }}
          />
          <Popconfirm
            title="Delete this option?"
            onConfirm={() => deleteMutation.mutate(row.id)}
            okText="Delete"
            okType="danger"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const previewName = previewType === 'global'
    ? 'Global Defaults'
    : productTypes.find((p) => p.id === previewType)?.name;

  return (
    <>
      <Card
        title="Campaign Config Options"
        extra={
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => { setPreviewType(filterProductType); setPreviewOpen(true); }}
            >
              Preview as Customer
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingOption(null); setModalOpen(true); }}
            >
              Add Option
            </Button>
          </Space>
        }
      >
        <p style={{ color: '#666', marginBottom: 16 }}>
          Configure which visual styles, aspect ratios, moods, and gender focus options
          are available per product type. Options with no product type are global defaults
          and apply to all customers who have no type-specific overrides.
        </p>

        <Space style={{ marginBottom: 16 }}>
          <Select
            value={filterProductType}
            onChange={setFilterProductType}
            style={{ width: 200 }}
          >
            <Option value="global">Global Defaults</Option>
            {productTypes.map((pt) => (
              <Option key={pt.id} value={pt.id}>{pt.name}</Option>
            ))}
          </Select>
          <Select
            value={filterOptionType}
            onChange={setFilterOptionType}
            style={{ width: 180 }}
            allowClear
            placeholder="All types"
          >
            {Object.entries(OPTION_TYPE_LABELS).map(([val, lbl]) => (
              <Option key={val} value={val}>{lbl}</Option>
            ))}
          </Select>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={options}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>

      <OptionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingOption={editingOption}
        productTypes={productTypes}
      />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        productTypeId={previewType}
        productTypeName={previewName}
      />
    </>
  );
};

export default CampaignOptionsList;
