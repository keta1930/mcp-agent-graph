// src/pages/ExportManager.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Tabs,
  Input,
  DatePicker,
  Select,
  Table,
  Space,
  Checkbox,
  Form,
  Alert,
  Divider,
  Popconfirm,
  Spin,
  Typography,
  Tooltip,
  Tag
} from 'antd';
import {
  ExportOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  DatabaseOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ConversationService } from '../services/conversationService';
import { ConversationSummary } from '../types/conversation';
import exportService, { DatasetListItem, ListResponse, PreviewResponse, ExportResponse } from '../services/exportService';
import RawPreviewModal from '../components/chat/modal/RawPreviewModal';
import './ExportManager.css';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ExportManager: React.FC = () => {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('select');

  // Conversations
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'chat' | 'agent' | 'graph'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'favorite' | 'deleted'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Export
  const [exportForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Dataset list
  const [listLoading, setListLoading] = useState(false);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>('');
  const [previewModalData, setPreviewModalData] = useState<any>(null);

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await ConversationService.getConversations();
      setConversations(res.conversations || []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadDatasets = async () => {
    try {
      setListLoading(true);
      const res: ListResponse = await exportService.listDatasets();
      setDatasets(res.success ? res.exports : []);
    } catch (e) {
      setDatasets([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadDatasets();
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = conv.title.toLowerCase().includes(q) || conv.tags.some(t => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (typeFilter !== 'all' && conv.type !== typeFilter) return false;
      if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
      const [start, end] = dateRange;
      if (start || end) {
        const created = new Date(conv.created_at).getTime();
        if (start && created < start.getTime()) return false;
        if (end && created > end.getTime()) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [conversations, searchQuery, typeFilter, statusFilter, dateRange]);

  const toggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredConversations.map(c => c._id)));
  };
  const deselectAll = () => setSelectedIds(new Set());

  const doExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      setExportResult(null);
      const values = await exportForm.validateFields();
      if (selectedIds.size === 0) {
        setExportError('请先在左侧列表选择要导出的对话');
        return;
      }
      const res = await exportService.exportConversations({
        dataset_name: values.dataset_name,
        file_name: values.file_name,
        file_format: values.file_format,
        data_format: values.data_format,
        conversation_ids: Array.from(selectedIds),
      });
      if (!res.success) {
        setExportError(res.message || '导出失败');
      } else {
        setExportResult(res);
        setActiveTab('datasets');
        await loadDatasets();
      }
    } catch (e: any) {
      setExportError(e?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const doPreview = async (name: string, format: string) => {
    try {
      setPreviewLoading(true);
      const res = await exportService.previewDataset(name, format);
      setPreview(res);
      setPreviewModalTitle(res?.dataset_name || name);
      setPreviewModalData(res?.preview_data || []);
      setPreviewModalVisible(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const doDeleteDataset = async (name: string, format: string) => {
    const res = await exportService.deleteDataset(name, format);
    if (res.success) {
      await loadDatasets();
      setPreview(null);
    }
  };

  // 预览通过 RawPreviewModal 弹窗展示原始数据

  // 统计信息
  const stats = useMemo(() => {
    return {
      total: conversations.length,
      selected: selectedIds.size,
      filtered: filteredConversations.length,
      datasets: datasets.length
    };
  }, [conversations, selectedIds, filteredConversations, datasets]);

  return (
    <div className="export-manager-container">
      {/* 页面头部 - 参考 TaskManager 设计 */}
      <div className="export-manager-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
          <Title level={2} style={{ margin: 0 }}>
            导出管理
          </Title>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={() => navigate('/chat')}
          style={{
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px'
          }}
        />
      </div>

      {/* 顶部统计卡片移除，统计信息通过导出面板右上角图标悬停显示 */}

      <Card className="export-manager-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'select',
              label: (
                <span>
                  <FilterOutlined /> 选择导出
                </span>
              ),
              children: (
                <div className="export-tab-content">
                  {/* 左侧：对话筛选与选择 */}
                  <div className="export-left-panel">
                    <Card
                      title="对话筛选"
                      size="small"
                      extra={<Button icon={<ReloadOutlined />} onClick={loadConversations}>刷新</Button>}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Input
                          placeholder="搜索标题或标签"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          allowClear
                        />
                        <RangePicker
                          style={{ width: '100%' }}
                          onChange={(vals) => {
                            const start = vals?.[0] ? new Date((vals[0] as any).valueOf()) : null;
                            const end = vals?.[1] ? new Date((vals[1] as any).valueOf()) : null;
                            setDateRange([start, end]);
                          }}
                        />
                        <Select
                          value={typeFilter}
                          onChange={(v) => setTypeFilter(v as any)}
                          style={{ width: '100%' }}
                          options={[
                            { label: 'Type:All', value: 'all' },
                            { label: 'Chat', value: 'chat' },
                            { label: 'Agent', value: 'agent' },
                            { label: 'Graph', value: 'graph' },
                          ]}
                        />
                        <Select
                          value={statusFilter}
                          onChange={(v) => setStatusFilter(v as any)}
                          style={{ width: '100%' }}
                          options={[
                            { label: 'Status:All', value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Favorite', value: 'favorite' },
                            { label: 'Deleted', value: 'deleted' },
                          ]}
                        />
                        <Divider style={{ margin: '8px 0' }} />
                        <Space>
                          <Button onClick={selectAll} disabled={filteredConversations.length === 0}>
                            全选
                          </Button>
                          <Button onClick={deselectAll} disabled={selectedIds.size === 0}>
                            取消全选
                          </Button>
                          <Tag color="blue">已选 {selectedIds.size}</Tag>
                        </Space>
                      </Space>
                    </Card>

                    <div className="export-conversation-list">
                      {loadingConvs ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Spin tip="加载中..." />
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                          <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                          <div>暂无对话</div>
                        </div>
                      ) : (
                        filteredConversations.map(conv => (
                          <div
                            key={conv._id}
                            className={`export-conversation-item ${selectedIds.has(conv._id) ? 'selected' : ''}`}
                            onClick={() => toggleSelect(conv._id, !selectedIds.has(conv._id))}
                          >
                            <Checkbox
                              checked={selectedIds.has(conv._id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(conv._id, e.target.checked);
                              }}
                            />
                            <div className="export-conversation-info">
                              <div className="export-conversation-title">{conv.title}</div>
                              <div className="export-conversation-meta">
                                <Tag color="blue">{conv.type}</Tag>
                                <Tag color={conv.status === 'favorite' ? 'gold' : 'default'}>
                                  {conv.status}
                                </Tag>
                                <span className="export-conversation-date">
                                  {new Date(conv.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 右侧：导出设置与结果 */}
                  <div className="export-right-panel">
                    <Card 
                      title="导出设置" 
                      size="small"
                      extra={
                        <Tooltip title={`总对话数：${stats.total} | 已选择：${stats.selected} | 数据集：${stats.datasets}`}>
                          <DatabaseOutlined style={{ color: '#999' }} />
                        </Tooltip>
                      }
                    >
                      <Form
                        form={exportForm}
                        layout="vertical"
                        initialValues={{ file_format: 'jsonl', data_format: 'standard' }}
                      >
                        <Form.Item
                          name="dataset_name"
                          label="数据集名称"
                          rules={[{ required: true, message: '请输入数据集名称' }]}
                        >
                          <Input placeholder="例如：my_conversations" maxLength={64} />
                        </Form.Item>
                        <Form.Item
                          name="file_name"
                          label="文件名称（不含扩展名）"
                          rules={[{ required: true, message: '请输入文件名称' }]}
                        >
                          <Input placeholder="例如：export_2025_10_15" maxLength={128} />
                        </Form.Item>
                        <Form.Item name="file_format" label="文件格式" rules={[{ required: true }]}> 
                          <Select
                            options={[
                              { label: 'JSONL', value: 'jsonl' },
                              { label: 'CSV', value: 'csv' },
                              { label: 'Parquet', value: 'parquet' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="data_format" label="数据格式" rules={[{ required: true }]}> 
                          <Select
                            options={[
                              { label: 'standard', value: 'standard' },
                              { label: 'coming', value: 'coming' }
                            ]}
                          />
                        </Form.Item>
                        {exportError && (
                          <Alert
                            type="error"
                            message={exportError}
                            showIcon
                            closable
                            style={{ marginBottom: 16 }}
                          />
                        )}
                        <Button
                          type="primary"
                          icon={<ExportOutlined />}
                          loading={exporting}
                          onClick={doExport}
                          block
                          size="large"
                        >
                          确认导出
                        </Button>
                      </Form>
                    </Card>

                    {exportResult?.success && (
                      <Card title="导出成功" size="small" style={{ marginTop: 16 }}>
                        <Alert
                          type="success"
                          message={exportResult.message}
                          description={
                            exportResult.file_info
                              ? `格式：${exportResult.file_info.file_format} | 大小：${exportResult.file_info.file_size}`
                              : undefined
                          }
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            exportResult?.dataset_name &&
                            exportService.downloadDataset(exportResult.dataset_name, 'standard')
                          }
                          block
                        >
                          下载数据集 (Zip)
                        </Button>
                        <Divider />
                        <Space>
                          <Button
                            type="default"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setPreviewModalTitle(exportResult?.dataset_name || '导出预览');
                              setPreviewModalData(exportResult?.preview_data || []);
                              setPreviewModalVisible(true);
                            }}
                          >
                            预览原始数据
                          </Button>
                        </Space>
                      </Card>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'datasets',
              label: (
                <span>
                  <DatabaseOutlined /> 数据集管理
                </span>
              ),
              children: (
                <div className="datasets-tab-content">
                  <Space style={{ marginBottom: 16 }}>
                    <Button icon={<ReloadOutlined />} onClick={loadDatasets}>
                      刷新
                    </Button>
                  </Space>
                  <Table
                    size="small"
                    rowKey={(r) => `${r.data_format}/${r.dataset_name}`}
                    columns={[
                      {
                        title: '数据集名称',
                        dataIndex: 'dataset_name',
                        key: 'dataset_name',
                        render: (text) => <Text strong>{text}</Text>
                      },
                      {
                        title: '数据格式',
                        dataIndex: 'data_format',
                        key: 'data_format',
                        render: (text) => <Tag color="blue">{text}</Tag>
                      },
                      {
                        title: '创建时间',
                        dataIndex: 'created_at',
                        key: 'created_at'
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        render: (_: any, record: DatasetListItem) => (
                          <Space>
                            <Button
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => doPreview(record.dataset_name, record.data_format)}
                            >
                              预览
                            </Button>
                            <Button
                              type="link"
                              icon={<DownloadOutlined />}
                              onClick={() =>
                                exportService.downloadDataset(
                                  record.dataset_name,
                                  record.data_format
                                )
                              }
                            >
                              下载
                            </Button>
                            <Popconfirm
                              title="确认删除该数据集？"
                              onConfirm={() =>
                                doDeleteDataset(record.dataset_name, record.data_format)
                              }
                            >
                              <Button type="link" danger icon={<DeleteOutlined />}>
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        )
                      }
                    ]}
                    dataSource={datasets}
                    loading={listLoading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                  />
                  {/* 预览改为使用弹窗 RawPreviewModal 展示原始数据 */}
                </div>
              )
            }
          ]}
        />
      </Card>
      <RawPreviewModal
        visible={previewModalVisible}
        title={previewModalTitle}
        data={previewModalData}
        loading={previewLoading}
        onClose={() => setPreviewModalVisible(false)}
      />
    </div>
  );
};

export default ExportManager;
