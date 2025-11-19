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
import { zhCN, enUS } from 'date-fns/locale';
import { ConversationSummary } from '../../../types/conversation';
import { useConversationStore } from '../../../store/conversationStore';
import { useT } from '../../../i18n/hooks';
import { useI18n } from '../../../i18n/I18nContext';

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
  const t = useT();
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
        newStatus === 'favorite' ? t('components.conversationItem.favorited') : t('components.conversationItem.unfavorited'),
        'success'
      );
    } catch (error) {
      console.error('Status toggle failed:', error);
      showNotification(t('components.conversationItem.operationFailed'), 'error');
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (conversation.status === 'deleted') {
        setDeleteModalVisible(true);
      } else {
        await updateConversationStatus(conversation._id, 'deleted');
        showNotification(t('components.conversationItem.movedToTrash'), 'success');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification(t('components.conversationItem.deleteFailed'), 'error');
    }
  };

  const handleRestore = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateConversationStatus(conversation._id, 'active');
      showNotification(t('components.conversationItem.restored'), 'success');
    } catch (error) {
      console.error('Restore failed:', error);
      showNotification(t('components.conversationItem.restoreFailed'), 'error');
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
    showNotification(t('components.conversationItem.permanentlyDeleted'), 'success');
  };

  const menuItems = [
    ...(conversation.status === 'deleted'
      ? [
          {
            key: 'restore',
            icon: <Check size={14} strokeWidth={1.5} />,
            label: t('components.conversationItem.restoreToNormal'),
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
      label: conversation.status === 'favorite' ? t('components.conversationItem.unfavorite') : t('components.conversationItem.favorite'),
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleStatusToggle();
      },
    },
    {
      key: 'edit',
      icon: <Edit size={14} strokeWidth={1.5} />,
      label: t('components.conversationItem.editTitle'),
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setEditModalVisible(true);
      },
    },
    {
      key: 'tags',
      icon: <TagIcon size={14} strokeWidth={1.5} />,
      label: t('components.conversationItem.editTags'),
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        setTagsModalVisible(true);
      },
    },
    {
      key: 'delete',
      icon: <Trash2 size={14} strokeWidth={1.5} />,
      label: conversation.status === 'deleted' ? t('components.conversationItem.permanentDelete') : t('common.delete'),
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
        handleDelete();
      },
      danger: true,
    },
  ];

  const { locale: currentLocale } = useI18n();
  const dateLocale = currentLocale === 'zh' ? zhCN : enUS;
  
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
          <strong>{t('components.conversationItem.type')}:</strong> {conversation.type}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#2d2d2d',
            marginBottom: '4px',
            lineHeight: '1.6',
          }}
        >
          <strong>{t('components.conversationItem.created')}:</strong>{' '}
          {formatDistanceToNow(new Date(conversation.created_at), {
            addSuffix: true,
            locale: dateLocale,
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
          <strong>{t('components.conversationItem.updated')}:</strong>{' '}
          {formatDistanceToNow(new Date(conversation.updated_at), {
            addSuffix: true,
            locale: dateLocale,
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
          <strong>{t('components.conversationItem.rounds')}:</strong> {conversation.round_count}
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
            <strong>{t('components.conversationItem.tags')}:</strong>
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

  // 计算最终样式 - Flat Design
  const getItemStyle = (): React.CSSProperties => {
    // 基础样式 - 所有状态共享
    const base: React.CSSProperties = {
      marginBottom: '4px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      padding: '10px 12px',
    };

    // 激活状态
    if (isActive) {
      return {
        ...base,
        background: 'rgba(184, 88, 69, 0.08)',
      };
    }

    // 批量选择且被选中
    if (isBatchMode && isSelected) {
      return {
        ...base,
        background: 'rgba(139, 115, 85, 0.06)',
      };
    }

    // 悬停状态
    if (isHovered) {
      return {
        ...base,
        background: 'rgba(139, 115, 85, 0.04)',
      };
    }

    // 默认状态 - 无背景，无边框
    return {
      ...base,
      background: 'transparent',
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
        title={t('components.conversationItem.editTitleModal')}
        open={editModalVisible}
        onOk={handleEditTitle}
        onCancel={() => setEditModalVisible(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            color: '#8b7355',
          }
        }}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
          }
        }}
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t('components.conversationItem.titlePlaceholder')}
          maxLength={100}
          style={{
            height: '40px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}
        />
      </Modal>

      <Modal
        title={t('components.conversationItem.editTagsModal')}
        open={tagsModalVisible}
        onOk={handleEditTags}
        onCancel={() => setTagsModalVisible(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            color: '#8b7355',
          }
        }}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
          }
        }}
      >
        <TextArea
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder={t('components.conversationItem.tagsPlaceholder')}
          rows={3}
          style={{
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}
        />
      </Modal>

      <Modal
        title={t('components.conversationItem.confirmPermanentDelete')}
        open={deleteModalVisible}
        onOk={handlePermanentDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText={t('components.conversationItem.confirmDelete')}
        cancelText={t('common.cancel')}
        okButtonProps={{
          danger: true,
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            color: '#8b7355',
          }
        }}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
          }
        }}
      >
        <p style={{ color: '#2d2d2d', marginBottom: '8px', lineHeight: '1.6', letterSpacing: '0.3px' }}>
          {t('components.conversationItem.deleteWarning')}
        </p>
        <p style={{ color: '#b85845', fontWeight: 500, margin: 0 }}>
          <strong>{conversation.title}</strong>
        </p>
      </Modal>
    </>
  );
};

export default ConversationItem;
