// src/components/chat/sidebar/ConversationItem.tsx
import React, { useState } from 'react';
import { Modal, Tag, Tooltip, Checkbox, Dropdown, Button, Input } from 'antd';
import {
  MoreHorizontal,
  Star,
  Edit,
  Tag as TagIcon,
  Trash2,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ConversationSummary } from '../../../types/conversation';
import { useConversationStore } from '../../../store/conversationStore';

const { TextArea } = Input;

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onSelect?: (conversationId: string, selected: boolean) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  isBatchMode = false,
  isSelected = false,
  onSelect,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  const [newTags, setNewTags] = useState(conversation.tags.join(', '));
  const [isHovered, setIsHovered] = useState(false);

  const {
    updateConversationStatus,
    updateConversationTitle,
    updateConversationTags,
    deleteConversationPermanent,
    showNotification,
  } = useConversationStore();

  const handleStatusToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const newStatus =
        conversation.status === 'favorite' ? 'active' : 'favorite';
      await updateConversationStatus(conversation._id, newStatus);
      showNotification(
        `已${newStatus === 'favorite' ? '收藏' : '取消收藏'}`,
        'success'
      );
    } catch (error) {
      console.error('Status toggle failed:', error);
      showNotification('操作失败', 'error');
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (conversation.status === 'deleted') {
        setDeleteModalVisible(true);
      } else {
        await updateConversationStatus(conversation._id, 'deleted');
        showNotification('已移除到回收站', 'success');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification('删除失败', 'error');
    }
  };

  const handleRestore = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateConversationStatus(conversation._id, 'active');
      showNotification('已恢复为普通', 'success');
    } catch (error) {
      console.error('Restore failed:', error);
      showNotification('恢复失败', 'error');
    }
  };

  const handleEditTitle = async () => {
    if (newTitle.trim() && newTitle !== conversation.title) {
      await updateConversationTitle(conversation._id, newTitle.trim());
    }
    setEditModalVisible(false);
  };

  const handleEditTags = async () => {
    const tags = newTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    await updateConversationTags(conversation._id, tags);
    setTagsModalVisible(false);
  };

  const handlePermanentDelete = async () => {
    await deleteConversationPermanent(conversation._id);
    setDeleteModalVisible(false);
    showNotification('对话已永久删除', 'success');
  };

  const menuItems = [
    ...(conversation.status === 'deleted'
      ? [
          {
            key: 'restore',
            icon: <Check size={14} strokeWidth={1.5} />,
            label: '恢复为普通',
            onClick: (e: any) => {
              e.domEvent?.stopPropagation();
              handleRestore();
            },
          } as const,
        ]
      : []),
    {
      key: 'star',
      icon: (
        <Star
          size={14}
          strokeWidth={1.5}
          fill={conversation.status === 'favorite' ? '#d4a574' : 'none'}
        />
      ),
      label: conversation.status === 'favorite' ? '取消收藏' : '收藏',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleStatusToggle();
      },
    },
    {
      key: 'edit',
      icon: <Edit size={14} strokeWidth={1.5} />,
      label: '编辑标题',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setEditModalVisible(true);
      },
    },
    {
      key: 'tags',
      icon: <TagIcon size={14} strokeWidth={1.5} />,
      label: '编辑标签',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setTagsModalVisible(true);
      },
    },
    {
      key: 'delete',
      icon: <Trash2 size={14} strokeWidth={1.5} />,
      label: conversation.status === 'deleted' ? '永久删除' : '删除',
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleDelete();
      },
      danger: true,
    },
  ];

  const hoverContent = (
    <div style={{ padding: '8px' }}>
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#2d2d2d',
            marginBottom: '4px',
            lineHeight: '1.6',
          }}
        >
          <strong>类型:</strong> {conversation.type}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#2d2d2d',
            marginBottom: '4px',
            lineHeight: '1.6',
          }}
        >
          <strong>创建:</strong>{' '}
          {formatDistanceToNow(new Date(conversation.created_at), {
            addSuffix: true,
            locale: zhCN,
          })}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#2d2d2d',
            marginBottom: '4px',
            lineHeight: '1.6',
          }}
        >
          <strong>更新:</strong>{' '}
          {formatDistanceToNow(new Date(conversation.updated_at), {
            addSuffix: true,
            locale: zhCN,
          })}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#2d2d2d',
            marginBottom: '4px',
            lineHeight: '1.6',
          }}
        >
          <strong>轮次:</strong> {conversation.round_count}
        </div>
        <div
          style={{ fontSize: '12px', color: '#2d2d2d', lineHeight: '1.6' }}
        >
          <strong>Token:</strong> {conversation.total_token_usage.total_tokens}
        </div>
      </div>
      {conversation.tags.length > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(139, 115, 85, 0.12)',
            paddingTop: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#2d2d2d',
              marginBottom: '6px',
              lineHeight: '1.6',
            }}
          >
            <strong>标签:</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {conversation.tags.map((tag) => (
              <Tag
                key={tag}
                style={{
                  background: 'rgba(139, 115, 85, 0.08)',
                  color: '#8b7355',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  borderRadius: '4px',
                  fontWeight: 400,
                  fontSize: '11px',
                  padding: '2px 8px',
                  margin: 0,
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 计算最终样式
  const getItemStyle = (): React.CSSProperties => {
    // 基础样式 - 所有状态共享
    const base: React.CSSProperties = {
      marginBottom: '6px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
    };

    // 激活状态
    if (isActive) {
      return {
        ...base,
        padding: '10px 12px 10px 9px', // 左边减少3px因为有3px的边框
        background: 'rgba(184, 88, 69, 0.03)',
        borderLeft: '3px solid #b85845',
        borderTop: '1px solid rgba(139, 115, 85, 0.12)',
        borderRight: '1px solid rgba(139, 115, 85, 0.12)',
        borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
      };
    }

    // 批量选择且被选中
    if (isBatchMode && isSelected) {
      return {
        ...base,
        padding: '10px 12px', // 保持一致的 padding
        background: 'rgba(139, 115, 85, 0.03)',
        border: '1px solid rgba(139, 115, 85, 0.12)',
      };
    }

    // 悬停状态
    if (isHovered) {
      return {
        ...base,
        padding: '10px 12px', // 保持一致的 padding
        background: '#ffffff',
        border: '1px solid rgba(139, 115, 85, 0.12)',
        transform: 'translateY(-1px)',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
      };
    }

    // 默认状态
    return {
      ...base,
      padding: '10px 12px', // 保持一致的 padding
      background: '#ffffff',
      border: '1px solid rgba(139, 115, 85, 0.12)',
    };
  };

  const itemStyle = getItemStyle();

  return (
    <>
      <Tooltip
        title={hoverContent}
        placement="right"
        overlayStyle={{
          maxWidth: '300px',
        }}
        overlayInnerStyle={{
          background: '#ffffff',
          color: '#2d2d2d',
          border: '1px solid rgba(139, 115, 85, 0.12)',
          boxShadow: '0 4px 12px rgba(139, 115, 85, 0.1)',
          borderRadius: '6px',
          padding: '0',
        }}
      >
        <div
          style={itemStyle}
          onClick={
            isBatchMode
              ? () => onSelect?.(conversation._id, !isSelected)
              : onClick
          }
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {isBatchMode && (
              <div
                className="conversation-item-checkbox"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSelect?.(conversation._id, e.target.checked);
                  }}
                />
                <style>
                  {`
                    .conversation-item-checkbox .ant-checkbox::after {
                      border: none !important;
                    }
                    .conversation-item-checkbox .ant-checkbox-input:focus + .ant-checkbox-inner {
                      border-color: #8b7355 !important;
                      box-shadow: none !important;
                    }
                    .conversation-item-checkbox .ant-checkbox-wrapper:focus-within .ant-checkbox-inner {
                      box-shadow: none !important;
                    }
                  `}
                </style>
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
              <div
                style={{
                  fontWeight: isActive ? 500 : 400,
                  color:
                    conversation.status === 'deleted'
                      ? 'rgba(45, 45, 45, 0.45)'
                      : conversation.status === 'favorite'
                        ? '#d4a574'
                        : '#2d2d2d',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.3px',
                  textDecoration:
                    conversation.status === 'deleted' ? 'line-through' : 'none',
                }}
              >
                {conversation.title}
              </div>
            </div>

            {!isBatchMode && (
              <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                <Button
                  type="text"
                  size="small"
                  icon={<MoreHorizontal size={16} strokeWidth={1.5} />}
                  style={{
                    opacity: isHovered || isActive ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: '#8b7355',
                    padding: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'rgba(139, 115, 85, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                />
              </Dropdown>
            )}
          </div>
        </div>
      </Tooltip>

      <Modal
        title="编辑对话标题"
        open={editModalVisible}
        onOk={handleEditTitle}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入新标题"
          maxLength={100}
          style={{
            height: '40px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: '#ffffff',
          }}
        />
      </Modal>

      <Modal
        title="编辑对话标签"
        open={tagsModalVisible}
        onOk={handleEditTags}
        onCancel={() => setTagsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <TextArea
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder="请输入标签，用逗号分隔"
          rows={3}
          style={{
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: '#ffffff',
          }}
        />
      </Modal>

      <Modal
        title="确认永久删除"
        open={deleteModalVisible}
        onOk={handlePermanentDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: '#2d2d2d', marginBottom: '8px', lineHeight: '1.6' }}>
          确定要永久删除这个对话吗？此操作不可撤销。
        </p>
        <p style={{ color: '#b85845', fontWeight: 500 }}>
          <strong>{conversation.title}</strong>
        </p>
      </Modal>
    </>
  );
};

export default ConversationItem;
