import React from 'react';
import { Table, Tag, Button, Typography, Pagination } from 'antd';
import { Copy, CheckCircle, XCircle, Plus } from 'lucide-react';
import { InviteCode } from '../../services/adminService';
import { COLORS, SHADOWS, getStatusTagStyle, getPrimaryButtonStyle } from '../../constants/adminPanelStyles';

const { Text } = Typography;

interface InviteCodesTableProps {
  inviteCodes: InviteCode[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onToggleInviteCode: (code: string, isActive: boolean) => void;
  onCopyCode: (code: string) => void;
  onCreateCode: () => void;
  t: (key: string, params?: any) => string;
}

/**
 * 邀请码管理表格组件
 */
const InviteCodesTable: React.FC<InviteCodesTableProps> = ({
  inviteCodes,
  loading,
  currentPage,
  pageSize,
  onPageChange,
  onToggleInviteCode,
  onCopyCode,
  onCreateCode,
  t,
}) => {
  // 表格自定义样式组件
  const tableComponents = {
    body: {
      row: (props: any) => (
        <tr
          {...props}
          style={{
            transition: 'all 0.2s ease',
            ...props.style
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(250, 248, 245, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        />
      )
    }
  };

  // 邀请码表格列定义
  const columns = [
    {
      title: t('pages.adminPanel.inviteCodes.inviteCode'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{
            background: 'rgba(139, 115, 85, 0.08)',
            color: COLORS.primary,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(139, 115, 85, 0.2)',
            fontFamily: 'monospace'
          }}>
            {code}
          </code>
          <div
            onClick={() => onCopyCode(code)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: COLORS.tertiary,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLORS.primary;
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLORS.tertiary;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Copy size={14} strokeWidth={1.5} />
          </div>
        </div>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag style={getStatusTagStyle(isActive)}>
          {isActive ? t('pages.adminPanel.inviteCodes.statusActive') : t('pages.adminPanel.inviteCodes.statusDeactivated')}
        </Tag>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.usage'),
      key: 'usage',
      render: (_: any, record: InviteCode) => (
        <Text style={{ color: COLORS.textLight, fontSize: '13px', fontWeight: 500 }}>
          {record.current_uses} / {record.max_uses || t('pages.adminPanel.inviteCodes.unlimited')}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.creator'),
      dataIndex: 'created_by',
      key: 'created_by',
      render: (creator: string) => (
        <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {creator}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.expiresAt'),
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string | null) => (
        <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {date ? new Date(date).toLocaleDateString() : t('pages.adminPanel.inviteCodes.permanent')}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.actions'),
      key: 'action',
      render: (_: any, record: InviteCode) => (
        <Button
          size="small"
          danger={record.is_active}
          onClick={() => onToggleInviteCode(record.code, record.is_active)}
          icon={record.is_active ? <XCircle size={14} strokeWidth={1.5} /> : <CheckCircle size={14} strokeWidth={1.5} />}
          style={{
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            height: '28px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {record.is_active ? t('pages.adminPanel.inviteCodes.deactivate') : t('pages.adminPanel.inviteCodes.activate')}
        </Button>
      )
    }
  ];

  const paginatedCodes = inviteCodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{
      background: COLORS.whiteAlpha85,
      borderRadius: '8px',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      boxShadow: SHADOWS.card,
      overflow: 'hidden',
      height: '750px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={paginatedCodes}
          rowKey="code"
          loading={loading}
          components={tableComponents}
          pagination={false}
          style={{
            background: 'transparent'
          }}
        />
      </div>
      {/* 自定义底部：分页 + 创建按钮 */}
      <div style={{
        padding: '16px',
        background: 'rgba(250, 248, 245, 0.5)',
        borderTop: '1px solid rgba(139, 115, 85, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        position: 'relative'
      }}>
        <div style={{ width: '150px' }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={inviteCodes.length}
            onChange={onPageChange}
            showTotal={(total) => t('pages.adminPanel.inviteCodes.totalCodes', { total })}
            itemRender={(page, type, originalElement) => {
              if (type === 'page') {
                return page === currentPage ? originalElement : null;
              }
              return originalElement;
            }}
            style={{
              margin: 0
            }}
          />
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} strokeWidth={1.5} />}
          onClick={onCreateCode}
          style={{
            ...getPrimaryButtonStyle('default'),
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            height: '32px'
          }}
        >
          {t('pages.adminPanel.inviteCodes.generateNewCode')}
        </Button>
      </div>
    </div>
  );
};

export default InviteCodesTable;
