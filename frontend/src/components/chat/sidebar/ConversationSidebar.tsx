// src/components/chat/sidebar/ConversationSidebar.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Input, Button, Empty, Spin, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, User, Home, Clock, ChevronLeft } from 'lucide-react';
import { useConversationStore } from '../../../store/conversationStore';
import { getCurrentUserDisplayName } from '../../../config/user';
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
  const [scrollPosition, setScrollPosition] = useState(0);
  const currentUserDisplayName = getCurrentUserDisplayName();
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
            `已将 ${res.success} 个对话移至回收站`,
            'success'
          );
        if (res.failed > 0)
          showNotification(`${res.failed} 个对话软删除失败`, 'error');
      }

      if (toPermanent.length > 0) {
        const res2 = await batchDeleteConversations(toPermanent, true);
        if (res2.success > 0)
          showNotification(`已永久删除 ${res2.success} 个对话`, 'success');
        if (res2.failed > 0)
          showNotification(`${res2.failed} 个对话永久删除失败`, 'error');
      }

      setSelectedConversations(new Set());
      setIsBatchMode(false);
    } catch (error) {
      console.error('Batch delete failed:', error);
      showNotification('批量删除失败', 'error');
    }
  };

  if (sidebarCollapsed) {
    return (
      <CollapsedSidebar
        onExpand={toggleSidebar}
        onNewConversation={onNewConversation}
        currentUserDisplayName={currentUserDisplayName}
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
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
        }}
      >
        {/* 搜索框 */}
        <Input
          prefix={
            <Search
              size={16}
              strokeWidth={1.5}
              style={{ color: 'rgba(45, 45, 45, 0.45)' }}
            />
          }
          placeholder="搜索对话..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{
            height: '36px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            background: '#ffffff',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        />

        {/* 功能按钮区 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {onNewConversation && (
            <Button
              type="text"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={onNewConversation}
              style={{
                flex: 1,
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#8b7355',
                fontSize: '13px',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              新建
            </Button>
          )}

          <ExportManagerButton />

          <Button
            type="text"
            icon={<ChevronLeft size={16} strokeWidth={1.5} />}
            onClick={toggleSidebar}
            style={{
              height: '32px',
              width: '32px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#8b7355',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          />
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
            已选 {selectedConversations.size} 项
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
              全选
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
              清空
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
              删除
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
          // 滚动条样式 - 纸张质感
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
            description={searchQuery ? '没有找到匹配的对话' : '暂无对话'}
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

      {/* 底部 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(139, 115, 85, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(45, 45, 45, 0.65)',
            fontSize: '13px',
            fontWeight: 400,
          }}
        >
          <User size={16} strokeWidth={1.5} />
          <span>{currentUserDisplayName}</span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            type="text"
            onClick={handleBatchModeToggle}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '4px',
              border: 'none',
              background: isBatchMode
                ? 'rgba(139, 115, 85, 0.08)'
                : 'transparent',
              color: isBatchMode ? '#8b7355' : 'rgba(45, 45, 45, 0.65)',
              fontSize: '12px',
              fontWeight: 400,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isBatchMode
                ? 'rgba(139, 115, 85, 0.08)'
                : 'transparent';
            }}
          >
            {isBatchMode ? '取消选择' : '批量'}
          </Button>

          <Tooltip title="任务中心">
            <Button
              type="text"
              icon={<Clock size={16} strokeWidth={1.5} />}
              onClick={() => navigate('/tasks')}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
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

          <Tooltip title="返回主页">
            <Button
              type="text"
              icon={<Home size={16} strokeWidth={1.5} />}
              onClick={() => navigate('/')}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
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
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar;
