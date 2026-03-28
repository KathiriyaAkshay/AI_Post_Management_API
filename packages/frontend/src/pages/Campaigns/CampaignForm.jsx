import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Form, Input, Select, Switch, Button, Space, message, Divider, Row, Col, Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCampaign, createCampaign, updateCampaign } from '../../services/campaignService';
import { previewOptions } from '../../services/campaignOptionsService';

const { TextArea } = Input;
const { Option } = Select;

const CampaignForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = Boolean(id);

  // Watch productTypeId to refresh options when it changes
  const productTypeId = Form.useWatch('productTypeId', form);

  const { data: campaignData, isLoading: campaignLoading } = useQuery({
    queryKey: ['prebuilt-campaign', id],
    queryFn: () => getCampaign(id),
    enabled: isEdit,
  });

  // Fetch campaign options resolved for the selected product type
  const { data: optionsData, isLoading: optionsLoading } = useQuery({
    queryKey: ['campaign-options-preview', productTypeId || null],
    queryFn: () => previewOptions(productTypeId || null),
  });

  // Product types list for the selector
  const { data: productTypesData } = useQuery({
    queryKey: ['admin-product-types-for-form'],
    queryFn: () =>
      import('../../lib/api').then(({ default: api }) =>
        api.get('/prompts/product-types').then((r) => r.data)
      ),
  });

  useEffect(() => {
    if (campaignData?.data) {
      const c = campaignData.data;
      form.setFieldsValue({
        name: c.name,
        description: c.description,
        visualStyle: c.visual_style,
        aspectRatio: c.aspect_ratio,
        mood: c.mood,
        modelEnabled: c.model_enabled,
        genderFocus: c.gender_focus,
        status: c.status,
        thumbnailUrl: c.thumbnail_url,
        productReferenceUrl: c.product_reference_url,
        productTypeId: c.product_type_id || undefined,
      });
    }
  }, [campaignData, form]);

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries(['prebuilt-campaigns']);
      message.success('Campaign created');
      navigate('/campaigns');
    },
    onError: (err) => message.error(err.response?.data?.error || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (values) => updateCampaign(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries(['prebuilt-campaigns']);
      queryClient.invalidateQueries(['prebuilt-campaign', id]);
      message.success('Campaign updated');
      navigate('/campaigns');
    },
    onError: (err) => message.error(err.response?.data?.error || 'Update failed'),
  });

  const handleFinish = (values) => {
    const payload = { ...values, productTypeId: values.productTypeId || null };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const options = optionsData?.data || {};
  const visualStyles = options.visual_styles || [];
  const aspectRatios = options.aspect_ratios || [];
  const moods = options.moods || [];
  const genderFocusOptions = options.gender_focus || [];
  const productTypes = productTypesData?.data || [];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/campaigns')} />
          {isEdit ? 'Edit Prebuilt Campaign' : 'New Prebuilt Campaign'}
        </Space>
      }
      loading={isEdit && campaignLoading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          visualStyle: 'photorealistic',
          aspectRatio: '1:1',
          modelEnabled: false,
          genderFocus: 'neutral',
          status: 'draft',
        }}
        style={{ maxWidth: 720 }}
      >
        <Divider orientation="left">Basic Info</Divider>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="name" label="Campaign Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Summer Retail Launch" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="status" label="Status">
              <Select>
                <Option value="draft">Draft</Option>
                <Option value="active">Active</Option>
                <Option value="completed">Completed</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <TextArea rows={3} placeholder="Brief description of this campaign template..." />
        </Form.Item>

        <Form.Item
          name="productTypeId"
          label="Product Type"
          extra="Selecting a product type loads the options configured for that type below."
        >
          <Select allowClear placeholder="No product type (uses global defaults)">
            {productTypes.map((pt) => (
              <Option key={pt.id} value={pt.id}>{pt.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Divider orientation="left">
          Visual Settings
          {optionsLoading && <Spin size="small" style={{ marginLeft: 8 }} />}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="visualStyle" label="Visual Style">
              <Select
                loading={optionsLoading}
                options={visualStyles.map((s) => ({ value: s.value, label: s.label }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="aspectRatio" label="Aspect Ratio">
              <Select
                loading={optionsLoading}
                options={aspectRatios.map((r) => ({ value: r.value, label: r.label }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="mood" label="Mood / Atmosphere">
          <Select
            placeholder="Select a mood..."
            allowClear
            showSearch
            loading={optionsLoading}
            options={moods.map((m) => ({ value: m.value, label: m.label }))}
          />
        </Form.Item>

        <Divider orientation="left">Model Settings</Divider>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Form.Item name="modelEnabled" label="Include Human Model" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          {genderFocusOptions.length > 0 && (
            <Col span={16}>
              <Form.Item name="genderFocus" label="Gender Focus">
                <Select
                  loading={optionsLoading}
                  options={genderFocusOptions.map((g) => ({ value: g.value, label: g.label }))}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Divider orientation="left">Assets</Divider>
        <Form.Item
          name="thumbnailUrl"
          label="Thumbnail URL"
          extra="Public URL of the campaign cover image"
        >
          <Input placeholder="https://..." />
        </Form.Item>

        <Form.Item
          name="productReferenceUrl"
          label="Product Reference URL"
          extra="Optional reference product image URL"
        >
          <Input placeholder="https://..." />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSubmitting}
            >
              {isEdit ? 'Save Changes' : 'Create Campaign'}
            </Button>
            <Button onClick={() => navigate('/campaigns')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CampaignForm;
