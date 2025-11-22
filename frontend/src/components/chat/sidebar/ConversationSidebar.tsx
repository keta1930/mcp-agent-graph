// src/components/chat/sidebar/ConversationSidebar.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Input, Button, Empty, Spin, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Home, Clock, ChevronLeft, CheckSquare } from 'lucide-react';
import { useConversationStore } from '../../../store/conversationStore';
import { getCurrentUserDisplayName } from '../../../config/user';
import { useT } from '../../../i18n/hooks';
import UserMenu from '../../common/UserMenu';
import CollapsedSidebar from './CollapsedSidebar';
import ConversationItem from './ConversationItem';
import ExportManagerButton from '../modal/ExportManagerButton';
import './ConversationSidebar.css';

interface ConversationSidebarProps {
  onConversationSelect: (conversationId: string) => void;
  onNewConversation?: () => void;
  activeConversationId?: string;
  onUserNameUpdate?: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onConversationSelect,
  onNewConversation,
  activeConversationId,
}) => {
  const navigate = useNavigate();
  const t = useT();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<
    Set<string>
  >(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    loading,
    searchQuery,
    sidebarCollapsed,
    setSearchQuery,
    toggleSidebar,
    loadConversations,
    silentUpdateConversations,
    showNotification,
    batchDeleteConversations,
  } = useConversationStore();

  const saveScrollPosition = () => {
    if (listRef.current) {
      setScrollPosition(listRef.current.scrollTop);
    }
  };

  const restoreScrollPosition = () => {
    if (listRef.current && scrollPosition > 0) {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = scrollPosition;
        }
      });
    }
  };

  useEffect(() => {
    loadConversations();

    const interval = setInterval(() => {
      saveScrollPosition();
      silentUpdateConversations();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadConversations, silentUpdateConversations]);

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      restoreScrollPosition();
    }
  }, [conversations, loading]);

  const visibleConversations = useMemo(() => {
    const filtered = conversations.filter((conv) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.title.toLowerCase().includes(query) ||
          conv.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const ta = new Date(a.created_at).getTime() || 0;
      const tb = new Date(b.created_at).getTime() || 0;
      return tb - ta;
    });
  }, [conversations, searchQuery]);

  const handleBatchModeToggle = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedConversations(new Set());
  };

  const handleConversationSelect = (
    conversationId: string,
    selected: boolean
  ) => {
    const newSelected = new Set(selectedConversations);
    if (selected) {
      newSelected.add(conversationId);
    } else {
      newSelected.delete(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = new Set(visibleConversations.map((conv) => conv._id));
    setSelectedConversations(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedConversations(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedConversations.size === 0) return;

    try {
      const selectedList = conversations.filter((conv) =>
        selectedConversations.has(conv._id)
      );
      const toPermanent = selectedList
        .filter((conv) => conv.status === 'deleted')
        .map((conv) => conv._id);
      const toSoft = selectedList
        .filter((conv) => conv.status !== 'deleted')
        .map((conv) => conv._id);

      if (toSoft.length > 0) {
        const res = await batchDeleteConversations(toSoft, false);
        if (res.success > 0)
          showNotification(
            t('components.conversationSidebar.movedToTrash', { count: res.success }),
            'success'
          );
        if (res.failed > 0)
          showNotification(t('components.conversationSidebar.softDeleteFailed', { count: res.failed }), 'error');
      }

      if (toPermanent.length > 0) {
        const res2 = await batchDeleteConversations(toPermanent, true);
        if (res2.success > 0)
          showNotification(t('components.conversationSidebar.permanentlyDeleted', { count: res2.success }), 'success');
        if (res2.failed > 0)
          showNotification(t('components.conversationSidebar.permanentDeleteFailed', { count: res2.failed }), 'error');
      }

      setSelectedConversations(new Set());
      setIsBatchMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      showNotification(t('components.conversationSidebar.batchDeleteFailed'), 'error');
    }
  };

  if (sidebarCollapsed) {
    return (
      <CollapsedSidebar
        onExpand={toggleSidebar}
        onNewConversation={onNewConversation}
        currentUserDisplayName={getCurrentUserDisplayName()}
      />
    );
  }

  return (
    <div
      style={{
        width: '300px',
        background: '#faf8f5',
        borderRight: '1px solid rgba(139, 115, 85, 0.12)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
        }}
      >
        {/* 搜索框和收起按钮 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <Input
            prefix={
              <Search
                size={16}
                strokeWidth={1.5}
                style={{ color: 'rgba(45, 45, 45, 0.45)' }}
              />
            }
            placeholder={t('components.conversationSidebar.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              background: '#ffffff',
              fontSize: '14px',
            }}
          />
          <Button
            type="text"
            icon={<ChevronLeft size={16} strokeWidth={1.5} />}
            onClick={toggleSidebar}
            style={{
              height: '36px',
              width: '36px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#8b7355',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        </div>

        {/* 功能按钮行：批量选择、导出、任务中心、新对话 */}
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
          {/* 批量选择按钮 */}
          <Tooltip title={isBatchMode ? t('components.conversationSidebar.cancelSelection') : t('components.conversationSidebar.batchMode')}>
            <Button
              type="text"
              icon={<CheckSquare size={16} strokeWidth={1.5} />}
              onClick={handleBatchModeToggle}
              style={{
                height: '36px',
                width: '36px',
                borderRadius: '6px',
                border: 'none',
                background: isBatchMode ? 'rgba(139, 115, 85, 0.08)' : 'transparent',
                color: isBatchMode ? '#8b7355' : 'rgba(45, 45, 45, 0.65)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isBatchMode ? 'rgba(139, 115, 85, 0.08)' : 'transparent';
              }}
            />
          </Tooltip>

          {/* 导出按钮 */}
          <ExportManagerButton />

          {/* 任务中心按钮 */}
          <Tooltip title={t('components.conversationSidebar.taskCenter')}>
            <Button
              type="text"
              icon={<Clock size={16} strokeWidth={1.5} />}
              onClick={() => navigate('/tasks')}
              style={{
                height: '36px',
                width: '36px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'rgba(45, 45, 45, 0.65)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            />
          </Tooltip>

          {/* 新对话按钮 - 小图标，放在最右边 */}
          {onNewConversation && (
            <Tooltip title={t('components.conversationSidebar.newConversation')}>
              <Button
                type="text"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={onNewConversation}
                style={{
                  height: '36px',
                  width: '36px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(45, 45, 45, 0.65)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {isBatchMode && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(139, 115, 85, 0.03)',
            borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 400,
            }}
          >
            {t('components.conversationSidebar.selectedCount', { count: selectedConversations.size })}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              type="text"
              size="small"
              onClick={handleSelectAll}
              disabled={
                selectedConversations.size === visibleConversations.length
              }
              style={{
                fontSize: '12px',
                height: '24px',
                padding: '0 8px',
                color: '#8b7355',
                border: 'none',
              }}
            >
              {t('components.conversationSidebar.selectAll')}
            </Button>
            <Button
              type="text"
              size="small"
              onClick={handleDeselectAll}
              disabled={selectedConversations.size === 0}
              style={{
                fontSize: '12px',
                height: '24px',
                padding: '0 8px',
                color: '#8b7355',
                border: 'none',
              }}
            >
              {t('components.conversationSidebar.deselectAll')}
            </Button>
            <div
              style={{
                width: '1px',
                height: '14px',
                background: 'rgba(139, 115, 85, 0.15)',
              }}
            />
            <Button
              type="text"
              size="small"
              onClick={handleBatchDelete}
              disabled={selectedConversations.size === 0}
              style={{
                fontSize: '12px',
                height: '24px',
                padding: '0 8px',
                color: '#b85845',
                border: 'none',
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      )}

      {/* 对话列表 */}
      <div
        ref={listRef}
        onScroll={saveScrollPosition}
        className="conversation-list-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          // 滚动条样式
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.25) transparent',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}
          >
            <Spin size="large" />
          </div>
        ) : visibleConversations.length === 0 ? (
          <Empty
            description={searchQuery ? t('components.conversationSidebar.noMatchingConversations') : t('components.conversationSidebar.noConversations')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{
              padding: '40px 20px',
            }}
          />
        ) : (
          visibleConversations.map((conversation) => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              isActive={conversation._id === activeConversationId}
              onClick={() => onConversationSelect(conversation._id)}
              isBatchMode={isBatchMode}
              isSelected={selectedConversations.has(conversation._id)}
              onSelect={handleConversationSelect}
            />
          ))
        )}
      </div>

      {/* 底部 - 用户头像和回到主页 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(139, 115, 85, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {/* 用户头像下拉菜单 */}
        <UserMenu collapsed={false} placement="topLeft" />

        {/* 回到主页按钮 */}
        <Tooltip title={t('components.conversationSidebar.backToHome')}>
          <Button
            type="text"
            icon={<Home size={16} strokeWidth={1.5} />}
            onClick={() => navigate('/')}
            style={{
              color: 'rgba(45, 45, 45, 0.65)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default ConversationSidebar;
