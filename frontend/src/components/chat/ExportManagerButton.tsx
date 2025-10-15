// src/components/chat/ExportManagerButton.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Modal,
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
  Tooltip
} from 'antd';
import { ExportOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { ConversationService } from '../../services/conversationService';
import { ConversationSummary } from '../../types/conversation';
import exportService, { DatasetListItem, ListResponse, PreviewResponse, ExportResponse } from '../../services/exportService';

const { RangePicker } = DatePicker;

const ExportManagerButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

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
    if (visible) {
      loadConversations();
      loadDatasets();
      setExportResult(null);
      setExportError(null);
      setPreview(null);
    }
  }, [visible]);

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
        data_format: 'standard',
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

  // 动态生成表格列（将对象值转为字符串展示）
  const buildColumnsFromData = (data: any[]) => {
    const firstObj = (data || []).find((d) => d && typeof d === 'object' && !Array.isArray(d));
    if (!firstObj) {
      return [{ title: 'value', dataIndex: 'value', key: 'value' }];
    }
    const keys = Object.keys(firstObj);
    return keys.map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
      ellipsis: true,
      render: (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }
    }));
  };

  const normalizeRows = (data: any[]) => {
    return (data || []).map((row, idx) => {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        return { key: idx, ...row };
      }
      return { key: idx, value: row };
    });
  };

  return (
    <>
      <Tooltip title="导出管理">
        <Button type="text" icon={<ExportOutlined />} onClick={() => setVisible(true)} />
      </Tooltip>
      <Modal
        title="对话导出管理"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={1000}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'select',
            label: '选择导出',
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* 左侧：对话筛选与选择 */}
                <div>
                  <Space style={{ marginBottom: 8 }} wrap>
                    <Input
                      placeholder="搜索标题或标签"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: 220 }}
                    />
                    <RangePicker
                      onChange={(vals) => {
                        const start = vals?.[0] ? new Date((vals[0] as any).valueOf()) : null;
                        const end = vals?.[1] ? new Date((vals[1] as any).valueOf()) : null;
                        setDateRange([start, end]);
                      }}
                    />
                    <Select
                      value={typeFilter}
                      onChange={(v) => setTypeFilter(v as any)}
                      options={[
                        { label: '类型: 全部', value: 'all' },
                        { label: '聊天', value: 'chat' },
                        { label: 'Agent', value: 'agent' },
                        { label: '图', value: 'graph' },
                      ]}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as any)}
                      options={[
                        { label: '状态: 全部', value: 'all' },
                        { label: '普通', value: 'active' },
                        { label: '收藏', value: 'favorite' },
                        { label: '回收站', value: 'deleted' },
                      ]}
                      style={{ width: 140 }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadConversations}>刷新</Button>
                  </Space>
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <Button onClick={selectAll} disabled={filteredConversations.length === 0}>全选</Button>
                      <Button onClick={deselectAll} disabled={selectedIds.size === 0}>取消全选</Button>
                      <span>选择 {selectedIds.size}</span>
                    </Space>
                  </div>
                  <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
                    {loadingConvs ? (
                      <Spin />
                    ) : (
                      filteredConversations.map(conv => (
                        <div key={conv._id} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #f5f5f5' }}>
                          <Checkbox checked={selectedIds.has(conv._id)} onChange={(e) => toggleSelect(conv._id, e.target.checked)} />
                          <div style={{ marginLeft: 8, flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{conv.title}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>{conv.type} · {conv.status} · {new Date(conv.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 右侧：导出设置与结果 */}
                <div>
                  <Form form={exportForm} layout="vertical" initialValues={{ file_format: 'jsonl' }}>
                    <Form.Item name="dataset_name" label="数据集名称" rules={[{ required: true, message: '请输入数据集名称' }]}> 
                      <Input placeholder="例如：my_conversations" maxLength={64} />
                    </Form.Item>
                    <Form.Item name="file_name" label="文件名称（不含扩展名）" rules={[{ required: true, message: '请输入文件名称' }]}> 
                      <Input placeholder="例如：export_2025_10_15" maxLength={128} />
                    </Form.Item>
                    <Form.Item name="file_format" label="文件格式" rules={[{ required: true }]}> 
                      <Select options={[
                        { label: 'JSONL', value: 'jsonl' },
                        { label: 'CSV', value: 'csv' },
                        { label: 'Parquet', value: 'parquet' },
                      ]} />
                    </Form.Item>
                    {exportError && <Alert type="error" message={exportError} style={{ marginTop: 8 }} />}
                    <Space style={{ marginTop: 12 }}>
                      <Button type="primary" icon={<ExportOutlined />} loading={exporting} onClick={doExport}>确认导出</Button>
                    </Space>
                  </Form>

                  {exportResult?.success && (
                    <>
                      <Divider />
                      <Alert
                        type="success"
                        message={`导出成功：${exportResult.message}`}
                        description={exportResult.file_info ? `格式：${exportResult.file_info.file_format}，大小：${exportResult.file_info.file_size}` : undefined}
                        style={{ marginBottom: 8 }}
                      />
                      <Space style={{ marginBottom: 8 }}>
                        <Button icon={<DownloadOutlined />} onClick={() => exportResult?.dataset_name && exportService.downloadDataset(exportResult.dataset_name, 'standard')}>下载Zip</Button>
                      </Space>
                      <div>
                        <h4 style={{ marginBottom: 8 }}>预览（前20条）</h4>
                        <Table
                          size="small"
                          columns={buildColumnsFromData(exportResult.preview_data || [])}
                          dataSource={normalizeRows(exportResult.preview_data || [])}
                          pagination={false}
                          scroll={{ x: 'max-content', y: 240 }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'datasets',
            label: '数据集管理',
            children: (
              <div>
                <Space style={{ marginBottom: 8 }}>
                  <Button icon={<ReloadOutlined />} onClick={loadDatasets}>刷新</Button>
                </Space>
                <Table
                  size="small"
                  rowKey={(r) => `${r.data_format}/${r.dataset_name}`}
                  columns={[
                    { title: '数据集名称', dataIndex: 'dataset_name' },
                    { title: '数据格式', dataIndex: 'data_format' },
                    { title: '创建时间', dataIndex: 'created_at' },
                    {
                      title: '操作',
                      render: (_: any, record: DatasetListItem) => (
                        <Space>
                          <Button icon={<EyeOutlined />} onClick={() => doPreview(record.dataset_name, record.data_format)}>预览</Button>
                          <Button icon={<DownloadOutlined />} onClick={() => exportService.downloadDataset(record.dataset_name, record.data_format)}>下载</Button>
                          <Popconfirm title="确认删除该数据集？" onConfirm={() => doDeleteDataset(record.dataset_name, record.data_format)}>
                            <Button danger icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                  dataSource={datasets}
                  loading={listLoading}
                  pagination={{ pageSize: 8 }}
                />
                {previewLoading && <Spin style={{ marginTop: 12 }} />}
                {preview && preview.success && (
                  <div style={{ marginTop: 12 }}>
                    <Alert type="info" message={`预览数据集：${preview.dataset_name}`} style={{ marginBottom: 8 }} />
                    <Table
                      size="small"
                      columns={buildColumnsFromData(preview.preview_data || [])}
                      dataSource={normalizeRows(preview.preview_data || [])}
                      pagination={false}
                      scroll={{ x: 'max-content', y: 240 }}
                    />
                  </div>
                )}
              </div>
            )
          }
        ]} />
      </Modal>
    </>
  );
};

export default ExportManagerButton;