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
  Tag,
  Layout
} from 'antd';
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Eye,
  Download,
  Trash2,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConversationService } from '../services/conversationService';
import { ConversationSummary } from '../types/conversation';
import exportService, { DatasetListItem, ListResponse, ExportResponse } from '../services/exportService';
import RawPreviewModal from '../components/chat/modal/RawPreviewModal';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Header, Content } = Layout;

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
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Database size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              导出管理
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              总对话 {stats.total}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              数据集 {stats.datasets}
            </Tag>
          </Space>

          {/* 右侧：关闭按钮 */}
          <div
            onClick={() => navigate('/chat')}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} strokeWidth={1.5} />
          </div>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ padding: '32px 48px', overflow: 'auto' }}>
        <Card style={{
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'select',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} strokeWidth={1.5} /> 选择导出
                </span>
              ),
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', height: '100%' }}>
                  {/* 左侧：对话筛选与选择 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
                    <Card
                      title={<span style={{ color: '#2d2d2d', fontSize: '14px', fontWeight: 500 }}>对话筛选</span>}
                      size="small"
                      extra={
                        <Button
                          type="text"
                          onClick={loadConversations}
                          style={{
                            color: '#8b7355',
                            padding: '4px 8px',
                            height: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RefreshCw size={14} strokeWidth={1.5} /> 刷新
                        </Button>
                      }
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(139, 115, 85, 0.15)',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Input
                          placeholder="搜索标题或标签"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          allowClear
                          prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
                          style={{
                            height: '40px',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 115, 85, 0.2)',
                            background: 'rgba(255, 255, 255, 0.85)',
                            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
                          }}
                        />
                        <RangePicker
                          style={{
                            width: '100%',
                            height: '40px',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 115, 85, 0.2)',
                            background: 'rgba(255, 255, 255, 0.85)'
                          }}
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
                        <Divider style={{ margin: '8px 0', borderColor: 'rgba(139, 115, 85, 0.15)' }} />
                        <Space>
                          <Button
                            onClick={selectAll}
                            disabled={filteredConversations.length === 0}
                            style={{
                              borderRadius: '6px',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              color: '#8b7355',
                              background: 'transparent'
                            }}
                          >
                            全选
                          </Button>
                          <Button
                            onClick={deselectAll}
                            disabled={selectedIds.size === 0}
                            style={{
                              borderRadius: '6px',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              color: '#8b7355',
                              background: 'transparent'
                            }}
                          >
                            取消全选
                          </Button>
                          <Tag style={{
                            background: 'rgba(184, 88, 69, 0.08)',
                            color: '#b85845',
                            border: '1px solid rgba(184, 88, 69, 0.25)',
                            borderRadius: '6px',
                            fontWeight: 500,
                            padding: '4px 12px'
                          }}>
                            已选 {selectedIds.size}
                          </Tag>
                        </Space>
                      </Space>
                    </Card>

                    <div style={{
                      flex: 1,
                      overflow: 'auto',
                      maxHeight: '500px',
                      paddingRight: '5px'
                    }}>
                      {loadingConvs ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Spin tip="加载中..." />
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(45, 45, 45, 0.45)' }}>
                          <FileText size={48} strokeWidth={1.5} style={{ marginBottom: 16, color: 'rgba(139, 115, 85, 0.3)' }} />
                          <div>暂无对话</div>
                        </div>
                      ) : (
                        filteredConversations.map(conv => (
                          <div
                            key={conv._id}
                            onClick={() => toggleSelect(conv._id, !selectedIds.has(conv._id))}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              padding: '12px 14px',
                              marginBottom: '10px',
                              background: selectedIds.has(conv._id) ? 'rgba(184, 88, 69, 0.08)' : 'rgba(255, 255, 255, 0.85)',
                              border: selectedIds.has(conv._id) ? '1px solid rgba(184, 88, 69, 0.3)' : '1px solid rgba(139, 115, 85, 0.15)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                              gap: '12px',
                              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
                            }}
                            onMouseEnter={(e) => {
                              if (!selectedIds.has(conv._id)) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12)';
                                e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!selectedIds.has(conv._id)) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                              }
                            }}
                          >
                            <Checkbox
                              checked={selectedIds.has(conv._id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(conv._id, e.target.checked);
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 500,
                                fontSize: '14px',
                                color: '#2d2d2d',
                                marginBottom: '8px',
                                wordBreak: 'break-word'
                              }}>
                                {conv.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <Tag style={{
                                  background: 'rgba(139, 115, 85, 0.08)',
                                  color: '#8b7355',
                                  border: '1px solid rgba(139, 115, 85, 0.2)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  padding: '2px 8px'
                                }}>
                                  {conv.type}
                                </Tag>
                                <Tag style={{
                                  background: conv.status === 'favorite' ? 'rgba(212, 165, 116, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                                  color: conv.status === 'favorite' ? '#d4a574' : '#8b7355',
                                  border: conv.status === 'favorite' ? '1px solid rgba(212, 165, 116, 0.2)' : '1px solid rgba(139, 115, 85, 0.2)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  padding: '2px 8px'
                                }}>
                                  {conv.status}
                                </Tag>
                                <span style={{
                                  fontSize: '12px',
                                  color: 'rgba(45, 45, 45, 0.65)',
                                  letterSpacing: '0.3px'
                                }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
                    <Card 
                      title={<span style={{ color: '#2d2d2d', fontSize: '14px', fontWeight: 500 }}>导出设置</span>}
                      size="small"
                      extra={
                        <Tooltip title={`总对话数：${stats.total} | 已选择：${stats.selected} | 数据集：${stats.datasets}`}>
                          <Database size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                        </Tooltip>
                      }
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(139, 115, 85, 0.15)',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
                      }}
                    >
                      <Form
                        form={exportForm}
                        layout="vertical"
                        initialValues={{ file_format: 'jsonl', data_format: 'standard' }}
                      >
                        <Form.Item
                          name="dataset_name"
                          label={<span style={{ color: '#2d2d2d', fontSize: '14px' }}>数据集名称</span>}
                          rules={[{ required: true, message: '请输入数据集名称' }]}
                        >
                          <Input
                            placeholder="例如：my_conversations"
                            maxLength={64}
                            style={{
                              height: '40px',
                              borderRadius: '6px',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              background: 'rgba(255, 255, 255, 0.85)',
                              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="file_name"
                          label={<span style={{ color: '#2d2d2d', fontSize: '14px' }}>文件名称（不含扩展名）</span>}
                          rules={[{ required: true, message: '请输入文件名称' }]}
                        >
                          <Input
                            placeholder="例如：export_2025_10_15"
                            maxLength={128}
                            style={{
                              height: '40px',
                              borderRadius: '6px',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              background: 'rgba(255, 255, 255, 0.85)',
                              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="file_format"
                          label={<span style={{ color: '#2d2d2d', fontSize: '14px' }}>文件格式</span>}
                          rules={[{ required: true }]}
                        > 
                          <Select
                            options={[
                              { label: 'JSONL', value: 'jsonl' },
                              { label: 'CSV', value: 'csv' },
                              { label: 'Parquet', value: 'parquet' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          name="data_format"
                          label={<span style={{ color: '#2d2d2d', fontSize: '14px' }}>数据格式</span>}
                          rules={[{ required: true }]}
                        > 
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
                            style={{
                              marginBottom: 16,
                              borderRadius: '6px',
                              border: '1px solid rgba(184, 88, 69, 0.3)',
                              background: 'rgba(184, 88, 69, 0.08)'
                            }}
                          />
                        )}
                        <Button
                          type="primary"
                          loading={exporting}
                          onClick={doExport}
                          block
                          size="large"
                          style={{
                            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            height: '44px',
                            fontSize: '15px',
                            fontWeight: 500,
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <Download size={16} strokeWidth={1.5} />
                          确认导出
                        </Button>
                      </Form>
                    </Card>

                    {exportResult?.success && (
                      <Card
                        title={<span style={{ color: '#2d2d2d', fontSize: '14px', fontWeight: 500 }}>导出成功</span>}
                        size="small"
                        style={{
                          background: 'rgba(255, 255, 255, 0.85)',
                          border: '1px solid rgba(139, 115, 85, 0.15)',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
                        }}
                      >
                        <Alert
                          type="success"
                          message={exportResult.message}
                          description={
                            exportResult.file_info
                              ? `格式：${exportResult.file_info.file_format} | 大小：${exportResult.file_info.file_size}`
                              : undefined
                          }
                          showIcon
                          style={{
                            marginBottom: 16,
                            borderRadius: '6px',
                            border: '1px solid rgba(160, 130, 109, 0.3)',
                            background: 'rgba(160, 130, 109, 0.08)'
                          }}
                        />
                        <Button
                          onClick={() =>
                            exportResult?.dataset_name &&
                            exportService.downloadDataset(exportResult.dataset_name, 'standard')
                          }
                          block
                          style={{
                            height: '40px',
                            borderRadius: '6px',
                            border: '1px solid rgba(139, 115, 85, 0.2)',
                            color: '#8b7355',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                          }}
                        >
                          <Download size={16} strokeWidth={1.5} />
                          下载数据集 (Zip)
                        </Button>
                        <Divider style={{ margin: '12px 0', borderColor: 'rgba(139, 115, 85, 0.15)' }} />
                        <Button
                          type="text"
                          onClick={() => {
                            setPreviewModalTitle(exportResult?.dataset_name || '导出预览');
                            setPreviewModalData(exportResult?.preview_data || []);
                            setPreviewModalVisible(true);
                          }}
                          style={{
                            color: '#8b7355',
                            padding: '4px 8px',
                            height: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Eye size={16} strokeWidth={1.5} />
                          预览原始数据
                        </Button>
                      </Card>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'datasets',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} strokeWidth={1.5} /> 数据集管理
                </span>
              ),
              children: (
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Space style={{ marginBottom: 16 }}>
                    <Button
                      onClick={loadDatasets}
                      style={{
                        borderRadius: '6px',
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        color: '#8b7355',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={1.5} />
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
                        render: (text) => <Text strong style={{ color: '#2d2d2d' }}>{text}</Text>
                      },
                      {
                        title: '数据格式',
                        dataIndex: 'data_format',
                        key: 'data_format',
                        render: (text) => (
                          <Tag style={{
                            background: 'rgba(139, 115, 85, 0.08)',
                            color: '#8b7355',
                            border: '1px solid rgba(139, 115, 85, 0.2)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            padding: '2px 8px'
                          }}>
                            {text}
                          </Tag>
                        )
                      },
                      {
                        title: '创建时间',
                        dataIndex: 'created_at',
                        key: 'created_at',
                        render: (text) => <span style={{ color: 'rgba(45, 45, 45, 0.85)' }}>{text}</span>
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        render: (_: any, record: DatasetListItem) => (
                          <Space size="small">
                            <div
                              onClick={() => doPreview(record.dataset_name, record.data_format)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                color: '#8b7355',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Eye size={14} strokeWidth={1.5} />
                              预览
                            </div>
                            <div
                              onClick={() =>
                                exportService.downloadDataset(
                                  record.dataset_name,
                                  record.data_format
                                )
                              }
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                color: '#8b7355',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Download size={14} strokeWidth={1.5} />
                              下载
                            </div>
                            <Popconfirm
                              title="确认删除该数据集？"
                              onConfirm={() =>
                                doDeleteDataset(record.dataset_name, record.data_format)
                              }
                            >
                              <div
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  color: '#b85845',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <Trash2 size={14} strokeWidth={1.5} />
                                删除
                              </div>
                            </Popconfirm>
                          </Space>
                        )
                      }
                    ]}
                    dataSource={datasets}
                    loading={listLoading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                  />
                </div>
              )
            }
          ]}
        />
        </Card>
      </Content>

      <RawPreviewModal
        visible={previewModalVisible}
        title={previewModalTitle}
        data={previewModalData}
        loading={previewLoading}
        onClose={() => setPreviewModalVisible(false)}
      />
    </Layout>
  );
};

export default ExportManager;
