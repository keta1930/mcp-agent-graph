// src/components/chat/ExportListModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Table, Button, Space, Alert, Spin } from 'antd';
import { EyeOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import exportService, { DatasetListItem, ListResponse, PreviewResponse } from '../../services/exportService';

interface ExportListModalProps {
  visible: boolean;
  onClose: () => void;
}

const ExportListModal: React.FC<ExportListModalProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DatasetListItem[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: ListResponse = await exportService.listDatasets();
      if (res.success) {
        setItems(res.exports);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setError(e?.message || '获取导出列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchList();
      setPreview(null);
    }
  }, [visible]);

  const handlePreview = async (datasetName: string, dataFormat: string) => {
    try {
      setPreviewLoading(true);
      const res = await exportService.previewDataset(datasetName, dataFormat);
      setPreview(res);
    } catch (e) {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  };

  const columns = [
    { title: '数据集名称', dataIndex: 'dataset_name', key: 'dataset_name' },
    { title: '数据格式', dataIndex: 'data_format', key: 'data_format' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作', key: 'actions',
      render: (_: any, record: DatasetListItem) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handlePreview(record.dataset_name, record.data_format)}>预览</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportService.downloadDataset(record.dataset_name, record.data_format)}>下载</Button>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title="导出列表"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
      </Space>
      {error && <Alert type="error" message={error} style={{ marginBottom: 8 }} />}
      <Table
        size="small"
        rowKey={(r) => `${r.data_format}/${r.dataset_name}`}
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {previewLoading && <Spin style={{ marginTop: 12 }} />}
      {preview && preview.success && (
        <div style={{ marginTop: 12 }}>
          <Alert type="info" message={`预览数据集：${preview.dataset_name}`} style={{ marginBottom: 8 }} />
          <pre style={{ maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 12, border: '1px solid #eee' }}>
            {JSON.stringify(preview.preview_data || [], null, 2)}
          </pre>
        </div>
      )}
    </Modal>
  );
};

export default ExportListModal;