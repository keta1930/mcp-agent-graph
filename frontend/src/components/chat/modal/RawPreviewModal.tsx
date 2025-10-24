// src/components/chat/modal/RawPreviewModal.tsx
import React, { useMemo, useState } from 'react';
import { Modal, Spin, Table } from 'antd';

interface RawPreviewModalProps {
  visible: boolean;
  title?: string;
  data?: any;
  loading?: boolean;
  onClose: () => void;
}

const RawPreviewModal: React.FC<RawPreviewModalProps> = ({ visible, title, data, loading, onClose }) => {
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTitle, setDetailTitle] = useState<string>('');
  const [detailContent, setDetailContent] = useState<string>('');

  const showDetail = (field: string, value: any, idx: number) => {
    setDetailTitle(`${field} - 第${idx + 1}行`);
    try {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      setDetailContent(text);
    } catch (e) {
      setDetailContent(String(value));
    }
    setDetailVisible(true);
  };

  // 统一将数据转换为表格数据源与列配置（类似 pandas 预览）
  const { columns, dataSource } = useMemo(() => {
    const arr: any[] = Array.isArray(data) ? data : (data ? [data] : []);

    // 构建列集合（并集）
    const keySet = new Set<string>();
    arr.forEach((row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => keySet.add(k));
      } else {
        keySet.add('value');
      }
    });

    // 格式化单元格值（对象/数组转为截断的 JSON 字符串，字符串长文本截断）
    const formatValue = (val: any) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        try {
          const text = JSON.stringify(val, null, 2);
          return text.length > 160 ? text.slice(0, 160) + '…' : text;
        } catch (e) {
          return String(val);
        }
      }
      const s = String(val);
      return s.length > 160 ? s.slice(0, 160) + '…' : s;
    };

    const widthMap: Record<string, number> = {
      conversation_id: 160,
      messages: 560,
      tools: 420,
      ability: 240,
      model: 220,
    };

    const columns = [
      {
        title: '#',
        dataIndex: '__index',
        width: 64,
        fixed: 'left' as const,
      },
      ...Array.from(keySet).map((k) => ({
        title: k,
        dataIndex: k,
        width: widthMap[k],
        render: (value: any, _record: any, idx: number) => {
          const clickable = k === 'messages' || k === 'tools';
          const content = formatValue(value);
          return (
            <span
              style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', cursor: clickable ? 'pointer' : 'default' }}
              onClick={clickable ? () => showDetail(k, value, idx) : undefined}
            >
              {content}
            </span>
          );
        },
      })),
    ];

    const dataSource = arr.map((row, idx) => {
      if (row && typeof row === 'object') {
        return { __index: idx, ...row };
      } else {
        return { __index: idx, value: row };
      }
    });

    return { columns, dataSource };
  }, [data]);

  return (
    <Modal
      title={title || '原始数据预览'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1280}
      rootClassName="raw-preview-root"
      className="raw-preview-modal"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="加载中..." />
        </div>
      ) : dataSource && dataSource.length > 0 ? (
        <Table
          size="small"
          rowKey="__index"
          dataSource={dataSource}
          columns={columns as any}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: 'max-content' }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>暂无数据</div>
      )}
      <Modal
        title={detailTitle || '详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={960}
        rootClassName="raw-preview-detail-root"
        className="raw-preview-detail-modal"
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'visible' }}>
          {detailContent}
        </pre>
      </Modal>
    </Modal>
  );
};

export default RawPreviewModal;