import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Tag, Input, Popconfirm, message, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCampaigns, deleteCampaign } from '../../services/campaignService';

const STATUS_COLOR = { draft: 'default', active: 'green', completed: 'blue' };
const STYLE_LABELS = {
  photorealistic: 'Photorealistic',
  '3d_render': '3D Render',
  cinematic: 'Cinematic',
  oil_painting: 'Oil Painting',
};

const CampaignList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['prebuilt-campaigns', page, search],
    queryFn: () => getCampaigns({ page, limit: 10, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries(['prebuilt-campaigns']);
      message.success('Campaign deleted');
    },
    onError: (err) => message.error(err.response?.data?.error || 'Delete failed'),
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>
          {text}
          {record.thumbnail_url && (
            <img
              src={record.thumbnail_url}
              alt="thumb"
              style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, marginLeft: 8, verticalAlign: 'middle' }}
            />
          )}
        </span>
      ),
    },
    {
      title: 'Visual Style',
      dataIndex: 'visual_style',
      key: 'visual_style',
      render: (v) => STYLE_LABELS[v] || v,
    },
    {
      title: 'Aspect Ratio',
      dataIndex: 'aspect_ratio',
      key: 'aspect_ratio',
    },
    {
      title: 'Mood',
      dataIndex: 'mood',
      key: 'mood',
      render: (v) => v || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={STATUS_COLOR[v]}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/campaigns/${record.id}`)}
          />
          <Popconfirm
            title="Delete this prebuilt campaign?"
            description="Customers who cloned it will keep their copies."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Prebuilt Campaigns"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/campaigns/new')}
        >
          New Campaign
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 260 }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data || []}
        columns={columns}
        pagination={{
          current: page,
          total: data?.meta?.total || 0,
          pageSize: 10,
          onChange: setPage,
          showTotal: (total) => `${total} campaigns`,
        }}
      />
    </Card>
  );
};

export default CampaignList;
