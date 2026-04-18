import { useState, useEffect } from 'react';
import { Card, Typography, Select, Button, Space, Form, Input, Table, Tag, message, Alert, Divider, Popconfirm } from 'antd';
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

  const effectiveActive = activeProvider ?? settings?.active_provider ?? 'mock';

  useEffect(() => {
    if (!settings) return;
    const pm = settings.provider_models || {};
    modelsForm.setFieldsValue({
      openai: pm.openai ?? '',
      google: pm.google ?? '',
      grok: pm.grok ?? '',
    });
  }, [settings, modelsForm]);

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

  const columns = [
    { title: 'Provider', dataIndex: 'provider', key: 'provider', render: (p) => <Tag color="blue">{p}</Tag> },
    { title: 'Label', dataIndex: 'label', key: 'label', render: (l) => l || '—' },
    { title: 'Key version', dataIndex: 'key_version', key: 'kv' },
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
          onFinish={(values) =>
            saveModelsMutation.mutate({
              openai: values.openai ?? '',
              google: values.google ?? '',
              grok: values.grok ?? '',
            })
          }
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

      <Card title="Provider API keys (encrypted at rest)" loading={credLoading}>
        <Table
          size="small"
          rowKey="provider"
          dataSource={credentialRows}
          columns={columns}
          pagination={false}
          locale={{ emptyText: 'No keys stored yet' }}
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
