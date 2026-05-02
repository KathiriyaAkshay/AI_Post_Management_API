import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Select,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  Table,
  Tag,
  message,
  Alert,
  Divider,
  Popconfirm,
  Switch,
} from 'antd';
import { SaveOutlined, DeleteOutlined, ApiOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getImageGenerationProviderIds,
  getImageGenerationSettings,
  putImageGenerationSettings,
  listImageProviderCredentials,
  putImageProviderCredential,
  deleteImageProviderCredential,
} from '../../services/imageGenerationAdminService';

const { Title, Paragraph, Text } = Typography;

function ProviderKeyForm({ provider, hasCredential, onSaved, onDeleted, savePending, deletePending }) {
  const [form] = Form.useForm();

  return (
    <Card type="inner" title={provider} style={{ marginBottom: 12 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onSaved({
            provider,
            apiKey: values.api_key,
            label: values.label,
          });
          form.resetFields();
        }}
      >
        <Form.Item name="api_key" label="API key" rules={[{ required: true, message: 'Paste API key' }]}>
          <Input.Password placeholder="Paste once — never shown again after save" autoComplete="off" />
        </Form.Item>
        <Form.Item name="label" label="Label (optional)">
          <Input placeholder="e.g. Production" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={savePending}>
            Encrypt & save
          </Button>
          {hasCredential && (
            <Popconfirm title="Remove stored key for this provider?" onConfirm={() => onDeleted({ provider })}>
              <Button danger icon={<DeleteOutlined />} loading={deletePending}>
                Remove stored key
              </Button>
            </Popconfirm>
          )}
        </Space>
      </Form>
    </Card>
  );
}

export default function ImageGenerationAdmin() {
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState(null);
  const [modelsForm] = Form.useForm();
  const [optimizerForm] = Form.useForm();
  const [retryForm] = Form.useForm();

  const { data: providerIdsRes, isLoading: idsLoading } = useQuery({
    queryKey: ['image-gen', 'providers'],
    queryFn: getImageGenerationProviderIds,
  });

  const { data: settingsRes, isLoading: settingsLoading } = useQuery({
    queryKey: ['image-gen', 'settings'],
    queryFn: getImageGenerationSettings,
  });

  const { data: credentialsRes, isLoading: credLoading } = useQuery({
    queryKey: ['image-gen', 'credentials'],
    queryFn: listImageProviderCredentials,
  });

  const settings = settingsRes?.data;
  const credentialRows = credentialsRes?.data || [];
  const activeOptions = providerIdsRes?.data?.active_provider_options || [];
  const credentialProviders = providerIdsRes?.data?.credential_providers || ['openai', 'google', 'grok'];
  const suggestedModels = providerIdsRes?.data?.suggested_image_models || {};
  const optimizerProviders = providerIdsRes?.data?.prompt_optimizer_providers || ['openai'];
  const suggestedOptimizerModels = providerIdsRes?.data?.suggested_prompt_optimizer_models || {};

  const effectiveActive = activeProvider ?? settings?.active_provider ?? 'mock';

  useEffect(() => {
    if (!settings) return;
    const pm = settings.provider_models || {};
    const fields = Object.fromEntries(credentialProviders.map((p) => [p, pm[p] ?? '']));
    modelsForm.setFieldsValue(fields);
    optimizerForm.setFieldsValue(settings.prompt_optimizer || {});
    retryForm.setFieldsValue(settings.generation_retry || {});
  }, [settings, modelsForm, optimizerForm, retryForm, credentialProviders]);

  const saveSettingsMutation = useMutation({
    mutationFn: () => putImageGenerationSettings({ active_provider: effectiveActive }),
    onSuccess: (res) => {
      message.success('Active provider updated');
      queryClient.setQueryData(['image-gen', 'settings'], res);
      queryClient.invalidateQueries(['image-gen', 'settings']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Save failed'),
  });

  const saveModelsMutation = useMutation({
    mutationFn: (provider_models) => putImageGenerationSettings({ provider_models }),
    onSuccess: (res) => {
      message.success('Provider models updated');
      queryClient.setQueryData(['image-gen', 'settings'], res);
      queryClient.invalidateQueries(['image-gen', 'settings']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Save models failed'),
  });

  const saveOptimizerMutation = useMutation({
    mutationFn: (prompt_optimizer) => putImageGenerationSettings({ prompt_optimizer }),
    onSuccess: (res) => {
      message.success('Prompt optimizer settings updated');
      queryClient.setQueryData(['image-gen', 'settings'], res);
      queryClient.invalidateQueries(['image-gen', 'settings']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Save optimizer settings failed'),
  });

  const saveRetryMutation = useMutation({
    mutationFn: (generation_retry) => putImageGenerationSettings({ generation_retry }),
    onSuccess: (res) => {
      message.success('Retry settings updated');
      queryClient.setQueryData(['image-gen', 'settings'], res);
      queryClient.invalidateQueries(['image-gen', 'settings']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Save retry settings failed'),
  });

  const saveKeyMutation = useMutation({
    mutationFn: ({ provider, apiKey, label }) =>
      putImageProviderCredential(provider, { api_key: apiKey, label: label || undefined }),
    onSuccess: () => {
      message.success('API key saved');
      queryClient.invalidateQueries(['image-gen', 'credentials']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Save key failed'),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: ({ provider }) => deleteImageProviderCredential(provider),
    onSuccess: () => {
      message.success('Credential removed');
      queryClient.invalidateQueries(['image-gen', 'credentials']);
    },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const credByProvider = Object.fromEntries(credentialRows.map((r) => [r.provider, r]));

  const credentialTableRows = credentialProviders.map((provider) => {
    const row = credByProvider[provider];
    return { provider, ...row };
  });

  const providerModels = settings?.provider_models || {};

  const columns = [
    { title: 'Provider', dataIndex: 'provider', key: 'provider', render: (p) => <Tag color="blue">{p}</Tag> },
    {
      title: 'Model ID',
      key: 'model',
      render: (_, record) => {
        const m = providerModels[record.provider];
        return m ? (
          <Text code>{m}</Text>
        ) : (
          <Text type="secondary">Not set in admin (runtime uses env / adapter default)</Text>
        );
      },
    },
    { title: 'Label', dataIndex: 'label', key: 'label', render: (l) => l || '—' },
    { title: 'Key version', dataIndex: 'key_version', key: 'kv', render: (v) => v ?? '—' },
    { title: 'Updated', dataIndex: 'updated_at', key: 'u', render: (t) => (t ? new Date(t).toLocaleString() : '—') },
  ];

  return (
    <div>
      <Title level={3}>
        <ApiOutlined /> Image generation
      </Title>
      <Paragraph type="secondary">
        Choose which backend generates customer images and store encrypted API keys.         The API server needs <Text code>PROVIDER_KEYS_MASTER_KEY</Text> and migrations{' '}
        <Text code>016</Text> (encrypted keys) and <Text code>017</Text> (per-provider model ids).
      </Paragraph>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="API documentation"
        description={
          <>
            On the backend host, open <Text code>/api-docs</Text> and expand the tag{' '}
            <Text strong>Image Generation (Admin)</Text> for <Text code>/admin/image-generation/*</Text> (Authorize with an admin JWT first).
          </>
        }
      />

      <Card title="Active provider" loading={settingsLoading || idsLoading} style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <Text>Runtime provider</Text>
          <Select
            style={{ minWidth: 220 }}
            value={effectiveActive}
            onChange={(v) => setActiveProvider(v)}
            options={activeOptions.map((v) => ({ value: v, label: v }))}
          />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveSettingsMutation.isPending}
            onClick={() => saveSettingsMutation.mutate()}
          >
            Save active provider
          </Button>
        </Space>
      </Card>

      <Card
        title="Model IDs per provider"
        loading={settingsLoading || idsLoading}
        style={{ marginBottom: 16 }}
        extra={
          <Text type="secondary" style={{ maxWidth: 360, fontSize: 12 }}>
            Stored in DB as <Text code>provider_models</Text>. Overrides env defaults when set; leave empty to fall back to env.
          </Text>
        }
      >
        <Form
          form={modelsForm}
          layout="vertical"
          onFinish={(values) => {
            const provider_models = Object.fromEntries(
              credentialProviders.map((p) => [p, values[p] ?? ''])
            );
            saveModelsMutation.mutate(provider_models);
          }}
        >
          {credentialProviders.map((p) => {
            const hints = suggestedModels[p];
            return (
              <Form.Item key={p} name={p} label={<Tag>{p}</Tag>}>
                <Input placeholder={`Model id for ${p}`} allowClear autoComplete="off" />
                {hints?.length ? (
                  <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }} copyable={false}>
                    Examples:{' '}
                    {hints.map((h) => (
                      <Text code key={h} style={{ marginRight: 8 }}>
                        {h}
                      </Text>
                    ))}
                  </Paragraph>
                ) : null}
              </Form.Item>
            );
          })}
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveModelsMutation.isPending}>
            Save model IDs
          </Button>
        </Form>
      </Card>

      <Card
        title="Prompt optimizer (text-to-text before image generation)"
        loading={settingsLoading || idsLoading}
        style={{ marginBottom: 16 }}
      >
        <Form
          form={optimizerForm}
          layout="vertical"
          onFinish={(values) => saveOptimizerMutation.mutate(values)}
          initialValues={settings?.prompt_optimizer || {}}
        >
          <Space wrap size="large" style={{ width: '100%' }}>
            <Form.Item name="enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="policy" label="Failure policy" rules={[{ required: true }]}>
              <Select
                style={{ minWidth: 180 }}
                options={[
                  { value: 'best_effort', label: 'best_effort (fail-open)' },
                  { value: 'required', label: 'required (fail-closed)' },
                ]}
              />
            </Form.Item>
            <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
              <Select
                style={{ minWidth: 180 }}
                options={optimizerProviders.map((v) => ({ value: v, label: v }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="model" label="Optimizer model" rules={[{ required: true }]}>
            <Input placeholder="e.g. gpt-5.4-nano" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="system_template"
            label="Optimizer system template"
            rules={[{ required: true, message: 'Provide optimizer system template' }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="System instruction used by prompt optimizer"
              autoComplete="off"
            />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: -8 }}>
            Suggestions:{' '}
            {(suggestedOptimizerModels[optimizerForm.getFieldValue('provider')] || suggestedOptimizerModels.openai || []).map((m) => (
              <Text code key={m} style={{ marginRight: 8 }}>
                {m}
              </Text>
            ))}
          </Paragraph>
          <Space wrap>
            <Form.Item name="timeout_ms" label="Timeout (ms)" rules={[{ required: true }]}>
              <InputNumber min={300} max={15000} />
            </Form.Item>
            <Form.Item name="max_tokens" label="Max tokens" rules={[{ required: true }]}>
              <InputNumber min={100} max={4000} />
            </Form.Item>
            <Form.Item name="temperature" label="Temperature" rules={[{ required: true }]}>
              <InputNumber min={0} max={1} step={0.1} />
            </Form.Item>
          </Space>
          <div>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveOptimizerMutation.isPending}>
              Save prompt optimizer
            </Button>
          </div>
        </Form>
      </Card>

      <Card title="Image generation retry policy" loading={settingsLoading} style={{ marginBottom: 16 }}>
        <Form
          form={retryForm}
          layout="vertical"
          onFinish={(values) => saveRetryMutation.mutate(values)}
          initialValues={settings?.generation_retry || {}}
        >
          <Space wrap size="large" style={{ width: '100%' }}>
            <Form.Item name="enabled" label="Retry enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="max_attempts" label="Provider retry attempts" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} />
            </Form.Item>
            <Form.Item name="base_delay_ms" label="Base delay (ms)" rules={[{ required: true }]}>
              <InputNumber min={100} max={60000} />
            </Form.Item>
            <Form.Item name="max_delay_ms" label="Max delay (ms)" rules={[{ required: true }]}>
              <InputNumber min={500} max={120000} />
            </Form.Item>
            <Form.Item name="queue_attempts" label="Queue attempts" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} />
            </Form.Item>
            <Form.Item name="queue_backoff_ms" label="Queue backoff (ms)" rules={[{ required: true }]}>
              <InputNumber min={500} max={120000} />
            </Form.Item>
          </Space>
          <Form.Item
            name="retry_on_statuses"
            label="Retry HTTP statuses"
            tooltip="Transient status codes that should be retried"
          >
            <Select mode="tags" tokenSeparators={[',']} placeholder="429,500,502,503,504" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveRetryMutation.isPending}>
            Save retry policy
          </Button>
        </Form>
      </Card>

      <Card title="Provider API keys (encrypted at rest)" loading={credLoading || settingsLoading}>
        <Table
          size="small"
          rowKey="provider"
          dataSource={credentialTableRows}
          columns={columns}
          pagination={false}
          locale={{ emptyText: 'No credential providers configured' }}
        />
        <Divider />
        {credentialProviders.map((provider) => (
          <ProviderKeyForm
            key={provider}
            provider={provider}
            hasCredential={Boolean(credByProvider[provider])}
            onSaved={(payload) => saveKeyMutation.mutate(payload)}
            onDeleted={(payload) => deleteKeyMutation.mutate(payload)}
            savePending={saveKeyMutation.isPending}
            deletePending={deleteKeyMutation.isPending}
          />
        ))}
      </Card>
    </div>
  );
}
