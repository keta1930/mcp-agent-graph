// src/components/chat/modal/ExportModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Alert, Button, Divider } from 'antd';
import { ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import exportService, { ExportResponse } from '../../../services/exportService';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: string[];
  onOpenList?: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose, selectedIds, onOpenList }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setResult(null);

      const values = await form.validateFields();
      const req = {
        dataset_name: values.dataset_name as string,
        file_name: values.file_name as string,
        conversation_ids: selectedIds,
        file_format: values.file_format as 'jsonl' | 'csv' | 'parquet',
        data_format: 'standard' as const,
      };

      const res = await exportService.exportConversations(req);
      if (!res.success) {
        setError(res.message || '导出失败');
      } else {
        setResult(res);
      }
    } catch (e: any) {
      setError(e?.message || '导出失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.dataset_name) return;
    await exportService.downloadDataset(result.dataset_name, 'standard');
  };

  return (
    <Modal
      title="导出设置"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <Alert
        type="info"
        message={`已选择 ${selectedIds.length} 个对话，将导出为数据集`}
        style={{ marginBottom: 12 }}
      />

      <Form form={form} layout="vertical" initialValues={{ file_format: 'jsonl' }}>
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

        {error && (
          <Alert type="error" message={error} style={{ marginTop: 8 }} />
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button type="primary" icon={<ExportOutlined />} loading={submitting} onClick={handleExport}>
            确认导出
          </Button>
          <Button onClick={onClose}>关闭</Button>
          {onOpenList && (
            <Button onClick={onOpenList}>打开导出列表</Button>
          )}
        </div>
      </Form>

      {result?.success && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Alert
            type="success"
            message={`导出成功：${result.message}`}
            description={result.file_info ? `格式：${result.file_info.file_format}，大小：${result.file_info.file_size}` : undefined}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>下载Zip</Button>
          </div>
          <div>
            <h4 style={{ marginBottom: 8 }}>预览（前20条）</h4>
            <pre style={{ maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 12, border: '1px solid #eee' }}>
              {JSON.stringify(result.preview_data || [], null, 2)}
            </pre>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ExportModal;